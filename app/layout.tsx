import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Plan Bouw | Grootse plannen. Heldere prijzen.",
  description:
    "Uw verbouwing begint met duidelijkheid. Bereken direct een vrijblijvende prijsindicatie voor uw uitbouw, badkamer, keuken of renovatie en ontdek uw vergunningroute.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nl"
      className={manrope.variable}
    >
      <body>{children}</body>
    </html>
  );
}
