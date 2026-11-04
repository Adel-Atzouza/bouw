import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "bouwregieaanhuis | Uw verbouwing. Zonder het regelwerk.",
  description:
    "Uw complete renovatie van eerste plan tot oplevering. bouwregieaanhuis regelt vakmensen, planning en bouwbegeleiding. Beschrijf uw plannen en vraag vrijblijvend een offerte aan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nl"
      translate="no"
      className={manrope.variable}
    >
      <body>{children}</body>
    </html>
  );
}
