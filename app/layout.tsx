import type { Metadata } from "next";
import { EB_Garamond, Lora, Montserrat } from "next/font/google";
import "./globals.css";

const garamond = EB_Garamond({ variable: "--font-garamond", subsets: ["latin"], weight: ["500", "600"], style: ["normal", "italic"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "The LifeCharter Program", template: "%s · LifeCharter" },
  description: "Design a balanced, authentic life across all twelve dimensions, one week at a time, with AmiLynne “Babs” Carroll.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${garamond.variable} ${lora.variable} ${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
