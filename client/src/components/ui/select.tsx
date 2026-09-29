import React, { Children, createContext, isValidElement, useContext, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedLabel: string;
  options: string[];
  activeValue: string;
  setActiveValue: (value: string) => void;
  listId: string;
  triggerRef: React.RefObject<HTMLButtonElement>;
  choose: (value: string) => void;
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
  const [activeValue, setActiveValue] = useState(value);
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const options = findOptionValues(children);
  const selectedLabel = findSelectedLabel(children, value);
  const choose = (next: string) => {
    onValueChange(next);
    setActiveValue(next);
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [open]);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, selectedLabel, options, activeValue, setActiveValue, listId, triggerRef, choose }}>
      <div ref={rootRef} className="relative min-w-0">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ 
  children, 
  className,
  onClick,
  onKeyDown,
  ...props 
}: { 
  children: React.ReactNode; 
  className?: string;
  [key: string]: any;
}) {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectTrigger must be used within Select");
  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const { options, activeValue, open } = context!;
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      context!.setOpen(false);
    } else if (event.key === "Tab" && open) {
      context!.setOpen(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
      event.preventDefault();
      if (!options.length) return;
      const nextIndex = nextOptionIndex(options, open ? activeValue : context!.value, event.key);
      context!.setActiveValue(options[nextIndex]);
      context!.setOpen(true);
      requestAnimationFrame(() => document.getElementById(`${context!.listId}-${encodeURIComponent(options[nextIndex])}`)?.scrollIntoView({ block: "nearest" }));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open && options.includes(activeValue)) context!.choose(activeValue);
      else {
        context!.setActiveValue(options.includes(context!.value) ? context!.value : options[0] ?? "");
        context!.setOpen(true);
      }
    }
  }

  return (
    <button
      {...props}
      type="button"
      ref={context.triggerRef}
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={context.open}
      aria-controls={context.listId}
      aria-activedescendant={context.open && context.activeValue ? `${context.listId}-${encodeURIComponent(context.activeValue)}` : undefined}
      data-ui-select-trigger=""
      className={cn(
        "flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-md border border-input bg-background px-3.5 py-2.5 text-left text-base leading-snug ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          context.setActiveValue(context.options.includes(context.value) ? context.value : context.options[0] ?? "");
          context.setOpen(!context.open);
        }
      }}
      onKeyDown={handleKeyDown}
    >
      {children}
      <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 opacity-50" />
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectValue must be used within Select");

  const display = context.value ? context.selectedLabel : "";

  return (
    <span className={cn("min-w-0 break-words", !display && "text-muted-foreground")}>
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
      <div aria-hidden="true" className="fixed inset-0 z-40" onClick={() => context.setOpen(false)} />
      <div id={context.listId} role="listbox" className="absolute z-50 mt-1 max-h-[min(18rem,45dvh)] w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
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
      id={`${context.listId}-${encodeURIComponent(value)}`}
      role="option"
      aria-selected={context.value === value}
      className={cn(
        "relative flex min-h-11 cursor-pointer select-none items-center rounded-sm px-3 py-2.5 text-base leading-snug break-words outline-none hover:bg-accent hover:text-accent-foreground",
        (context.value === value || context.activeValue === value) && "bg-accent"
      )}
      onMouseEnter={() => context.setActiveValue(value)}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => context.choose(value)}
    >
      {children}
    </div>
  );
}

function findOptionValues(children: React.ReactNode): string[] {
  const values: string[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<any>(child)) return;
    if (child.type === SelectItem) values.push(child.props.value);
    else values.push(...findOptionValues(child.props.children));
  });
  return values;
}

export function nextOptionIndex(options: string[], activeValue: string, key: string): number {
  if (!options.length) return -1;
  if (key === "Home") return 0;
  if (key === "End") return options.length - 1;
  const index = options.indexOf(activeValue);
  if (index < 0) return key === "ArrowDown" ? 0 : options.length - 1;
  return (index + (key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
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
