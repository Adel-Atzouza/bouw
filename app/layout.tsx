import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export const metadata: Metadata = {
  icons: { icon: "/images/delicent.png", apple: "/images/delicent.png" },
  title: "Dèlicent | Bouwkundige tekeningen & vergunningen",
  description:
    "Van eerste idee naar een helder bouwplan. Dèlicent: tekenwerk voor dakkapel en dakopbouw, bouwkundige tekeningen, constructieberekeningen, daglicht- en ventilatieberekeningen en vergunningbegeleiding.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
