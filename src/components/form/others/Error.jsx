import React from "react";

const Error = ({ errorName, className = '' }) => {
  return (
    <>
      {errorName && (
        // שני באגים כאן: (1) חיבור מחרוזות בלי רווח יצר ‎"mt-2custom-class" —
        // גם ‎mt-2 וגם המחלקה שהועברה אבדו; (2) ההודעה הופיעה בלי שום הכרזה,
        // בעוד הפוקוס נמצא על כפתור השליחה, ולכן משתמש קורא-מסך לחץ "שמור"
        // ולא ידע שהטופס נדחה. ‎role="alert" מקריא אותה מיד.
        <span role="alert" className={`block text-red-600 text-sm font-medium mt-1 ${className}`}>
          {errorName.message}
        </span>
      )}
    </>
  );
};

export default Error;
