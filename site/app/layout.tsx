import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const display = Cormorant_Garamond({
  subsets: ["cyrillic", "latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

const body = Manrope({
  subsets: ["cyrillic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://шардекор.рф"),
  title: {
    default: "ШарДекор — свадебная атрибутика и оформление шарами",
    template: "%s — ШарДекор",
  },
  description:
    "ШарДекор: воздушные шары, фольгированные фигуры, свадебная атрибутика, приглашения, декор ЗАГС и банкета. Прокат и оформление свадьбы под ключ.",
  keywords: [
    "воздушные шары",
    "свадебная атрибутика",
    "оформление свадьбы шарами",
    "фольгированные фигуры",
    "ЗАГС",
    "шары на свадьбу",
    "шардекор",
  ],
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "ШарДекор",
  },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
};

export const viewport = {
  themeColor: "#fdfaf5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable}`}>
      <body className="grain min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}