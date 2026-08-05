interface ClSpinnerProps {
  className?: string;
  size?: number;
}

export function ClSpinner({ className = "", size = 16 }: ClSpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full animate-spin ${className}`}
      style={{
        width: size,
        height: size,
        border: "2px solid transparent",
        borderTopColor: "currentColor",
        borderRightColor: "rgba(128,128,128,0.25)",
        borderBottomColor: "rgba(128,128,128,0.25)",
        borderLeftColor: "rgba(128,128,128,0.25)",
      }}
    />
  );
}
