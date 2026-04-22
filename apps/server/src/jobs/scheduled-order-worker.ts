import { OrderStatus, PaymentMethod, WalletTransactionSource, WalletTransactionType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { getSocketIO } from "../socket/io.js";

export async function processScheduledOrderJob(data: { orderId: string }) {
  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
    include: { items: { include: { menuItem: true } } }
  });
  if (!order || order.status !== OrderStatus.CONFIRMED) {
    return;
  }

  for (const item of order.items) {
    if (!item.menuItem.isAvailable || item.menuItem.currentStock < item.quantity) {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED }
        });
        if (order.paymentMethod === PaymentMethod.WALLET) {
          const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: order.studentId } });
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balancePaise: { increment: order.totalAmountPaise } }
          });
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: WalletTransactionType.CREDIT,
              amountPaise: order.totalAmountPaise,
              description: `Refund for scheduled stockout ${order.id}`,
              referenceId: order.id,
              source: WalletTransactionSource.REFUND
            }
          });
        }
      });
      getSocketIO()?.to(`student:${order.studentId}`).emit("order:status_changed", {
        orderId: order.id,
        newStatus: OrderStatus.CANCELLED
      });
      return;
    }
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: OrderStatus.PREPARING }
  });
  getSocketIO()?.to("vendor").emit("order:new", { orderId: order.id });
  getSocketIO()?.to(`student:${order.studentId}`).emit("order:status_changed", {
    orderId: order.id,
    newStatus: OrderStatus.PREPARING
  });
}
