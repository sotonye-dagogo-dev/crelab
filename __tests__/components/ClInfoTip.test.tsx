// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ClInfoTip } from "@/components/ui/ClInfoTip";

afterEach(cleanup);

describe("ClInfoTip", () => {
  it("renders a focusable trigger button with the accessible label", () => {
    render(<ClInfoTip label="About fees">Fee copy</ClInfoTip>);
    const trigger = screen.getByRole("button", { name: "About fees" });
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute("type")).toBe("button");
  });

  it("defaults the accessible label to 'More info' when none is given", () => {
    render(<ClInfoTip>Copy</ClInfoTip>);
    expect(screen.getByRole("button", { name: "More info" })).toBeTruthy();
  });

  it("renders the tooltip body with role=tooltip (present for screen readers)", () => {
    render(<ClInfoTip label="About escrow">Your funds are held securely.</ClInfoTip>);
    const tip = screen.getByRole("tooltip");
    expect(tip.textContent).toContain("Your funds are held securely.");
  });

  it("renders exactly one trigger and one tooltip (no duplication)", () => {
    render(<ClInfoTip label="About release">Release copy</ClInfoTip>);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getAllByRole("tooltip")).toHaveLength(1);
  });

  it("accepts node children (not just plain text)", () => {
    render(
      <ClInfoTip label="About wallet">
        <span data-testid="rich">Rich</span> copy
      </ClInfoTip>,
    );
    expect(screen.getByTestId("rich")).toBeTruthy();
    expect(screen.getByRole("tooltip").textContent).toContain("Rich");
  });
});
