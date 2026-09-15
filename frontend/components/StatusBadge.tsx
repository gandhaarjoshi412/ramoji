import React from "react";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStyle = () => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-slate-100 text-[#0f2942] border-slate-200";
      case "active":
        return "bg-emerald-50 text-[#064e3b] border-emerald-200";
      case "upcoming":
        return "bg-amber-50 text-[#966814] border-amber-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getDotStyle = () => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-slate-500";
      case "active":
        return "bg-[#064e3b] animate-pulse";
      case "upcoming":
        return "bg-[#b48324]";
      default:
        return "bg-slate-400";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border ${getStyle()}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getDotStyle()}`} />
      {status}
    </span>
  );
};
