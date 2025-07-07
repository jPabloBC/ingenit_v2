import type { Metadata } from "next";
import { Archivo, Open_Sans } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "IngenIT - Soluciones Web y App",
  description: "Desarrollo de software, apps móviles y sistemas web a medida.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body
        className={`${archivo.variable} ${openSans.variable} antialiased bg-white text-gray2`}
      >
        {children}
      </body>
    </html>
  );
}
