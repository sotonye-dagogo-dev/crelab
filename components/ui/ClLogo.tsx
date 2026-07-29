"use client";

import Image from "next/image";
import Link from "next/link";
import { usePlatformConfig } from "@/lib/config-context";

type ClLogoProps = {
  variant?: "full" | "icon" | "auto";
  href?: string;
  showName?: boolean;
  className?: string;
  iconWidth?: number;
  iconHeight?: number;
  logoWidth?: number;
  logoHeight?: number;
  priority?: boolean;
};

export function ClLogo({
  variant = "auto",
  href,
  showName = false,
  className = "",
  iconWidth = 28,
  iconHeight = 28,
  logoWidth = 120,
  logoHeight = 32,
  priority = false,
}: ClLogoProps) {
  const { name, logoPath, iconPath } = usePlatformConfig();

  const isFull = variant === "full";
  const isIcon = variant === "icon";

  const content = (
    <div className={`flex items-center gap-[10px] ${className}`}>
      {(isFull || variant === "auto") && (
        <Image
          src={isFull ? logoPath : iconPath}
          alt={name}
          width={isFull ? logoWidth : iconWidth}
          height={isFull ? logoHeight : iconHeight}
          className={`${isFull ? "h-8 w-auto rounded-lg" : "rounded-xl"}`}
          priority={priority}
        />
      )}
      {isIcon && (
        <Image
          src={iconPath}
          alt={name}
          width={iconWidth}
          height={iconHeight}
          className="rounded-xl"
          priority={priority}
        />
      )}
      {showName && (
        <span className="font-[family-name:var(--font-display)] font-extrabold text-[var(--color-text-primary)]">
          {name}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="flex items-center no-underline">
        {content}
      </Link>
    );
  }

  return content;
}