import React from "react";

const Main = ({ children }) => {
  return (
    // ‎tabIndex={-1} מאפשר לקבל פוקוס תכנותית מקישור הדילוג, בלי להוסיף
    // עצירת Tab משלו לניווט הרגיל.
    <main id="admin-main-content" tabIndex={-1} data-skip-target className="h-full overflow-y-auto">
      <div className="sm:container grid lg:px-6 sm:px-4 px-2 mx-auto">
        {children}
      </div>
    </main>
  );
};

export default Main;
