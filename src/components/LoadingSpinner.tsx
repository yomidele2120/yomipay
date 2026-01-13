import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingSpinner = ({ size = "md", className }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-primary border-t-transparent",
        sizeClasses[size],
        className
      )}
    />
  );
};

export const FullPageLoader = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="mb-4">
        <span className="text-2xl font-bold text-primary tracking-tight">YOMI</span>
        <span className="text-2xl font-light text-muted-foreground tracking-tight"> PAY</span>
      </div>
      <LoadingSpinner size="lg" />
    </div>
  );
};
