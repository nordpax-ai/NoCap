import type { Metadata } from "next";
import {
  Instrument_Serif,
  Inter,
  Manrope,
  Newsreader,
  Outfit,
} from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--ff-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--ff-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const instrument = Instrument_Serif({
  variable: "--ff-instrument",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  display: "swap",
});

const inter = Inter({
  variable: "--ff-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--ff-news",
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "nocap — NextGen European Deal Lawyers",
    template: "%s — nocap",
  },
  description:
    "A private European circle for the next generation of lawyers working on M&A, private equity, venture capital and corporate transactions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${manrope.variable} ${instrument.variable} ${inter.variable} ${newsreader.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&family=Inter:wght@400;500;600&family=Manrope:wght@400;500;600;700&family=Newsreader:wght@500&family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col bg-paper text-ink">{children}</body>
    </html>
  );
}
