import type { Metadata } from "next";
import { Cinzel, Great_Vibes, Nunito } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  display: "swap",
});

const greatVibes = Great_Vibes({
  weight: "400",
  variable: "--font-great-vibes",
  subsets: ["latin"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Baby Shower | Celebrando la llegada de nuestro bebé",
  description: "Acompáñanos a celebrar el babyshower de nuestro bebé. Confirma tu asistencia y elige un regalo de nuestro catálogo.",
};

export const viewport = {
  themeColor: "#f6f1e8",
  colorScheme: "light only",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${cinzel.variable} ${greatVibes.variable} ${nunito.variable}`}>
      <body>{children}</body>
    </html>
  );
}
