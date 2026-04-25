import { twMerge } from "tailwind-merge";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={twMerge(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent text-amber-400",
        sizeClasses[size],
        className
      )}
    />
  );
}
