-- Enforce wallet safety invariants at DB layer.
ALTER TABLE "Wallet"
  ADD CONSTRAINT "wallet_balance_non_negative" CHECK ("balancePaise" >= 0),
  ADD CONSTRAINT "wallet_balance_max_cap" CHECK ("balancePaise" <= 500000),
  ADD CONSTRAINT "wallet_daily_offline_non_negative" CHECK ("dailyOfflineSpendPaise" >= 0),
  ADD CONSTRAINT "wallet_daily_offline_max_limit" CHECK ("dailyOfflineSpendPaise" <= 50000);
