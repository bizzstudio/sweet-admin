// src/components/billing/PrintNoteOffer.jsx
//
// "להדפיס עכשיו?" — מוצג מיד אחרי שתעודת משלוח הופקה או אושרה.
//
// בלי זה הדרך להדפסה הייתה: לחזור לרשימה, למצוא את התעודה, לפתוח אותה,
// וללחוץ "הדפסה". כאן זו לחיצה אחת: המעבר למסך התעודה נעשה עם ?print=1,
// וחלון ההדפסה נפתח שם לבד (ראה BillingDocument).

import React from "react";
import { Button } from "@windmill/react-ui";
import { useHistory } from "react-router-dom";
import { FiCheck, FiPrinter } from "react-icons/fi";

/**
 * @param {object}   note    - התעודה שהופקה ({ _id, number })
 * @param {function} onClose - "לא עכשיו"
 */
const PrintNoteOffer = ({ note, onClose }) => {
  const history = useHistory();
  if (!note?._id) return null;

  return (
    <div
      role="status"
      className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-300 bg-green-50 dark:bg-green-900/20 p-4"
    >
      <p className="flex items-center gap-2 font-semibold text-green-800 dark:text-green-300">
        <FiCheck className="shrink-0" />
        תעודת משלוח {note.number} הופקה. להדפיס אותה עכשיו?
      </p>
      <div className="flex items-center gap-2">
        <Button onClick={() => history.push(`/delivery-note/${note._id}?print=1`)}>
          <FiPrinter className="ml-2" /> הדפסה
        </Button>
        <Button layout="outline" onClick={onClose}>
          לא עכשיו
        </Button>
      </div>
    </div>
  );
};

export default PrintNoteOffer;
