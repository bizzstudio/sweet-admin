import React from "react";
import { Label } from "@windmill/react-ui";

// ‎htmlFor אופציונלי: כשמעבירים אותו (בערך זהה ל-‎name של השדה) נוצר קישור
// אמיתי בין התווית לשדה, ולחיצה על התווית ממקדת את השדה. ‎InputArea מגדיר
// ‎id={name}, ולכן די להעביר את אותו שם.
const LabelArea = ({ label, htmlFor, oneLine = false }) => {
  return (
    <Label
      htmlFor={htmlFor}
      className={`${oneLine ? 'col-span-6' : 'col-span-4 sm:col-span-2'} font-semibold text-sm mb-1`}
    >
      {label}
    </Label>
  );
};

export default LabelArea;
