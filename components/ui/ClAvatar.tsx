import { ImgHTMLAttributes, forwardRef } from "react";

interface ClAvatarProps extends ImgHTMLAttributes<HTMLImageElement> {
  size?: number;
  fallback?: string;
}

export const ClAvatar = forwardRef<HTMLImageElement, ClAvatarProps>(
  ({ size = 40, fallback, src, alt = "", className = "", ...props }, ref) => {
    const style = { width: size, height: size, minWidth: size, minHeight: size };

    if (src) {
      return (
        <img
          ref={ref}
          src={src}
          alt={alt}
          className={`rounded-[8px] object-cover ${className}`}
          style={style}
          {...props}
        />
      );
    }

    return (
      <div
        className={`rounded-[8px] bg-[var(--color-surface-raised)] flex items-center justify-center text-[var(--color-text-secondary)] font-semibold ${className}`}
        style={style}
      >
        {fallback?.[0]?.toUpperCase() ?? "?"}
      </div>
    );
  },
);

ClAvatar.displayName = "ClAvatar";
