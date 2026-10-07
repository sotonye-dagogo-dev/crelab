import { describe, it, expect, vi } from "vitest";
import {
  installErrorLogBuffer,
  getErrorLogEntries,
  clearErrorLogEntries,
  isErrorLogBufferInstalled,
  MAX_ERROR_LOG_ENTRIES,
} from "@/lib/error-log-buffer";

type FakeConsole = Pick<Console, "log" | "info" | "warn" | "error" | "debug">;

function makeConsole(): FakeConsole {
  return {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

describe("error-log-buffer — capture", () => {
  it("records level, time and message for every captured console call", () => {
    const fake = makeConsole();
    expect(installErrorLogBuffer(fake)).toBe(true);

    fake.warn("careful", { code: 7 });
    fake.log("plain message");

    const entries = getErrorLogEntries(fake);
    expect(entries).toHaveLength(2);
    expect(entries[0].level).toBe("warn");
    expect(entries[0].message).toBe('careful {"code":7}');
    expect(entries[1].level).toBe("log");
    expect(entries[1].message).toBe("plain message");
    for (const entry of entries) {
      expect(Number.isNaN(Date.parse(entry.time))).toBe(false);
    }
  });

  it("records error instances as name + message", () => {
    const fake = makeConsole();
    installErrorLogBuffer(fake);

    fake.error(new TypeError("boom"));

    expect(getErrorLogEntries(fake)[0].message).toBe("TypeError: boom");
  });

  it("calls through to the original console methods", () => {
    const fake = makeConsole();
    const infoSpy = fake.info;
    const debugSpy = fake.debug;
    installErrorLogBuffer(fake);

    fake.info("hello");
    fake.debug("world");

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(debugSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith("hello");
    expect(debugSpy).toHaveBeenCalledWith("world");
  });

  it("tolerates circular structures without throwing", () => {
    const fake = makeConsole();
    installErrorLogBuffer(fake);

    const circular: Record<string, unknown> = { id: 1 };
    circular.self = circular;

    expect(() => fake.log(circular)).not.toThrow();
    const entries = getErrorLogEntries(fake);
    expect(entries).toHaveLength(1);
    expect(entries[0].message.length).toBeGreaterThan(0);
  });

  it("returns a copy of the entries so callers cannot mutate the buffer", () => {
    const fake = makeConsole();
    installErrorLogBuffer(fake);
    fake.log("kept");

    const snapshot = getErrorLogEntries(fake);
    snapshot.push({ level: "log", time: new Date().toISOString(), message: "injected" });

    expect(getErrorLogEntries(fake)).toHaveLength(1);
  });
});

describe("error-log-buffer — ring eviction", () => {
  it("keeps only the last 60 entries, dropping the oldest first", () => {
    const fake = makeConsole();
    const warnSpy = fake.warn;
    installErrorLogBuffer(fake);

    for (let i = 0; i < MAX_ERROR_LOG_ENTRIES + 5; i++) {
      fake.warn(`entry ${i}`);
    }

    const entries = getErrorLogEntries(fake);
    expect(entries).toHaveLength(MAX_ERROR_LOG_ENTRIES);
    expect(entries[0].message).toBe("entry 5");
    expect(entries[entries.length - 1].message).toBe(`entry ${MAX_ERROR_LOG_ENTRIES + 4}`);
    expect(warnSpy).toHaveBeenCalledTimes(MAX_ERROR_LOG_ENTRIES + 5);
  });
});

describe("error-log-buffer — idempotent install", () => {
  it("installs once and never double-wraps", () => {
    const fake = makeConsole();

    expect(isErrorLogBufferInstalled(fake)).toBe(false);
    expect(installErrorLogBuffer(fake)).toBe(true);
    expect(isErrorLogBufferInstalled(fake)).toBe(true);

    expect(installErrorLogBuffer(fake)).toBe(false);
    expect(installErrorLogBuffer(fake)).toBe(false);

    fake.warn("once only");
    expect(getErrorLogEntries(fake)).toHaveLength(1);
  });

  it("stays idempotent when the module is re-evaluated (HMR / duplicate copy)", async () => {
    const fresh = makeConsole();
    expect(installErrorLogBuffer(fresh)).toBe(true);

    vi.resetModules();
    const reloaded = await import("@/lib/error-log-buffer");

    expect(reloaded.installErrorLogBuffer(fresh)).toBe(false);
    fresh.log("still only once");

    expect(reloaded.getErrorLogEntries(fresh)).toHaveLength(1);
    expect(reloaded.getErrorLogEntries(fresh)[0].message).toBe("still only once");
  });

  it("clears buffered entries on demand", () => {
    const fake = makeConsole();
    installErrorLogBuffer(fake);

    fake.log("one");
    fake.log("two");
    expect(getErrorLogEntries(fake)).toHaveLength(2);

    clearErrorLogEntries(fake);
    expect(getErrorLogEntries(fake)).toHaveLength(0);
  });
});
