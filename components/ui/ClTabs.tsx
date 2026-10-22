"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("ClTabs sub-components must be rendered inside <ClTabs>.");
  }
  return context;
}

/**
 * Accessible tabs primitive.
 *
 * Supports both uncontrolled (`defaultValue`) and controlled (`value` +
 * `onValueChange`) usage. The tab list scrolls horizontally when it overflows
 * (instead of squashing labels), and arrow/Home/End keys move the active tab.
 */
export function ClTabs({
  defaultValue,
  value,
  onValueChange,
  children,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (tab: string) => void;
  children: ReactNode;
}) {
  const [internalTab, setInternalTab] = useState(defaultValue ?? "");
  const baseId = useId();
  const isControlled = value !== undefined;
  const activeTab = isControlled ? value : internalTab;

  const setActiveTab = useCallback(
    (tab: string) => {
      if (!isControlled) setInternalTab(tab);
      onValueChange?.(tab);
    },
    [isControlled, onValueChange],
  );

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, baseId }}>
      <div className="w-full">{children}</div>
    </TabsContext.Provider>
  );
}

export function ClTabsList({
  children,
  className = "",
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;

    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]:not([disabled])',
      ),
    );
    if (tabs.length === 0) return;

    const currentIndex = tabs.findIndex(
      (tab) => tab === document.activeElement,
    );
    let nextIndex = currentIndex;

    if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else if (event.key === "ArrowRight") {
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % tabs.length;
    } else {
      nextIndex =
        currentIndex <= 0 ? tabs.length - 1 : currentIndex - 1;
    }

    event.preventDefault();
    tabs[nextIndex].focus();
    tabs[nextIndex].click();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={`flex gap-2 overflow-x-auto overscroll-x-contain ${className}`}
    >
      {children}
    </div>
  );
}

export function ClTabsTrigger({
  value,
  children,
  className = "",
  title,
}: {
  value: string;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  const { activeTab, setActiveTab, baseId } = useTabsContext();
  const isActive = activeTab === value;
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isActive) return;
    triggerRef.current?.scrollIntoView?.({
      block: "nearest",
      inline: "nearest",
    });
  }, [isActive]);

  return (
    <button
      ref={triggerRef}
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={isActive ? 0 : -1}
      title={title}
      className={`
        inline-flex items-center justify-center gap-1.5 flex-1 min-w-max whitespace-nowrap
        h-9 px-3 rounded-[8px] text-[13px] font-semibold cursor-pointer
        transition-colors focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2
        focus-visible:ring-offset-[var(--color-bg)]
        ${isActive
          ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]"
          : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        }
        ${className}
      `.trim()}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

export function ClTabsContent({
  value,
  children,
  className = "",
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { activeTab, baseId } = useTabsContext();
  if (activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={`focus-visible:outline-none ${className}`.trim()}
    >
      {children}
    </div>
  );
}
