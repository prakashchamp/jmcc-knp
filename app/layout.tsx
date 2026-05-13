import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "./lib/redux/provider";
import MobileInputHandler from "./components/MobileInputHandler";
import { ScrollToTop } from "./components/ScrollToTop";

import { ThemeProvider } from "./components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JMCC KNP - Cricket Team Dashboard",
  description: "Cricket team statistics, player achievements, and match records for JMCC KNP",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#000000",
  initialScale: 1,
  width: "device-width",
  userScalable: false,
  viewportFit: "cover" as const,
};

import { PWAManager } from "./components/pwa/PWAManager";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-300">
        <ThemeProvider>
          <ScrollToTop />
          <MobileInputHandler />
          <ReduxProvider>
            <PWAManager />
            {children}
          </ReduxProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
