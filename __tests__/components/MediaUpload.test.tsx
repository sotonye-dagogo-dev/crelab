// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MediaUpload } from "@/components/profile/MediaUpload";

function statusResponse(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    data: {
      enabled: true,
      cloudinaryConfigured: false, // forces the link-only UI (no tab switcher needed)
      maxFileSizeMb: 100,
      videoTypes: ["video/mp4"],
      imageTypes: ["image/png"],
      directUpload: null,
      ...overrides,
    },
  };
}

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/media/status")) {
      return {
        ok: true,
        json: async () => statusResponse(),
      } as Response;
    }
    return { ok: false, json: async () => ({ success: false }) } as Response;
  }) as typeof fetch;
});

afterEach(() => {
  cleanup();
  global.fetch = originalFetch;
});

describe("MediaUpload — Drive link input", () => {
  it("renders exactly ONE Drive link input + submit button (no duplicity)", async () => {
    render(<MediaUpload label="Media" value="" onChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText(/drive\.google\.com/)).toHaveLength(1);
    });
    expect(screen.getAllByRole("button", { name: /use this link/i })).toHaveLength(1);
  });

  it("offers Quick preview for Drive folder links and clears it when the link changes", async () => {
    render(<MediaUpload label="Media" value="" onChange={() => {}} />);

    const input = await screen.findByPlaceholderText(/drive\.google\.com/);
    fireEvent.change(input, { target: { value: "https://drive.google.com/drive/folders/abc123" } });

    // Preview button appears only for Drive-folder-shaped links.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /quick preview/i })).toBeTruthy();
    });

    // A non-Drive link hides the preview button again.
    fireEvent.change(input, { target: { value: "https://example.com/video.mp4" } });
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /quick preview/i })).toBeNull();
    });
  });

  it("submits a valid link exactly once through onChange", async () => {
    const onChange = vi.fn();
    render(<MediaUpload label="Media" value="" onChange={onChange} />);

    const input = await screen.findByPlaceholderText(/drive\.google\.com/);
    fireEvent.change(input, { target: { value: "https://example.com/asset.mp4" } });
    fireEvent.click(screen.getByRole("button", { name: /use this link/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("https://example.com/asset.mp4");
  });

  it("shows the link tab exactly once when Cloudinary is configured", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/media/status")) {
        return {
          ok: true,
          json: async () =>
            statusResponse({
              cloudinaryConfigured: true,
              directUpload: { cloudName: "demo", uploadPreset: "preset" },
            }),
        } as Response;
      }
      return { ok: false, json: async () => ({ success: false }) } as Response;
    }) as typeof fetch;

    render(<MediaUpload label="Media" value="" onChange={() => {}} />);
    const tab = await screen.findByRole("button", { name: /paste link/i });
    fireEvent.click(tab);

    expect(screen.getAllByPlaceholderText(/drive\.google\.com/)).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /use this link/i })).toHaveLength(1);
  });
});
