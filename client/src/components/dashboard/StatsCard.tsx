import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  colorClass?: string;
  className?: string;
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  colorClass = "bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400", 
  className 
}: StatsCardProps) {
  return (
    <div className={cn("bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6", className)}>
      <div className="flex items-center">
        <div className={cn("p-3 rounded-full", colorClass)}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4">
          <h2 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</h2>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
        </div>
      </div>
    </div>
  );
}
