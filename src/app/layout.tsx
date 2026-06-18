export const dynamic = "force-dynamic";

// src/app/layout.tsx
import { Archivo, Open_Sans } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import WebChatBot from "@/components/WebChatBot";

const archivo = Archivo({
	subsets: ["latin"],
	weight: ["400", "600", "700"],
	variable: "--font-archivo",
});

const openSans = Open_Sans({
	subsets: ["latin"],
	weight: ["400", "700"],
	variable: "--font-sansation",
});

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
			<html lang="es" data-scroll-behavior="smooth">
			<head>
				<link rel="icon" href="/favicon.png" type="image/png" sizes="any" />
			</head>
			<body
				className={`${archivo.variable} ${openSans.variable} antialiased bg-white text-gray2`}
			>
				<AnalyticsProvider>
						{children}
						<WebChatBot />
						{process.env.NODE_ENV === "production" ? <Analytics /> : null}
					</AnalyticsProvider>
				</body>
			</html>
		);
}
