import logo from "../assets/logo.jpeg";
import logoSidebar from "../assets/logo-sidebar.png";

interface LogoProps {
  variant?: "default" | "sidebar";
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

  return (
    <div className="flex items-center justify-center mb-8">
      <img src={logo} alt="Logo" className="h-32 w-32" />
    </div>
  );
}
