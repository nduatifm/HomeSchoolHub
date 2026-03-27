import logo from "../assets/logo.webp";
import logoSidebar from "../assets/logo-sidebar.webp";
import logoTransparent from "../assets/logo-transparent.webp";

interface LogoProps {
  variant?: "default" | "sidebar" | "transparent" | "mobile";
  className?: string;
}

export function Logo({ variant = "default", className = "" }: LogoProps) {
  if (variant === "sidebar") {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        <img src={logoSidebar} alt="Logo" className="h-8 w-8 object-contain" />
        <span className="font-bold text-sm text-foreground leading-tight">
          Lyra<br />Preparatory
        </span>
      </div>
    );
  }

  if (variant === "mobile") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <img src={logoSidebar} alt="Logo" className="h-7 w-7 object-contain" />
        <span className="font-bold text-sm text-foreground">Lyra Preparatory</span>
      </div>
    );
  }

  if (variant === "transparent") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <img src={logoTransparent} alt="Logo" className="h-10 w-10 object-contain" />
        <span className="font-bold text-xl text-foreground">Lyra Preparatory</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <img src={logo} alt="Logo" className="h-16 w-16 object-contain" />
      <span className="font-bold text-lg text-foreground">Lyra Preparatory</span>
    </div>
  );
}
