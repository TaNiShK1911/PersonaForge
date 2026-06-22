import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
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

import { Providers } from "@/components/providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${jakartaSans.variable} ${sourceSans.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <Providers>
          {children}
          <Toaster />
          <SonnerToaster richColors position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
