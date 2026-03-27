import { LucideIcon } from "lucide-react";

interface ColorfulStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
  subtitle?: string;
  accent?: "blue" | "green" | "amber" | "purple" | "rose";
}

const accentMap = {
  blue:   { bg: "bg-blue-50",   icon: "text-blue-600",   value: "text-blue-700" },
  green:  { bg: "bg-green-50",  icon: "text-green-600",  value: "text-green-700" },
  amber:  { bg: "bg-amber-50",  icon: "text-amber-600",  value: "text-amber-700" },
  purple: { bg: "bg-purple-50", icon: "text-purple-600", value: "text-purple-700" },
  rose:   { bg: "bg-rose-50",   icon: "text-rose-600",   value: "text-rose-700" },
};

export default function ColorfulStatCard({
  title,
  value,
  icon: Icon,
  className = "",
  subtitle,
  accent = "blue",
}: ColorfulStatCardProps) {
  const testIdBase = title.toLowerCase().replace(/\s+/g, "-");
  const colors = accentMap[accent] || accentMap.blue;

  return (
    <div
      className={`stat-card ${className}`}
      data-testid={`stat-card-${testIdBase}`}
    >
      <div className={`${colors.bg} ${colors.icon} p-3 rounded-lg shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div
          className={`text-2xl font-bold ${colors.value}`}
          data-testid={`text-${testIdBase}`}
        >
          {value}
        </div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
