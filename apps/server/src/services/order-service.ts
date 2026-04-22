import { OrderStatus, PaymentMethod, WalletTransactionSource, WalletTransactionType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { getSocketIO } from "../socket/io.js";

type ItemInput = { menuItemId: string; quantity: number };

export async function createConfirmedWalletOrder(studentId: string, items: ItemInput[], orderNotes?: string, targetPickupTime?: string) {
  const menuIds = items.map((item) => item.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuIds }, deletedAt: null }
  });
  const map = new Map(menuItems.map((m) => [m.id, m]));

  const accepted: Array<{ menuItemId: string; quantity: number; unitPricePaise: number; subtotalPaise: number }> = [];
  const rejected: Array<{ menuItemId: string; reason: string }> = [];
  for (const item of items) {
    const menu = map.get(item.menuItemId);
    if (!menu || !menu.isAvailable || menu.currentStock < item.quantity) {
      rejected.push({ menuItemId: item.menuItemId, reason: "OUT_OF_STOCK" });
      continue;
    }
    accepted.push({
      menuItemId: menu.id,
      quantity: item.quantity,
      unitPricePaise: menu.pricePaise,
      subtotalPaise: menu.pricePaise * item.quantity
    });
  }

  if (accepted.length === 0) {
    return { status: "REJECTED_ALL" as const, rejected };
  }

  const totalAmountPaise = accepted.reduce((sum, i) => sum + i.subtotalPaise, 0);
  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: studentId } });
  if (wallet.balancePaise < totalAmountPaise) {
    return { status: "INSUFFICIENT_BALANCE" as const, neededPaise: totalAmountPaise, balancePaise: wallet.balancePaise, rejected };
  }

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        studentId,
        status: OrderStatus.CONFIRMED,
        paymentMethod: PaymentMethod.WALLET,
        totalAmountPaise,
        orderNotes: orderNotes ?? null,
        targetPickupTime: targetPickupTime ? new Date(targetPickupTime) : null,
        confirmedAt: new Date(),
        items: {
          create: accepted.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPricePaise: item.unitPricePaise,
            subtotalPaise: item.subtotalPaise
          }))
        }
      },
      include: { items: true }
    });

    for (const item of accepted) {
      const updated = await tx.menuItem.update({
        where: { id: item.menuItemId },
        data: { currentStock: { decrement: item.quantity } }
      });
      if (updated.currentStock <= 0) {
        await tx.menuItem.update({
          where: { id: item.menuItemId },
          data: { isAvailable: false, currentStock: 0 }
        });
      }
    }

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balancePaise: { decrement: totalAmountPaise } }
    });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.DEBIT,
        amountPaise: totalAmountPaise,
        description: `Order payment ${created.id}`,
        referenceId: created.id,
        source: WalletTransactionSource.WALLET_SYNC
      }
    });
    return created;
  });

  for (const item of order.items) {
    const menu = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
    if (menu && menu.currentStock <= menu.lowStockThreshold) {
      getSocketIO()?.to("vendor").emit("menu:stock_alert", {
        menuItemId: menu.id,
        currentStock: menu.currentStock
      });
    }
  }

  return { status: "ORDER_CREATED" as const, order, rejected };
}

export async function createConfirmedRazorpayOrder(studentId: string, items: ItemInput[], orderNotes?: string, targetPickupTime?: string) {
  const menuIds = items.map((item) => item.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuIds }, deletedAt: null }
  });
  const map = new Map(menuItems.map((m) => [m.id, m]));
  const accepted: Array<{ menuItemId: string; quantity: number; unitPricePaise: number; subtotalPaise: number }> = [];

  for (const item of items) {
    const menu = map.get(item.menuItemId);
    if (!menu || !menu.isAvailable || menu.currentStock < item.quantity) {
      throw new Error("OUT_OF_STOCK");
    }
    accepted.push({
      menuItemId: menu.id,
      quantity: item.quantity,
      unitPricePaise: menu.pricePaise,
      subtotalPaise: menu.pricePaise * item.quantity
    });
  }

  const totalAmountPaise = accepted.reduce((sum, i) => sum + i.subtotalPaise, 0);
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        studentId,
        status: OrderStatus.CONFIRMED,
        paymentMethod: PaymentMethod.RAZORPAY,
        totalAmountPaise,
        orderNotes: orderNotes ?? null,
        targetPickupTime: targetPickupTime ? new Date(targetPickupTime) : null,
        confirmedAt: new Date(),
        items: {
          create: accepted.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPricePaise: item.unitPricePaise,
            subtotalPaise: item.subtotalPaise
          }))
        }
      },
      include: { items: true }
    });

    for (const item of accepted) {
      const updated = await tx.menuItem.update({
        where: { id: item.menuItemId },
        data: { currentStock: { decrement: item.quantity } }
      });
      if (updated.currentStock <= 0) {
        await tx.menuItem.update({
          where: { id: item.menuItemId },
          data: { isAvailable: false, currentStock: 0 }
        });
      }
    }
    return created;
  });

  for (const item of order.items) {
    const menu = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
    if (menu && menu.currentStock <= menu.lowStockThreshold) {
      getSocketIO()?.to("vendor").emit("menu:stock_alert", {
        menuItemId: menu.id,
        currentStock: menu.currentStock
      });
    }
  }

  return order;
}
