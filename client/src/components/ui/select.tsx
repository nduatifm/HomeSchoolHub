import { Children, createContext, isValidElement, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedLabel: string;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

export function Select({ 
  children, 
  value, 
  onValueChange 
}: { 
  children: React.ReactNode; 
  value: string; 
  onValueChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = findSelectedLabel(children, value);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, selectedLabel }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ 
  children, 
  className,
  ...props 
}: { 
  children: React.ReactNode; 
  className?: string;
  [key: string]: any;
}) {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectTrigger must be used within Select");

  return (
    <button
      type="button"
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={() => context.setOpen(!context.open)}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectValue must be used within Select");

  const display = context.value ? context.selectedLabel : "";

  return (
    <span className={display ? undefined : "text-muted-foreground"}>
      {display || placeholder || "Select..."}
    </span>
  );
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectContent must be used within Select");

  if (!context.open) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={() => context.setOpen(false)}
      />
      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
        <div className="p-1">
          {children}
        </div>
      </div>
    </>
  );
}

export function SelectItem({ 
  value, 
  children,
  textValue,
}: { 
  value: string; 
  children: React.ReactNode;
  textValue?: string;
}) {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectItem must be used within Select");

  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
        context.value === value && "bg-accent"
      )}
      onClick={() => {
        context.onValueChange(value);
        context.setOpen(false);
      }}
    >
      {children}
    </div>
  );
}

function textFromChildren(children: React.ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      if (isValidElement<{ children?: React.ReactNode }>(child)) {
        return textFromChildren(child.props.children);
      }
      return "";
    })
    .join("")
    .trim();
}

export function findSelectedLabel(children: React.ReactNode, value: string): string {
  let label = "";
  Children.forEach(children, (child) => {
    if (label || !isValidElement<any>(child)) return;
    if (child.type === SelectItem && child.props.value === value) {
      label = child.props.textValue ?? textFromChildren(child.props.children);
      return;
    }
    label = findSelectedLabel(child.props.children, value);
  });
  return label;
}
