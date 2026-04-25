import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "./lib/redux/provider";
import MobileInputHandler from "./components/MobileInputHandler";
import { DevFetchButton } from "./components/DevFetchButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JMCC Spartans - Cricket Team Dashboard",
  description: "Cricket team statistics, player achievements, and match records for JMCC Spartans",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-gray-900 text-white">
        <MobileInputHandler />
        <ReduxProvider>
          {children}
          <DevFetchButton />
        </ReduxProvider>
      </body>
    </html>
  );
}
