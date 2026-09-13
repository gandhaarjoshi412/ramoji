import "./globals.css";
import React from "react";
import { AuthProvider } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "Banquet Food Waste Monitoring & Analytics",
  description: "Operational food waste tracking platform for hotel banquet operations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
