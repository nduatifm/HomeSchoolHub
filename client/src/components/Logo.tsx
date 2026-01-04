import logo from "../assets/logo.webp";
import logoSidebar from "../assets/logo-sidebar.webp";
import logoTransparent from "../assets/logo-transparent.webp";

interface LogoProps {
  variant?: "default" | "sidebar" | "transparent";
  className?: string;
}

export function Logo({ variant = "default", className = "" }: LogoProps) {
  if (variant === "sidebar") {
    return (
      <div className="flex items-center justify-center mb-8">
        <img src={logoSidebar} alt="Logo" className="h-16 w-16" />
      </div>
    );
  }

  if (variant === "transparent") {
    return (
      <div className="flex items-center justify-center">
        <img src={logoTransparent} alt="Logo" className="h-32 w-32" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center mb-8">
      <img src={logo} alt="Logo" className="h-32 w-32" />
    </div>
  );
}
