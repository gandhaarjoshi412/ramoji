"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sparkles } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <div className="w-14 h-14 rounded-3xl bg-slate-900 border border-slate-700 flex items-center justify-center shadow-xl shadow-emerald-950/20">
          <Sparkles className="w-7 h-7 text-emerald-400 animate-pulse" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-lg font-black text-slate-900">Dolphin Hotels</h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          AI Food Waste & Analytics Engine
        </p>
      </div>
      <div className="w-6 h-6 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin mt-2" />
    </div>
  );
}
