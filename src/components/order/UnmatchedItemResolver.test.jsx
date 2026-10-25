// בדיקות למסך "שורות לבדיקה" שבבאנר של הזמנה שלא הובנה.
//
// מה שהן שומרות עליו:
// 1. ההצעה של הקליטה נשאלת כשאלה, ו"כן, זה המוצר" שומר אותה ללקוח הזה.
// 2. "זו לא שורת מוצר" שומר הכרעה מסוג ignore, בלי מוצר.
// 3. ההתקדמות מדווחת לבאנר (onProgress), שמחליט מתי להציע בנייה מחדש.
// 4. בהזמנה ישנה בלי suggestions, ההצעה נשלפת מטקסט הסיבה ונשמרת לפי מק"ט.
// 5. החיפוש בכל הקטלוג נפתח רק ב"לא, לבחור מוצר אחר" (או כשאין הצעה),
//    ובחירה משם נשמרת לפי מק"ט.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/IncomingOrderServices", () => ({
  default: { getItemCandidates: vi.fn(), resolveItem: vi.fn() },
}));
vi.mock("@/utils/toast", () => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
// הבורר האמיתי טוען את כל הקטלוג; כאן מספיק כפתור שבוחר מוצר אחד
vi.mock("@/components/billing/ProductPicker", () => ({
  default: ({ onChange }) => (
    <button type="button" onClick={() => onChange("777", { sku: "777", name: "קולה זירו 1.5" })}>
      בורר
    </button>
  ),
}));

import IncomingOrderServices from "@/services/IncomingOrderServices";
import UnmatchedItemResolver, { suggestionsFromReason } from "@/components/order/UnmatchedItemResolver";

const ITEMS = [
  {
    rawName: "פחיות זירו",
    quantity: 6,
    failReason: 'הלקוח לא הזמין בעבר את "פחיות קולה זירו" (228) — צריך לאשר · הלקוח הזמין בעבר ...',
    suggestions: [{ productId: "p228", title: "פחיות קולה זירו" }],
  },
  { rawName: "נייר טישו זה מזכיר נייר מגבת?", quantity: 1, failReason: "x" },
];

let container;
let root;
const onProgress = vi.fn();

const render = async (items = ITEMS) => {
  await act(async () => {
    root.render(<UnmatchedItemResolver orderId="o1" items={items} onProgress={onProgress} />);
  });
};
const button = (text) => [...container.querySelectorAll("button")].find((b) => b.textContent.includes(text));
const click = async (el) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
  IncomingOrderServices.resolveItem.mockResolvedValue({ message: "נשמר" });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("UnmatchedItemResolver", () => {
  const yes = () => button("כן, זה המוצר");
  const notProduct = (i) =>
    [...container.querySelectorAll("button")].filter((b) => b.textContent.includes("זו לא שורת מוצר"))[i];

  it("ההצעה נשאלת כשאלה ונשמרת ב'כן', והסיבה הארוכה אינה מוצגת", async () => {
    await render();
    expect(container.textContent).not.toContain("הלקוח הזמין בעבר");
    expect(container.textContent).toContain("האם הכוונה למוצר הזה?");
    // החיפוש סגור כשיש הצעה, ופתוח בשורה שאין לה
    expect([...container.querySelectorAll("button")].filter((b) => b.textContent === "בורר").length).toBe(1);
    await click(yes());
    expect(IncomingOrderServices.resolveItem).toHaveBeenCalledWith("o1", {
      rawName: "פחיות זירו",
      scope: "customer",
      productId: "p228",
    });
    expect(container.textContent).toContain("נבחר: פחיות קולה זירו");
    expect(button("לשנות")).toBeDefined();
  });

  it('"זו לא שורת מוצר" נשמר כ-ignore בלי מוצר', async () => {
    await render();
    await click(notProduct(1));
    expect(IncomingOrderServices.resolveItem).toHaveBeenCalledWith("o1", {
      rawName: "נייר טישו זה מזכיר נייר מגבת?",
      scope: "customer",
      ignore: true,
    });
    expect(container.textContent).toContain("סומן שזו לא שורת מוצר");
  });

  it("ההתקדמות מדווחת לבאנר", async () => {
    await render();
    expect(onProgress).toHaveBeenLastCalledWith(0, 2);
    await click(yes());
    await click(notProduct(0));
    expect(onProgress).toHaveBeenLastCalledWith(2, 2);
  });

  it("הזמנה ישנה: ההצעה נשלפת מטקסט הסיבה, גם כשבשם יש גרשיים", async () => {
    await render([
      {
        rawName: "4 קילו עוגיות",
        quantity: 1,
        failReason: 'הלקוח ביקש "4 קילו" ואין מוצר כזה — צריך לאשר שזה "עוגיות מלוח 1 ק"ג" (886) · הלקוח הזמין בעבר',
      },
    ]);
    expect(container.textContent).toContain('עוגיות מלוח 1 ק"ג');
    await click(yes());
    expect(IncomingOrderServices.resolveItem).toHaveBeenCalledWith("o1", {
      rawName: "4 קילו עוגיות",
      scope: "customer",
      sku: "886",
    });
  });

  it('"לא, לבחור מוצר אחר" פותח חיפוש בכל הקטלוג, ובחירה משם נשמרת לפי מק"ט', async () => {
    await render([ITEMS[0]]);
    expect(button("בורר")).toBeUndefined();
    await click(button("לא, לבחור מוצר אחר"));
    await click(button("בורר"));
    expect(IncomingOrderServices.resolveItem).toHaveBeenCalledWith("o1", {
      rawName: "פחיות זירו",
      scope: "customer",
      sku: "777",
    });
    expect(container.textContent).toContain("נבחר: קולה זירו 1.5");
  });

  it("כמה מוצרים שקולים בטקסט הסיבה — כולם מוצעים, וזנב ההיסטוריה לא", () => {
    expect(
      suggestionsFromReason(
        'יש בקטלוג כמה מוצרים בשם דומה — צריך לבחור אחד: "קולה 1.5" (11), "קולה זירו 1.5" (12) · הלקוח הזמין בעבר "ספרייט" (13)'
      )
    ).toEqual([
      { sku: "11", title: "קולה 1.5" },
      { sku: "12", title: "קולה זירו 1.5" },
    ]);
    expect(suggestionsFromReason("לא נמצא מוצר בשם הזה בקטלוג")).toEqual([]);
    expect(suggestionsFromReason(undefined)).toEqual([]);
  });

  it("שמירה שחוזרת אחרי מעבר להזמנה אחרת אינה מסמנת שורה בהזמנה החדשה", async () => {
    let finish;
    IncomingOrderServices.resolveItem.mockImplementation(() => new Promise((r) => (finish = r)));
    await render();
    await click(yes());
    await act(async () => {
      root.render(<UnmatchedItemResolver orderId="o2" items={ITEMS} onProgress={onProgress} />);
    });
    await act(async () => finish({ message: "נשמר" }));
    expect(button("לשנות")).toBeUndefined();
  });
});
