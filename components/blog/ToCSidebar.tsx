"use client";

import { useEffect, useState } from "react";

interface ToCItem {
  id: string;
  text: string;
  level: number;
}

interface ToCSidebarProps {
  items: ToCItem[];
}

export function ToCSidebar({ items }: ToCSidebarProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-120px 0px -80% 0px" },
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  return (
    <aside className="fixed left-5 top-[88px] w-[200px] z-10 hidden lg:block max-[1360px]:w-[160px] max-[1360px]:left-3">
      <div className="font-[family-name:var(--font-body)] font-semibold text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mb-2">
        Contents
      </div>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`block text-[13px] py-1 no-underline border-l-2 border-transparent pl-3 transition-[color,border-color] duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            activeId === item.id
              ? "border-[var(--color-accent)] text-[var(--color-accent)]"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          {item.text}
        </a>
      ))}
    </aside>
  );
}
