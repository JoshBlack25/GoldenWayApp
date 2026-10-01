import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Payment wallet (migration 0016) — the pure/tokenization logic of
 * api/paymentMethods.js. Supabase is mocked so no network is touched;
 * what we pin down is: only brand + last4 + expiry ever leave the
 * client (never the full PAN), and validation rejects malformed input.
 */

const insertSingle = vi.fn();
const insertMock = vi.fn(() => ({ select: vi.fn(() => ({ single: insertSingle })) }));
const selectOrdered = vi.fn();

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          order: selectOrdered,
        })),
      })),
      insert: insertMock,
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    })),
  },
}));

vi.mock("../../screens/commuter/LoadTrips/data/loadTripsData", async (importOriginal) => {
  const mod = await importOriginal();
  return { detectCardBrand: mod.detectCardBrand };
});

import { addPaymentMethod, mapPaymentMethod } from "./paymentMethods.js";

describe("payment wallet (0016)", () => {
  beforeEach(() => {
    insertSingle.mockReset();
    selectOrdered.mockReset();
  });

  it("persists only tokenized fields — never the full PAN or CVV", async () => {
    insertSingle.mockResolvedValue({
      data: { id: "new-1", brand: "VISA", last4: "4242", exp_month: 8, exp_year: 2028, holder_name: "Thandi Mkhize", is_default: false, created_at: "2026-01-01" },
      error: null,
    });

    await addPaymentMethod({
      number: "4242 4242 4242 4242",
      expMonth: 8,
      expYear: 2028,
      holderName: "Thandi Mkhize",
    });

    expect(insertMock).toHaveBeenCalled();
    const row = insertMock.mock.calls[0][0];
    expect(JSON.stringify(row)).not.toContain("4242424242424242");
    expect(row.last4).toBe("4242");
    expect(row.brand).toBe("Visa");
    expect(row.holder_name).toBe("Thandi Mkhize");
    expect(row.cvv).toBeUndefined();
  });

  it("rejects a too-short card number before any DB call", async () => {
    await expect(
      addPaymentMethod({ number: "411", expMonth: 8, expYear: 2028 }),
    ).rejects.toThrow(/13–19/);
  });

  it("rejects an out-of-range expiry month", async () => {
    await expect(
      addPaymentMethod({ number: "4242424242424242", expMonth: 13, expYear: 2028 }),
    ).rejects.toThrow(/Expiry month/);
  });

  it("maps a DB row into the UI shape", () => {
    const ui = mapPaymentMethod({
      id: "abc",
      brand: "MASTERCARD",
      last4: "8829",
      exp_month: 3,
      exp_year: 2027,
      holder_name: "T M",
      is_default: true,
      created_at: "2026-01-01",
    });
    expect(ui).toEqual({
      id: "abc",
      brand: "MASTERCARD",
      last4: "8829",
      expMonth: 3,
      expYear: 2027,
      holderName: "T M",
      isDefault: true,
      createdAt: "2026-01-01",
    });
  });
});

