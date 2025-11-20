import { LucideIcon } from "lucide-react";

interface ColorfulStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className: string;
  subtitle?: string;
}

export default function ColorfulStatCard({
  title,
  value,
  icon: Icon,
  className,
  subtitle,
}: ColorfulStatCardProps) {
  const testIdBase = title.toLowerCase().replace(/\s+/g, "-");

  return (
    <div
      className={`${className} rounded-3xl p-6 text-white shadow-lg hover:scale-105 transition-transform cursor-pointer`}
      data-testid={`stat-card-${testIdBase}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`bg-white/20 p-3 rounded-2xl`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="text-right">
          <div
            className="text-3xl font-bold"
            data-testid={`text-${testIdBase}`}
          >
            {value}
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium opacity-90">{title}</h3>
        {subtitle && <p className="text-xs opacity-75">{subtitle}</p>}
      </div>
    </div>
  );
}
