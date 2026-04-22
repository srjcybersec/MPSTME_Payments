import { prisma } from "../lib/prisma.js";

export async function processWalletReconciliationJob() {
  const wallets = await prisma.wallet.findMany({
    include: { transactions: true, user: true }
  });

  for (const wallet of wallets) {
    const ledger = wallet.transactions.reduce((sum, tx) => {
      return tx.type === "CREDIT" ? sum + tx.amountPaise : sum - tx.amountPaise;
    }, 0);

    if (ledger !== wallet.balancePaise) {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: wallet.userId },
          data: { isFrozen: true }
        });
        await tx.auditLog.create({
          data: {
            actorRole: "SYSTEM",
            action: "WALLET_RECONCILIATION_MISMATCH_FREEZE",
            targetType: "WALLET",
            targetId: wallet.id,
            metadata: {
              expectedBalancePaise: ledger,
              actualBalancePaise: wallet.balancePaise
            }
          }
        });
      });
    }
  }
}
