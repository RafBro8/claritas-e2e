import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FailureBadge } from "../FailureBadge";
import type { FailureAnalysis } from "../../types";

function analysis(overrides: Partial<FailureAnalysis> = {}): FailureAnalysis {
  return { category: "environment", confidence: 0.75, signals: ["Connection refused"], ...overrides };
}

describe("FailureBadge", () => {
  it.each([
    ["environment", "Likely environment issue"],
    ["ui-change", "Likely UI change"],
    ["unknown", "Cause unclear"],
  ] as const)("labels the %s category as %s", (category, label) => {
    render(<FailureBadge analysis={analysis({ category })} />);
    expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
  });

  it("does not show the tooltip until the badge is clicked", () => {
    render(<FailureBadge analysis={analysis()} />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("opens the tooltip on click, showing the confidence and every signal", async () => {
    const user = userEvent.setup();
    render(
      <FailureBadge
        analysis={{ category: "ui-change", confidence: 0.6, signals: ["Signal one", "Signal two"] }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /likely ui change/i }));

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Confidence: 60%");
    expect(tooltip).toHaveTextContent("Signal one");
    expect(tooltip).toHaveTextContent("Signal two");
    expect(tooltip).toHaveTextContent(/always a suggestion/i);
  });

  it("falls back to a placeholder when there are no signals", async () => {
    const user = userEvent.setup();
    render(<FailureBadge analysis={analysis({ signals: [] })} />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByRole("tooltip")).toHaveTextContent("No signals recorded.");
  });

  it("renders the tooltip through a portal into document.body, not nested inside the badge", async () => {
    const user = userEvent.setup();
    const { container } = render(<FailureBadge analysis={analysis()} />);

    await user.click(screen.getByRole("button"));

    const tooltip = screen.getByRole("tooltip");
    expect(container.contains(tooltip)).toBe(false);
    expect(document.body.contains(tooltip)).toBe(true);
  });

  it("toggles closed when the badge is clicked again", async () => {
    const user = userEvent.setup();
    render(<FailureBadge analysis={analysis()} />);

    const badge = screen.getByRole("button");
    await user.click(badge);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    await user.click(badge);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("closes when clicking outside the badge", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">Outside</button>
        <FailureBadge analysis={analysis()} />
      </div>,
    );

    await user.click(screen.getByRole("button", { name: /likely environment issue/i }));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<FailureBadge analysis={analysis()} />);

    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
