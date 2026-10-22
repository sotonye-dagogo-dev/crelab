// @vitest-environment jsdom
import React, { useState } from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  ClTabs,
  ClTabsContent,
  ClTabsList,
  ClTabsTrigger,
} from "@/components/ui/ClTabs";

afterEach(cleanup);

function BasicTabs() {
  return (
    <ClTabs defaultValue="branding">
      <ClTabsList ariaLabel="Config sections">
        <ClTabsTrigger value="branding">Branding</ClTabsTrigger>
        <ClTabsTrigger value="email">Email</ClTabsTrigger>
        <ClTabsTrigger value="media">Media</ClTabsTrigger>
      </ClTabsList>
      <ClTabsContent value="branding">Branding panel</ClTabsContent>
      <ClTabsContent value="email">Email panel</ClTabsContent>
      <ClTabsContent value="media">Media panel</ClTabsContent>
    </ClTabs>
  );
}

describe("ClTabs", () => {
  it("exposes tablist/tab/tabpanel semantics with only the active panel rendered", () => {
    render(<BasicTabs />);

    expect(screen.getByRole("tablist", { name: "Config sections" })).toBeTruthy();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[1].getAttribute("aria-selected")).toBe("false");
    expect(screen.getByRole("tabpanel").textContent).toBe("Branding panel");
  });

  it("switches the active panel on click", () => {
    render(<BasicTabs />);

    fireEvent.click(screen.getByRole("tab", { name: "Email" }));

    expect(screen.getByRole("tab", { name: "Email" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toBe("Email panel");
  });

  it("moves and activates tabs with arrow, Home and End keys", () => {
    render(<BasicTabs />);
    const [branding, email, media] = screen.getAllByRole("tab");

    branding.focus();
    fireEvent.keyDown(branding, { key: "ArrowRight" });
    expect(email.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(email);

    fireEvent.keyDown(email, { key: "End" });
    expect(media.getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(media, { key: "Home" });
    expect(branding.getAttribute("aria-selected")).toBe("true");
  });

  it("supports controlled usage without mutating itself", () => {
    const onValueChange = vi.fn();

    function Controlled() {
      const [value, setValue] = useState("branding");
      return (
        <ClTabs
          value={value}
          onValueChange={(next) => {
            onValueChange(next);
            setValue(next);
          }}
        >
          <ClTabsList ariaLabel="Controlled sections">
            <ClTabsTrigger value="branding">Branding</ClTabsTrigger>
            <ClTabsTrigger value="email">Email</ClTabsTrigger>
          </ClTabsList>
          <ClTabsContent value="branding">Branding panel</ClTabsContent>
          <ClTabsContent value="email">Email panel</ClTabsContent>
        </ClTabs>
      );
    }

    render(<Controlled />);
    fireEvent.click(screen.getByRole("tab", { name: "Email" }));

    expect(onValueChange).toHaveBeenCalledWith("email");
    expect(screen.getByRole("tabpanel").textContent).toBe("Email panel");
  });

  it("scrolls the tab list horizontally instead of squashing overflow", () => {
    render(<BasicTabs />);
    const list = screen.getByRole("tablist");
    expect(list.className).toContain("overflow-x-auto");
  });
});
