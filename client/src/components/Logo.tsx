import { GraduationCap } from "lucide-react";

interface LogoProps {
  variant?: "default" | "sidebar";
  className?: string;
}

export function Logo({ variant = "default", className = "" }: LogoProps) {
  if (variant === "sidebar") {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 mb-8 ${className}`}>
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
          <GraduationCap className="h-8 w-8 text-white" />
        </div>
        <div className="text-center">
          <div className="text-xs font-bold text-white leading-tight">Lyra</div>
          <div className="text-xs font-bold text-white leading-tight">preparatory</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
        <GraduationCap className="h-7 w-7 text-white" />
      </div>
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Lyra Preparatory
        </h1>
        <p className="text-xs text-muted-foreground">Learning made simple</p>
      </div>
    </div>
  );
}
