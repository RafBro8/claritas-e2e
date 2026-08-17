import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpecChecklist } from "../SpecChecklist";
import type { Spec } from "../../../types";

const SPECS: Spec[] = [
  { id: "auth", fileName: "auth.spec.ts", title: "auth" },
  { id: "booking-flow", fileName: "booking-flow.spec.ts", title: "Booking Flow" },
];

function baseProps() {
  return {
    specs: SPECS,
    isLoading: false,
    selectedIds: new Set<string>(),
    onToggle: vi.fn(),
    onSelectAll: vi.fn(),
    onClear: vi.fn(),
  };
}

describe("SpecChecklist", () => {
  it("shows a loading message and no rows while loading", () => {
    render(<SpecChecklist {...baseProps()} isLoading={true} />);
    expect(screen.getByText("Loading specs…")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("shows an empty-state message when there are no specs", () => {
    render(<SpecChecklist {...baseProps()} specs={[]} />);
    expect(screen.getByText("No specs found in the target suite.")).toBeInTheDocument();
  });

  it("renders one row per spec with its title and filename", () => {
    render(<SpecChecklist {...baseProps()} />);
    expect(screen.getByText("auth")).toBeInTheDocument();
    expect(screen.getByText("auth.spec.ts")).toBeInTheDocument();
    expect(screen.getByText("Booking Flow")).toBeInTheDocument();
    expect(screen.getByText("booking-flow.spec.ts")).toBeInTheDocument();
    expect(screen.getByText("Specs (2)")).toBeInTheDocument();
  });

  it("reflects selectedIds in each checkbox's checked state", () => {
    render(<SpecChecklist {...baseProps()} selectedIds={new Set(["auth"])} />);
    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].checked).toBe(false);
  });

  it("calls onToggle with the spec's id when its checkbox is clicked", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<SpecChecklist {...props} />);

    await user.click(screen.getAllByRole("checkbox")[1]);

    expect(props.onToggle).toHaveBeenCalledWith("booking-flow");
  });

  it("calls onSelectAll and onClear from their respective buttons", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<SpecChecklist {...props} selectedIds={new Set(["auth"])} />);

    await user.click(screen.getByRole("button", { name: "Select all" }));
    expect(props.onSelectAll).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(props.onClear).toHaveBeenCalledOnce();
  });

  it("disables Select all when there are no specs, and Clear when nothing is selected", () => {
    const { rerender } = render(<SpecChecklist {...baseProps()} specs={[]} />);
    expect(screen.getByRole("button", { name: "Select all" })).toBeDisabled();

    rerender(<SpecChecklist {...baseProps()} selectedIds={new Set()} />);
    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
  });

  it("disables every checkbox when disabled is true", () => {
    render(<SpecChecklist {...baseProps()} disabled />);
    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).toBeDisabled();
    }
  });
});
