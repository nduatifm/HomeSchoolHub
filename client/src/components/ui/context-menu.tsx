import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

function ContextMenuPanel({
  x,
  y,
  children,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
}) {
  return createPortal(
    <div
      style={{ position: "fixed", top: y, left: x }}
      className="z-50 min-w-[190px] overflow-hidden rounded-md border border-border bg-white p-1 text-foreground shadow-md"
    >
      {children}
    </div>,
    document.body,
  );
}

function ContextMenuItem({
  onAction,
  children,
  className,
}: {
  onAction: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onAction}
      className={cn(
        "relative w-full flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none",
        "transition-colors hover:bg-muted hover:text-foreground text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

function ContextMenuSeparator({ className }: { className?: string }) {
  return <div className={cn("-mx-1 my-1 h-px bg-border", className)} />;
}

export { ContextMenuPanel, ContextMenuItem, ContextMenuSeparator };
