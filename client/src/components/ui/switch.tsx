import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onCheckedChange, disabled, className }: SwitchProps) {
  return (
    <label className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center", disabled && "cursor-not-allowed opacity-50", className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        disabled={disabled}
        className="sr-only peer"
      />
      <span className={cn(
        "block h-5 w-9 rounded-full border-2 border-transparent transition-colors duration-200",
        "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
        checked ? "bg-primary" : "bg-input"
      )} />
      <span className={cn(
        "pointer-events-none absolute top-0.5 left-0.5 block h-4 w-4 rounded-full bg-background shadow-lg transition-transform duration-200",
        checked ? "translate-x-4" : "translate-x-0"
      )} />
    </label>
  );
}
