// בדיקות לטבלת השורות של המסמך המודפס (תעודת משלוח / הצעת מחיר).
//
// מה שהן שומרות עליו:
// 1. המזהה הראשי על הנייר הוא המק"ט — הוא העמודה הראשונה אחרי המספר הסידורי,
//    והברקוד בא אחריו. הברקוד אינו ייחודי במסד (7 קבוצות של ברקוד כפול,
//    למשל 110 = "חלב גד" וגם "בלון הליום"), ולכן מסמך שמוביל בברקוד אינו
//    ניתן להצלבה חד-משמעית. ראה sweet-backend/utils/barcode.js.
// 2. שורה שאין לה ברקוד עדיין מציגה את המק"ט שלה — כלומר ה-"—" נופל
//    בעמודה המשנית ולא במזהה הראשי.
// 3. מספר העמודות בכותרת ובשורות זהה. הטבלה נערכה ידנית פעם אחת, וחוסר
//    התאמה כזה מזיז את כל המחירים עמודה אחת הצידה על נייר שיוצא ללקוח.
//
// ⚠️ אותה פריסה קיימת פעם שנייה בשרת, ב-lib/printing/deliveryNotePdf.js,
//    בשביל ההדפסה האוטומטית. שינוי כאן צריך להישקל גם שם.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter, Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock("@/services/BillingServices", () => ({
  default: {
    getDeliveryNote: vi.fn(),
    getQuote: vi.fn(),
    getDeliveryNotePrintStatus: vi.fn(),
    reprintDeliveryNote: vi.fn(),
    duplicateDeliveryNote: vi.fn(),
    duplicateQuote: vi.fn(),
    cancelDeliveryNote: vi.fn(),
    billDeliveryNote: vi.fn(),
    convertQuote: vi.fn(),
  },
}));

// ההוק האמיתי נשען על redux ועל SidebarContext רק כדי להביא את פרטי החברה
// לכותרת. הכותרת אינה מה שנבדק כאן, והמוק חוסך את כל העץ הזה.
vi.mock("@/hooks/useUtilsFunction", () => ({
  default: () => ({
    globalSetting: { company_name: "המתוקים של בני", vat_number: "515" },
  }),
}));

// עורך התעודה נטען רק בלחיצה על "עריכה"; הוא גורר את בורר המוצרים ואת
// שירותי הקטלוג, שאין להם קשר לפריסה המודפסת.
vi.mock("@/components/billing/DeliveryNoteEditor", () => ({
  default: () => null,
}));

import BillingServices from "@/services/BillingServices";
import BillingDocument from "@/pages/BillingDocument";

const NOTE = {
  _id: "n1",
  number: 1001,
  issuedAt: "2026-08-20T09:00:00.000Z",
  orderNumber: null,
  manualReference: null,
  billing: { status: "open" },
  customerSnapshot: { name: "טבולה קום", customerNumber: "553" },
  items: [
    {
      // מוצר עם שני המזהים — המצב הרגיל
      sku: "116",
      barcode: "110",
      name: "חלב גד 1 ליטר",
      quantity: 2,
      unitPrice: 5.5,
      lineTotal: 11,
    },
    {
      // ברקוד חסר: או שלא הוזן, או שהוא ערך זבל ש-barcodeOf פוסל
      sku: "4423",
      barcode: null,
      name: "ריסיס חטיף שוקולד",
      quantity: 1,
      unitPrice: 3,
      lineTotal: 3,
    },
  ],
};

let container;
let root;

const render = async (entry = "/delivery-note/n1", path = "/delivery-note/:id") => {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[entry]}>
        <Route path={path}>
          <BillingDocument />
        </Route>
      </MemoryRouter>
    );
  });
  await act(async () => {
    await Promise.resolve();
  });
};

/** תאי הטבלה של המסמך — הראשונה בעמוד היא טבלת השורות. */
const itemsTable = () => container.querySelectorAll("table")[0];

const headerTexts = () =>
  [...itemsTable().querySelectorAll("thead th")].map((th) => th.textContent.trim());

const rowCells = (index) =>
  [...itemsTable().querySelectorAll("tbody tr")[index].querySelectorAll("td")];

beforeEach(() => {
  vi.clearAllMocks();
  BillingServices.getDeliveryNote.mockResolvedValue(NOTE);
  BillingServices.getDeliveryNotePrintStatus.mockResolvedValue({ status: "none" });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("המסמך המודפס — עמודות הזיהוי", () => {
  it('המק"ט הוא המזהה הראשון, והברקוד אחריו', async () => {
    await render();

    const headers = headerTexts();
    expect(headers[0]).toBe("#");
    expect(headers[1]).toBe('מק"ט');
    expect(headers[2]).toBe("ברקוד");
    // הברקוד לא נמחק — הוא נשאר ככלי הצלבה מול האריזה
    expect(headers).toContain("ברקוד");
  });

  it('ערכי השורה יושבים תחת הכותרת שלהם, והמק"ט הוא המודגש', async () => {
    await render();

    const cells = rowCells(0);
    expect(cells[0].textContent).toBe("1");
    expect(cells[1].textContent).toBe("116"); // מק"ט
    expect(cells[2].textContent).toBe("110"); // ברקוד
    expect(cells[3].textContent).toContain("חלב גד 1 ליטר");

    // ההדגשה היא מה שמסמן ללקוח לפי מה להצליב
    expect(cells[1].className).toContain("font-semibold");
    expect(cells[2].className).not.toContain("font-semibold");
  });

  it('שורה בלי ברקוד עדיין מציגה את המק"ט שלה', async () => {
    await render();

    const cells = rowCells(1);
    expect(cells[1].textContent).toBe("4423");
    expect(cells[2].textContent).toBe("—");
  });

  it("מספר העמודות בכותרת ובשורות זהה", async () => {
    await render();

    const columns = headerTexts().length;
    const rows = itemsTable().querySelectorAll("tbody tr");
    expect(rows.length).toBe(NOTE.items.length);
    for (const row of rows) {
      expect(row.querySelectorAll("td").length).toBe(columns);
    }
  });

  it("גם בהצעת מחיר סדר העמודות זהה — זו אותה פריסה", async () => {
    BillingServices.getQuote.mockResolvedValue({
      ...NOTE,
      createdAt: NOTE.issuedAt,
      billing: undefined,
    });

    await render("/quote/q1", "/quote/:id");

    expect(headerTexts().slice(0, 3)).toEqual(["#", 'מק"ט', "ברקוד"]);
    // הצעת מחיר אינה נשלחת להדפסה אוטומטית ולכן אינה נשאלת על מצב הדפסה
    expect(BillingServices.getDeliveryNotePrintStatus).not.toHaveBeenCalled();
  });
});
