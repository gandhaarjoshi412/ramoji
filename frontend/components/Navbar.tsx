"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { LogOut } from "lucide-react";

export const Navbar = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user || pathname === "/login") {
    return null;
  }

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/events", label: "Banquets" },
    { href: "/foods", label: "Foods & Density" },
    { href: "/recipes", label: "Recipes & Cost" },
    { href: "/ingredients", label: "Ingredients" },
    { href: "/settings", label: "AI Settings" },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 no-print shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* 5-Star Hotel Brand Identity */}
          <Link href="/dashboard" className="group flex flex-col justify-center">
            <h1 className="font-serif text-xl sm:text-2xl tracking-wider text-[#0f2942] font-bold group-hover:text-[#b48324] transition-colors">
              {user.hotel_name?.toUpperCase() || "DOLPHIN HOTELS"}
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#b48324] font-semibold mt-0.5">
              Banquet Operations & Yield Analytics
            </p>
          </Link>

          {/* Clean Hotel Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-7">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs uppercase tracking-wider font-semibold transition-all py-2 border-b-2 ${
                    isActive
                      ? "text-[#0f2942] border-[#b48324] font-bold"
                      : "text-slate-500 border-transparent hover:text-slate-900 hover:border-slate-300"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Sign Out */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-[#0f2942] flex items-center justify-center text-[#f4d89a] font-bold text-xs shadow-xs">
                {user.name.charAt(0)}
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900 leading-tight">{user.name}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                  {user.role}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Links */}
      <div className="lg:hidden border-t border-slate-100 px-4 py-2.5 flex items-center space-x-5 overflow-x-auto bg-slate-50/80 no-scrollbar">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[11px] uppercase tracking-wider whitespace-nowrap transition-colors py-1 ${
                isActive ? "text-[#0f2942] font-bold border-b-2 border-[#b48324]" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
};
