import { GraduationCap } from "lucide-react";
import logo from "../assets/logo.jpeg";

interface LogoProps {
  variant?: "default" | "sidebar";
  className?: string;
}

export function Logo({ variant = "default", className = "" }: LogoProps) {
  if (variant === "sidebar") {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 mb-8 ${className}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
          <GraduationCap className="h-8 w-8 text-white" />
        </div>
        <div className="text-center">
          <div className="text-xs font-bold text-white leading-tight">Lyra</div>
          <div className="text-xs font-bold text-white leading-tight">
            preparatory
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <img src={logo} alt="Logo" />
    </div>
  );
}
