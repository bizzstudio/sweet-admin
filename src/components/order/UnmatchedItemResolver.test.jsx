// בדיקות למסך "שורות לבדיקה" שבבאנר של הזמנה שלא הובנה.
//
// מה שהן שומרות עליו:
// 1. ההצעה של הקליטה נשאלת כשאלה, ו"כן, זה המוצר" שומר אותה ללקוח הזה.
// 2. "זו לא שורת מוצר" שומר הכרעה מסוג ignore, בלי מוצר.
// 3. ההתקדמות מדווחת לבאנר (onProgress), שמחליט מתי להציע בנייה מחדש.
// 4. בהזמנה ישנה בלי suggestions, ההצעה נשלפת מטקסט הסיבה ונשמרת לפי מק"ט.
// 5. החיפוש בכל הקטלוג נפתח רק ב"לבחור מוצר" (או כשאין הצעה),
//    ובחירה משם נשמרת לפי מק"ט.
// 6. "לשמור גם לכל הלקוחות" מרחיב בחירה שכבר נשמרה, לשורה הזו בלבד.
// 7. "כמה מוצרים לשורה הזו" שומר רשימה; כמות שזהה לשורה נשמרת כ"כמו בשורה",
//    ושורה שכבר נשמרה כרשימה נפתחת על המוצרים השמורים.

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

  it('"לבחור מוצר" פותח חיפוש בכל הקטלוג, ובחירה משם נשמרת לפי מק"ט', async () => {
    await render([ITEMS[0]]);
    expect(button("בורר")).toBeUndefined();
    await click(button("לבחור מוצר"));
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

  it('"לשמור גם לכל הלקוחות" שומר את אותה בחירה כהכרעה גורפת, ו"לשנות" ממשיך לכולם', async () => {
    await render([ITEMS[0]]);
    await click(yes());
    expect(container.textContent).toContain("נשמר ללקוח הזה");

    await click(button("לשמור גם לכל הלקוחות"));
    expect(IncomingOrderServices.resolveItem).toHaveBeenLastCalledWith("o1", {
      rawName: "פחיות זירו",
      scope: "global",
      productId: "p228",
    });
    expect(container.textContent).toContain("נשמר לכל הלקוחות");

    // בחירה חדשה בשורה שהורחבה מחליפה גם את ההכרעה הגורפת וגם את זו של
    // הלקוח, שגוברת עליה בשרת — ונאמר במסך לפני הבחירה
    await click(button("לשנות"));
    expect(container.textContent).toContain("בחירה חדשה תחליף אותה אצל כולם");
    await click(button("לבחור מוצר"));
    IncomingOrderServices.resolveItem.mockClear();
    await click(button("בורר"));
    expect(IncomingOrderServices.resolveItem.mock.calls).toEqual([
      ["o1", { rawName: "פחיות זירו", scope: "customer", sku: "777" }],
      ["o1", { rawName: "פחיות זירו", scope: "global", sku: "777" }],
    ]);
  });

  const typeInto = async (input, value) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    await act(async () => {
      setter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  const quantityInputs = () => [...container.querySelectorAll('input[type="number"]')];

  it('"כמה מוצרים": כמות שזהה לשורה נשמרת ככמו-בשורה, ושונה — כקבועה', async () => {
    IncomingOrderServices.getItemCandidates.mockResolvedValue({ candidates: [], history: [] });
    await render([ITEMS[0]]);
    await click(button("כמה מוצרים לשורה הזו"));
    expect(container.textContent).toContain("המוצרים לשורה הזו");
    await click(button("בורר"));
    // הכמות מתחילה בכמות של השורה
    expect(quantityInputs().map((i) => i.value)).toEqual(["6"]);
    // אותו מוצר פעמיים נשאר שורה אחת
    await click(button("בורר"));
    expect(quantityInputs().length).toBe(1);

    await click(button("שמירה"));
    expect(IncomingOrderServices.resolveItem).toHaveBeenLastCalledWith("o1", {
      rawName: "פחיות זירו",
      scope: "customer",
      products: [{ sku: "777", quantity: null }],
    });

    await click(button("לשנות"));
    await click(button("כמה מוצרים לשורה הזו"));
    // נפתח על מה שנשמר הרגע
    await typeInto(quantityInputs()[0], "2");
    await click(button("שמירה"));
    expect(IncomingOrderServices.resolveItem).toHaveBeenLastCalledWith("o1", {
      rawName: "פחיות זירו",
      scope: "customer",
      products: [{ sku: "777", quantity: 2 }],
    });
  });

  it("שורה שכבר נשמרה ככמה מוצרים נפתחת על הרשימה השמורה", async () => {
    IncomingOrderServices.getItemCandidates.mockResolvedValue({
      candidates: [],
      history: [],
      currentAlias: {
        products: [
          { productId: "p1", sku: "1", title: "מזלגות", quantity: null },
          { productId: "p2", sku: "2", title: "צלחות גדולות", quantity: 3 },
        ],
      },
    });
    await render([ITEMS[0]]);
    await click(button("כמה מוצרים לשורה הזו"));
    expect(container.textContent).toContain("מזלגות");
    expect(quantityInputs().map((i) => i.value)).toEqual(["6", "3"]);

    await click(button("בורר"));
    await click(button("שמירת 3 המוצרים"));
    expect(IncomingOrderServices.resolveItem).toHaveBeenLastCalledWith("o1", {
      rawName: "פחיות זירו",
      scope: "customer",
      products: [
        { productId: "p1", quantity: null },
        { productId: "p2", quantity: 3 },
        { sku: "777", quantity: null },
      ],
    });
    expect(container.textContent).toContain("נבחרו 3 מוצרים");
  });

  it("שמירה לכל הלקוחות שנכשלה משאירה את השורה שמורה ללקוח הזה", async () => {
    await render([ITEMS[0]]);
    await click(yes());
    IncomingOrderServices.resolveItem.mockRejectedValueOnce(new Error("x"));
    await click(button("לשמור גם לכל הלקוחות"));
    expect(container.textContent).toContain("נשמר ללקוח הזה");
    expect(container.textContent).not.toContain("נשמר לכל הלקוחות");
  });
});
