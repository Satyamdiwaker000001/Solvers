import React from "react";

/**
 * Professional Solvers Logo Component.
 * Features:
 * - Geometric squircle icon with code chevrons (< >) and logic core spark.
 * - Precision typography with custom indigo-accented dot on 'S'.
 * - Clean responsive sizing options: "compact", "default", "large".
 */
export function SolversLogo({ size = "default", showText = true, className = "", textClassName = "" }) {
  const iconDimensions =
    size === "compact"
      ? "size-7 rounded-[10px]"
      : size === "large"
      ? "size-11 sm:size-12 rounded-2xl"
      : "size-8.5 sm:size-9 rounded-[13px]";

  const textClasses =
    size === "compact"
      ? "text-base font-black"
      : size === "large"
      ? "text-2xl sm:text-3xl font-black"
      : "text-xl sm:text-[22px] font-black";

  return (
    <div
      className={`inline-flex items-center gap-2.5 select-none ${className}`}
      aria-label="Solvers"
    >
      {/* Icon Squircle Badge */}
      <div
        className={`relative flex items-center justify-center shrink-0 bg-gradient-to-br from-[#6366F1] via-[#4F46E5] to-[#4338CA] text-white shadow-[0_4px_14px_-2px_rgba(79,70,229,0.35)] border border-white/20 transition-transform duration-200 hover:scale-[1.03] ${iconDimensions}`}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-3/5 h-3/5"
        >
          {/* Left Angle Bracket */}
          <path
            d="M11 9L5 16L11 23"
            stroke="white"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Right Angle Bracket */}
          <path
            d="M21 9L27 16L21 23"
            stroke="white"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Central Problem-Solving Diamond Spark */}
          <polygon points="16,11.5 19.5,16 16,20.5 12.5,16" fill="#38BDF8" />
          <circle cx="16" cy="16" r="1.3" fill="white" />
        </svg>
      </div>

      {/* Typography Wordmark */}
      {showText && (
        <span
          className={`tracking-tight text-ink font-sans flex items-center leading-none ${textClasses} ${textClassName}`}
        >
          Solvers
          <span className="size-1.5 rounded-full bg-[#4F46E5] ml-0.5 translate-y-0.5" />
        </span>
      )}
    </div>
  );
}
