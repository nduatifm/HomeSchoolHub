import { LucideIcon } from "lucide-react";

interface ColorfulStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: "purple" | "green" | "coral" | "orange";
  lightColor: "light-purple" | "light-green" | "light-coral" | "light-orange";
  subtitle?: string;
}

export default function ColorfulStatCard({
  title,
  value,
  icon: Icon,
  color,
  lightColor,
  subtitle,
}: ColorfulStatCardProps) {
  return (
    <div
      className={`bg-${color} rounded-3xl p-6 text-white shadow-lg hover:scale-105 transition-transform cursor-pointer`}
      data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`bg-white/20 p-3 rounded-2xl`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{value}</div>
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium opacity-90">{title}</h3>
        {subtitle && (
          <p className="text-xs opacity-75">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
