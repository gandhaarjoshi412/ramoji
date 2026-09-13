"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import {
  Utensils,
  LayoutDashboard,
  Calendar,
  BookOpen,
  Apple,
  Settings as SettingsIcon,
  LogOut,
  Sparkles,
  Layers,
} from "lucide-react";

export const Navbar = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [aiMode, setAiMode] = useState<string>("mock");

  useEffect(() => {
    if (user) {
      apiRequest<{ ai_mode: string }>("/api/settings")
        .then((res) => setAiMode(res.ai_mode))
        .catch(() => {});
    }
  }, [user]);

  if (!user || pathname === "/login") {
    return null;
  }

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/events", label: "Banquets", icon: Calendar },
    { href: "/foods", label: "Foods & Density", icon: Apple },
    { href: "/recipes", label: "Recipes & Cost", icon: BookOpen },
    { href: "/ingredients", label: "Ingredients", icon: Layers },
    { href: "/settings", label: "AI Settings", icon: SettingsIcon },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <Link href="/dashboard" className="font-black text-slate-900 text-lg tracking-tight hover:text-emerald-700">
                {user.hotel_name || "Dolphin Hotels"}
              </Link>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <span>AI Banquet Waste & Cost Analytics</span>
                <span className="text-slate-300">•</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold ${
                  aiMode === "yolo" 
                    ? "bg-purple-100 text-purple-800" 
                    : "bg-emerald-100 text-emerald-800"
                }`}>
                  <Sparkles className="w-2.5 h-2.5" />
                  {aiMode === "yolo" ? "YOLO26-seg (Live)" : "YOLO26-seg (Mock AI)"}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-slate-100 text-emerald-800 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User profile & Logout */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-bold text-slate-900">{user.name}</div>
              <div className="text-[11px] text-slate-400 capitalize font-medium">{user.role} Access</div>
            </div>
            <button
              onClick={logout}
              title="Log out"
              className="inline-flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav scrollbar */}
      <div className="lg:hidden border-t border-slate-100 px-4 py-2 flex items-center space-x-2 overflow-x-auto bg-slate-50">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                isActive ? "bg-white shadow-xs text-emerald-800" : "text-slate-600"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
};
