import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-[3px] border border-rim bg-surface-nav px-3 text-sm text-ink outline-none transition placeholder:text-ink-dim focus:border-rim-light focus:bg-surface-card focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.5),inset_0_-1px_0_rgba(255,255,255,0.04)]",
          className
        )}
        {...props}
      />
    );
  }
);
