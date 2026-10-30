import React from "react";
import { cn } from "@/lib/utils";

interface ShimmerTextProps {
  text: string;
  className?: string;
}

export function ShimmerText({ text, className }: ShimmerTextProps) {
  return (
    <span
      className={cn("inline-block text-blue-300", className)}
      style={{
        background: "linear-gradient(90deg, #60a5fa 0%, #bfdbfe 50%, #60a5fa 100%)",
        backgroundSize: "200% auto",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        animation: "shimmer 1.5s linear infinite",
      }}
    >
      {text}
    </span>
  );
}
