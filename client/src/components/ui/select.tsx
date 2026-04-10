import { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  labeledValue: string;
  label: string;
  setLabelFor: (value: string, label: string) => void;
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
  const [labeledValue, setLabeledValue] = useState("");
  const [label, setLabel] = useState("");

  const setLabelFor = (v: string, l: string) => {
    setLabeledValue(v);
    setLabel(l);
  };

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, labeledValue, label, setLabelFor }}>
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

  const display =
    context.value && context.labeledValue === context.value
      ? context.label || context.value
      : context.value;

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
        const resolvedLabel = textValue ?? (typeof children === "string" ? children : "");
        context.setLabelFor(value, resolvedLabel);
        context.onValueChange(value);
        context.setOpen(false);
      }}
    >
      {children}
    </div>
  );
}
