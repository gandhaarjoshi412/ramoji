import React from "react";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status?.toLowerCase() || "";

  const getBadgeStyle = () => {
    switch (normalized) {
      case "active":
        return "bg-emerald-500/10 text-emerald-700 border-emerald-500/25";
      case "completed":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "upcoming":
        return "bg-blue-500/10 text-blue-700 border-blue-500/25";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const getDotStyle = () => {
    switch (normalized) {
      case "active":
        return "bg-emerald-500 ring-2 ring-emerald-500/20 animate-pulse";
      case "completed":
        return "bg-slate-400";
      case "upcoming":
        return "bg-blue-500";
      default:
        return "bg-slate-400";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase border transition-colors ${getBadgeStyle()}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${getDotStyle()}`} />
      {status}
    </span>
  );
};
