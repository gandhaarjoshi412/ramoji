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
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased selection:bg-slate-900 selection:text-white">
        <AuthProvider>
          <div className="min-h-screen flex flex-col bg-[#f8fafc] relative">
            <Navbar />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>

            {/* Pristine 5-Star Hotel Footer */}
            <footer className="no-print border-t border-slate-200/80 bg-white py-6 text-xs text-slate-500 font-medium">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-serif text-sm tracking-wider font-bold text-slate-900">DOLPHIN HOTELS</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                    Culinary Intelligence & Cost Analytics
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-normal">
                  Hotel Operations Management • Kitchen Production & Yield Audit
                </div>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
