import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { Cinzel, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Pasaport kapağı yazıları için klasik, kabartma yaldıza yakışan büyük harf serif
const cinzel = Cinzel({
  variable: "--font-cover",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "700"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Stamped", template: "%s | Stamped" },
  description: "Pasaportunla nereye gidebilirsin?",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
