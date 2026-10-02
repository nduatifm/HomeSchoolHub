import React, { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { resolveProseInputAttributes } from "@/lib/proseInput";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  density?: "standard" | "compact";
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, density = "standard", spellCheck, lang, autoCorrect, autoCapitalize, ...props }, ref) => {
    const isProseInput = type === undefined || type === "text";
    const proseAttributes = resolveProseInputAttributes({
      isProseInput,
      spellCheck: spellCheck === undefined ? undefined : spellCheck === true || spellCheck === "true",
      lang,
      autoCorrect,
      autoCapitalize,
    });

    return (
      <input
        type={type}
        {...proseAttributes}
        className={cn(
          "flex min-w-0 w-full rounded-md border border-input bg-background px-3.5 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          density === "compact" ? "h-10" : "h-11",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
