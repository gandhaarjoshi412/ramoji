import "./globals.css";
import React from "react";
import { Playfair_Display, Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Dolphin Hotels — Culinary Intelligence & Banquet Waste Analytics",
  description: "Executive hospitality platform for banquet food waste tracking, recipe production yield, and cost control.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${playfair.variable} ${inter.variable}`}>
      <body className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 antialiased selection:bg-slate-900 selection:text-white">
        <AuthProvider>
          <div className="min-h-screen flex flex-col relative bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.04),rgba(255,255,255,0))]">
            <Navbar />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>

            {/* Pristine Executive Hotel Footer */}
            <footer className="no-print border-t border-slate-200/80 bg-white/80 backdrop-blur-xs py-6 text-xs text-slate-500 font-medium mt-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-serif text-sm tracking-wider font-bold text-slate-900">DOLPHIN HOTELS</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] uppercase tracking-widest text-emerald-700 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Culinary Intelligence & Yield Audit
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-normal">
                  Hotel Operations Management • Optical Leftover Detection & Cost Control
                </div>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
