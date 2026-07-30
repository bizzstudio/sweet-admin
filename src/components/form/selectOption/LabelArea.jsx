import React from "react";
import { Label } from "@windmill/react-ui";

const LabelArea = ({ label, oneLine = false }) => {
  return (
    <Label className={`${oneLine ? 'col-span-6' : 'col-span-4 sm:col-span-2'} font-semibold text-sm mb-1`}>
      {label}
    </Label>
  );
};

export default LabelArea;
