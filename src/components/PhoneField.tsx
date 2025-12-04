"use client";
import React from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { isValidPhoneNumber } from "react-phone-number-input";

interface PhoneFieldProps {
  value?: string;
  onChange: (value?: string) => void;
  defaultCountry?: string;
  className?: string;
}

export default function PhoneField({ value, onChange, defaultCountry = "CL", className }: PhoneFieldProps) {
  return (
    <div>
      <PhoneInput
        international
        // cast because types in this package are loose in some versions
        defaultCountry={defaultCountry as any}
        value={value}
        onChange={onChange}
        className={className}
      />
    </div>
  );
}

export { isValidPhoneNumber };
