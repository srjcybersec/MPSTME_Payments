import {
  calculateOfflineSpendTodayPaise,
  canQueueOfflineOrder,
  getProcessedLocalOrderIds
} from "../lib/offline/logic";

describe("offline logic helpers", () => {
  it("calculates only today's offline spend", () => {
    const now = Date.UTC(2026, 3, 8, 12, 0, 0);
    const records = [
      {
        localOrderId: "a",
        amountPaise: 1000,
        timestamp: new Date(Date.UTC(2026, 3, 8, 8, 0, 0)).toISOString(),
        deviceId: "device-1",
        nonce: "n1",
        signature: "sig"
      },
      {
        localOrderId: "b",
        amountPaise: 2000,
        timestamp: new Date(Date.UTC(2026, 3, 7, 23, 59, 0)).toISOString(),
        deviceId: "device-1",
        nonce: "n2",
        signature: "sig"
      }
    ];

    expect(calculateOfflineSpendTodayPaise(records, now)).toBe(1000);
  });

  it("enforces balance and daily limit guards", () => {
    expect(
      canQueueOfflineOrder({
        localBalancePaise: 3000,
        orderAmountPaise: 2000,
        spentTodayPaise: 1000
      }).allowed
    ).toBe(true);

    expect(
      canQueueOfflineOrder({
        localBalancePaise: 1000,
        orderAmountPaise: 2000,
        spentTodayPaise: 1000
      }).hasBalance
    ).toBe(false);

    expect(
      canQueueOfflineOrder({
        localBalancePaise: 90000,
        orderAmountPaise: 2000,
        spentTodayPaise: 49000
      }).withinDailyLimit
    ).toBe(false);
  });

  it("extracts processed local order ids", () => {
    const result = getProcessedLocalOrderIds([
      { localOrderId: "x", status: "PROCESSED" },
      { localOrderId: "y", status: "FAILED" }
    ]);
    expect(result.has("x")).toBe(true);
    expect(result.has("y")).toBe(false);
  });
});
