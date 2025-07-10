"use client";

import React from "react";

interface PerformanceLoaderProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

const PerformanceLoader: React.FC<PerformanceLoaderProps> = ({
  size = "md",
  text = "Loading...",
  className = "",
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        <div
          className={`animate-spin rounded-full border-b-2 border-violet-600 ${sizeClasses[size]}`}
        />
        {text && <p className="text-sm text-gray-600 animate-pulse">{text}</p>}
      </div>
    </div>
  );
};

export default PerformanceLoader;
