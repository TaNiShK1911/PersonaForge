import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PersonaForge — Causal Micro-Persona Engine",
  description:
    "An AI-powered personalization platform that learns user behavior, builds dynamic micro-personas, identifies causal drivers, simulates counterfactuals, and explains every recommendation.",
  keywords: [
    "PersonaForge",
    "Causal AI",
    "Personalization",
    "Counterfactual",
    "Explainable AI",
    "Multi-Armed Bandit",
    "Micro-Personas",
  ],
  authors: [{ name: "PersonaForge Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
        <SonnerToaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
