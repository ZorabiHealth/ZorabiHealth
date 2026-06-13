import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "ZorabiHealth — Clinical Intelligence & Telemetry Sync Platform",
  description:
    "Manage prescriptions, automate pharmacy refills, log symptoms via AI voice assistant, and receive real-time push notifications.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full", "antialiased", hankenGrotesk.variable, "font-sans")}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
