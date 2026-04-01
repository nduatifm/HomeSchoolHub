import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  isValidElement,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

// ─── Context ──────────────────────────────────────────────────────────────────

interface DialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

function useDialogContext() {
  const context = useContext(DialogContext);
  if (!context) throw new Error("Dialog compound components must be used within <Dialog>");
  return context;
}

// ─── Dialog (root) ────────────────────────────────────────────────────────────

export function Dialog({
  children,
  open,
  onOpenChange,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Controlled: both open + onOpenChange must be provided together.
  // If only `open` is passed without `onOpenChange`, we warn and treat as read-only.
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (isControlled) {
        // In controlled mode, always notify the parent — never touch internal state.
        onOpenChange?.(next);
      } else {
        setInternalOpen(next);
        onOpenChange?.(next);
      }
    },
    [isControlled, onOpenChange],
  );

  return (
    <DialogContext.Provider value={{ open: isOpen, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

// ─── DialogTrigger ────────────────────────────────────────────────────────────

export function DialogTrigger({
  children,
  asChild = false,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const { setOpen } = useDialogContext();

  if (asChild) {
    // Safe check — React.isValidElement guards against fragments, arrays, strings.
    if (!isValidElement(children)) {
      console.warn("DialogTrigger: `asChild` requires a single valid React element as children.");
      return <>{children}</>;
    }
    const child = children as React.ReactElement<Record<string, unknown>>;
    return (
      <child.type
        {...child.props}
        onClick={(e: React.MouseEvent) => {
          if (typeof child.props.onClick === "function") child.props.onClick(e);
          setOpen(true);
        }}
      />
    );
  }

  return (
    <button type="button" onClick={() => setOpen(true)}>
      {children}
    </button>
  );
}

// ─── DialogContent ────────────────────────────────────────────────────────────

export function DialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open, setOpen } = useDialogContext();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Close on Escape; trap focus inside the panel
  useEffect(() => {
    if (!open) return;

    // Save the element that was focused before the dialog opened
    previouslyFocused.current = document.activeElement as HTMLElement;

    // Move focus into the panel
    panelRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }

      // Focus trap
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus to the element that triggered the dialog
      previouslyFocused.current?.focus();
    };
  }, [open, setOpen]);

  if (!open) return null;

  // Portal into document.body so fixed positioning is always relative
  // to the true viewport — never clipped by a transformed ancestor.
  return createPortal(
    <div
      // Single container: uniform overlay + centering in one element.
      // bg-black/50 is on inset-0, so it always covers the full screen evenly.
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      aria-hidden="true"
      onClick={() => setOpen(false)}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          // max-h + overflow-y-auto: tall content scrolls inside the panel,
          // never overflows the viewport.
          "relative w-full max-w-lg max-h-[90vh] overflow-y-auto",
          "bg-white rounded-lg shadow-2xl p-6 focus:outline-none",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button — type="button" prevents accidental form submission */}
        <button
          type="button"
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          onClick={() => setOpen(false)}
        >
          <X className="h-4 w-4" />
        </button>

        {children}
      </div>
    </div>,
    document.body,
  );
}

// ─── DialogHeader ─────────────────────────────────────────────────────────────

export function DialogHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)}>
      {children}
    </div>
  );
}

// ─── DialogTitle ──────────────────────────────────────────────────────────────

export function DialogTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("text-lg font-semibold leading-none tracking-tight pr-6", className)}>
      {/* pr-6 prevents the title text from running under the close button */}
      {children}
    </h2>
  );
}

// ─── DialogDescription ────────────────────────────────────────────────────────

export function DialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </p>
  );
}

// ─── DialogFooter ─────────────────────────────────────────────────────────────

export function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    // flex-row on all breakpoints keeps button order consistent.
    // justify-end aligns actions to the right as expected.
    <div className={cn("flex flex-row justify-end gap-2 mt-4", className)}>
      {children}
    </div>
  );
}

