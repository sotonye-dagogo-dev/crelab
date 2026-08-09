import type { IDashboardAvailabilitySlot } from "@/types";

const statusStyles: Record<IDashboardAvailabilitySlot["status"], string> = {
  AVAILABLE: "border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]",
  BOOKED: "border-[var(--color-accent)] bg-[var(--color-accent-muted)] text-[var(--color-accent)]",
  PAST: "border-[var(--color-border)] bg-transparent text-[var(--color-text-tertiary)]",
};

const statusLabels: Record<IDashboardAvailabilitySlot["status"], string> = {
  AVAILABLE: "Available",
  BOOKED: "Booked",
  PAST: "Past",
};

export function AvailabilityCalendar({ slots }: { slots: IDashboardAvailabilitySlot[] }) {
  if (slots.length === 0) {
    return (
      <div className="text-center py-8 text-[13px] text-[var(--color-text-tertiary)]">
        Availability calendar is not configured yet.
      </div>
    );
  }

  const bookedCount = slots.filter((s) => s.status === "BOOKED").length;

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 text-[12px] text-[var(--color-text-secondary)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[4px] border border-[var(--color-border)] bg-[var(--color-surface-raised)]" />
          Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[4px] border border-[var(--color-accent)] bg-[var(--color-accent-muted)]" />
          Booked
        </span>
        <span className="ml-auto">
          {bookedCount} of {slots.length} days booked
        </span>
      </div>

      <div className="grid grid-cols-7 max-[640px]:grid-cols-5 gap-2">
        {slots.map((slot) => {
          const d = new Date(slot.date + "T00:00:00");
          const day = d.toLocaleDateString("en-NG", { day: "numeric" });
          const month = d.toLocaleDateString("en-NG", { month: "short" });
          const isToday = slot.date === new Date().toISOString().slice(0, 10);

          return (
            <div
              key={slot.date}
              title={`${slot.label ?? statusLabels[slot.status]} — ${slot.date}`}
              aria-label={`${slot.date}: ${slot.label ?? statusLabels[slot.status]}`}
              className={`flex flex-col items-center justify-center rounded-[8px] border px-1 py-2 text-center ${statusStyles[slot.status]}`}
            >
              <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-tertiary)]">
                {month}
              </span>
              <span className="text-[15px] font-bold tabular-nums">{day}</span>
              {isToday && (
                <span className="text-[9px] uppercase tracking-wide text-[var(--color-accent)]">
                  today
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
