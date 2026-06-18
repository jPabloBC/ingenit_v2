"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

declare global {
	interface Window {
		gtag?: (
			command: "event",
			eventName: string,
			parameters?: Record<string, unknown>,
		) => void;
		va?: (command: "track", parameters?: Record<string, unknown>) => void;
	}
}

export function useVercelAnalytics() {
	const pathname = usePathname();

	useEffect(() => {
		// Keep dependency for potential future custom page-view hooks.
		void pathname;
	}, [pathname]);
}

// Función para trackear eventos personalizados
export function trackEvent(
	eventName: string,
	parameters?: Record<string, unknown>,
) {
	if (typeof window === "undefined") return;

	const hostname = window.location.hostname;
	const parts = hostname.split(".");
	const subdomain =
		hostname === "localhost" || hostname === "127.0.0.1"
			? "main"
			: parts.length > 2
				? parts[0]
				: "main";

	// Google Analytics
	if (window.gtag) {
		window.gtag("event", eventName, {
			...parameters,
			custom_parameter_subdomain: subdomain,
		});
	}

	// Vercel Analytics
	if (window.va) {
		window.va("track", {
			event: eventName,
			subdomain: subdomain,
			...parameters,
		});
	}
}

// Función para trackear conversiones específicas
export function trackConversion(conversionType: string, value?: number) {
	trackEvent("conversion", {
		conversion_type: conversionType,
		value: value,
	});
}

// Función para trackear interacciones del dashboard
export function trackDashboardInteraction(action: string, target: string) {
	trackEvent("dashboard_interaction", {
		action: action,
		target: target,
	});
}
