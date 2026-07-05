"use client";

import { PortableText } from "@portabletext/react";
import type { PortableTextComponents } from "@portabletext/react";

const components: PortableTextComponents = {
  block: {
    h2: ({ children, value }) => {
      const id = value._key ?? (typeof children === "string" ? children?.toString().toLowerCase().replace(/\s+/g, "-") : undefined);
      return (
        <h2
          id={id ? `sec-${id}` : undefined}
          className="font-[family-name:var(--font-display)] font-bold text-[24px] text-[var(--color-text-primary)] mt-9 mb-3 leading-tight tracking-[-0.01em]"
        >
          {children}
        </h2>
      );
    },
    h3: ({ children, value }) => {
      const id = value._key ?? (typeof children === "string" ? children?.toString().toLowerCase().replace(/\s+/g, "-") : undefined);
      return (
        <h3
          id={id ? `sec-${id}` : undefined}
          className="font-[family-name:var(--font-display)] font-bold text-[20px] text-[var(--color-text-primary)] mt-8 mb-2 leading-tight tracking-[-0.01em]"
        >
          {children}
        </h3>
      );
    },
    blockquote: ({ children }) => (
      <blockquote className="border-l-[3px] border-[var(--color-accent)] pl-5 my-6">
        <p className="font-[family-name:var(--font-body)] text-[16px] text-[var(--color-text-secondary)] italic mb-0">
          {children}
        </p>
      </blockquote>
    ),
    normal: ({ children }) => (
      <p className="font-[family-name:var(--font-body)] text-[18px] text-[var(--color-text-secondary)] leading-relaxed mb-[1.2em] max-sm:text-[16px]">
        {children}
      </p>
    ),
  },
  marks: {
    code: ({ children }) => (
      <code className="font-[family-name:var(--font-mono)] bg-[var(--color-surface-raised)] px-1.5 py-0.5 rounded text-[0.9em]">
        {children}
      </code>
    ),
    link: ({ children, value }) => (
      <a
        href={value?.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--color-accent)] underline underline-offset-2 hover:text-[var(--color-accent-dim)]"
      >
        {children}
      </a>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="font-[family-name:var(--font-body)] text-[18px] text-[var(--color-text-secondary)] leading-relaxed mb-[1.2em] pl-6 list-disc max-sm:text-[16px]">
        {children}
      </ul>
    ),
  },
  types: {
    image: ({ value }) => (
      <figure className="my-6">
        <img
          src={value?.asset?.url ?? ""}
          alt={value?.alt ?? ""}
          className="w-full rounded-[12px]"
        />
      </figure>
    ),
  },
};

interface ArticleBodyProps {
  content: unknown[];
}

export function ArticleBody({ content }: ArticleBodyProps) {
  return (
    <div className="article-body">
      <PortableText value={content} components={components} />
    </div>
  );
}
