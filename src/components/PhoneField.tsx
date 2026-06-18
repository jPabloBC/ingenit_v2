"use client";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import type { Country } from "react-phone-number-input";
import { isValidPhoneNumber } from "react-phone-number-input";

interface PhoneFieldProps {
	value?: string;
	onChange: (value?: string) => void;
	defaultCountry?: Country;
	className?: string;
}

export default function PhoneField({
	value,
	onChange,
	defaultCountry = "CL",
	className,
}: PhoneFieldProps) {
	return (
		<div>
			<PhoneInput
				international
				defaultCountry={defaultCountry}
				value={value}
				onChange={onChange}
				className={className}
			/>
		</div>
	);
}

export { isValidPhoneNumber };
