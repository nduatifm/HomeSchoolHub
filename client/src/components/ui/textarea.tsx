import React, { TextareaHTMLAttributes, forwardRef, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { resolveProseInputAttributes } from "@/lib/proseInput";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  fieldSize?: "compact" | "standard" | "writing";
  autoGrow?: boolean;
}

const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, fieldSize = "standard", autoGrow = true, spellCheck, lang, autoCorrect, autoCapitalize, onChange, value, rows, ...props }, ref) => {
    const proseAttributes = resolveProseInputAttributes({
      spellCheck: spellCheck === undefined ? undefined : spellCheck === true || spellCheck === "true",
      lang,
      autoCorrect,
      autoCapitalize,
    });
    const localRef = useRef<HTMLTextAreaElement | null>(null);
    const setRefs = useCallback((node: HTMLTextAreaElement | null) => {
      localRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }, [ref]);
    const measure = useCallback(() => {
      if (!autoGrow || !localRef.current) return;
      const element = localRef.current;
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;
    }, [autoGrow]);
    useBrowserLayoutEffect(measure, [measure, value, rows, fieldSize]);

    return (
      <textarea
        {...proseAttributes}
        className={cn(
          "flex min-w-0 w-full max-h-[min(45dvh,26rem)] overflow-y-auto rounded-md border border-input bg-background px-3.5 py-3 text-base leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          fieldSize === "compact" ? "min-h-[5rem]" : fieldSize === "writing" ? "min-h-[10rem]" : "min-h-[7rem]",
          className
        )}
        ref={setRefs}
        rows={rows ?? (fieldSize === "writing" ? 6 : 3)}
        value={value}
        onChange={(event) => { measure(); onChange?.(event); }}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
