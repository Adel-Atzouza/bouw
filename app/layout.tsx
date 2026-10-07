import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "bouwaanhuis | Grootse plannen. Een helder begin.",
  description:
    "Vertel ons over uw uitbouw, badkamer, keuken of renovatie. Breng uw wensen in kaart en deel uw vrijblijvende aanvraag. Samen bespreken we de mogelijkheden en kosten.",
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
