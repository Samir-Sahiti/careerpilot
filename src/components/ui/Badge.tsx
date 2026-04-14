import { type HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

type BadgeVariant = "green" | "red" | "blue" | "yellow" | "gray";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  green: "bg-green-500/10 text-green-400 border-green-500/20",
  red: "bg-red-500/10 text-red-400 border-red-500/20",
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  gray: "bg-white/5 text-gray-400 border-white/10",
};

export function Badge({ variant = "gray", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={twMerge(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
