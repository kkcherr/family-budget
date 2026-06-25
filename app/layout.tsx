import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { APP_VERSION } from "@/lib/version";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Family Budget",
  description: "A calm weekly money check-in for two.",
};

export const viewport: Viewport = {
  themeColor: "#F7F5FB",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <div className="flex-1">{children}</div>
        <footer className="py-4 text-center text-xs text-ink-faint">
          {`Family Budget · v${APP_VERSION}`}
        </footer>
      </body>
    </html>
  );
}
