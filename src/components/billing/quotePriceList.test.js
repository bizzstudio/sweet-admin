import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/BillingServices", () => ({ default: { priceItems: vi.fn() } }));
vi.mock("@/services/CustomerPriceListServices", () => ({ default: { upsertItems: vi.fn() } }));
vi.mock("@/utils/toast", () => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));

import BillingServices from "@/services/BillingServices";
import CustomerPriceListServices from "@/services/CustomerPriceListServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { saveQuotePricesOnConvert, savePricesToPriceList } from "./quotePriceList";

beforeEach(() => {
  vi.clearAllMocks();
  CustomerPriceListServices.upsertItems.mockResolvedValue({ message: "נשמר" });
});

describe("savePricesToPriceList", () => {
  it("מעל 200 מחירים נשלח במנות — השרת מקבל עד 200 בבקשה", async () => {
    const items = Array.from({ length: 450 }, (_, i) => ({ sku: `S${i}`, price: 1 }));
    await savePricesToPriceList("c1", items, "ההצעה נשמרה");

    const calls = CustomerPriceListServices.upsertItems.mock.calls;
    expect(calls.map(([, body]) => body.items.length)).toEqual([200, 200, 50]);
    expect(calls.every(([customer, body]) => customer === "c1" && body.applyToGroup)).toBe(true);
    expect(notifySuccess).toHaveBeenCalledWith("450 מחירים נשמרו במחירון");
  });

  it("כישלון אומר במפורש שהמחירון לא עודכן", async () => {
    CustomerPriceListServices.upsertItems.mockRejectedValue(new Error("boom"));
    await savePricesToPriceList("c1", [{ sku: "A", price: 1 }], "ההצעה נשמרה");
    expect(notifyError).toHaveBeenCalledWith("ההצעה נשמרה, אבל המחיר לא נשמר במחירון: boom");
  });
});

describe("saveQuotePricesOnConvert", () => {
  it("מחיר קטלוג וידני נכתבים, מוצר שבמחירון לא נדרס, ושורה כפולה נכתבת פעם אחת", async () => {
    BillingServices.priceItems.mockResolvedValue({
      items: [{ sku: "A1", unitPrice: 11, source: "groupPriceList" }],
    });
    await saveQuotePricesOnConvert({
      customer: { _id: "c9" },
      items: [
        { sku: "A1", unitPrice: 9, priceSource: "manual" },
        { sku: "B2", unitPrice: 6, priceSource: "catalog" },
        { sku: "B2", unitPrice: 7, priceSource: "manual" },
        { sku: "C3", unitPrice: 5, priceSource: "customerPriceList" },
        { sku: "D4", unitPrice: 0, priceSource: "missing" },
      ],
    });
    expect(CustomerPriceListServices.upsertItems).toHaveBeenCalledWith("c9", {
      items: [{ sku: "B2", price: 7 }],
      applyToGroup: true,
    });
  });
});
