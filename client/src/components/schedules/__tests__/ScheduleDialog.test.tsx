import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScheduleDialog } from "../ScheduleDialog";
import type { ScheduleInput } from "../../../api/schedules";
import type { ScheduleRecord, Spec } from "../../../types";

// The preview comes from the server, so the dialog's own behaviour is what's
// under test here, not cron maths — that's covered in the server's cadence tests.
vi.mock("../../../api/schedules", async () => {
  const actual = await vi.importActual<typeof import("../../../api/schedules")>("../../../api/schedules");
  return {
    ...actual,
    previewCadence: vi.fn(async () => ({
      description: "Every day at 09:00",
      nextRuns: ["2026-09-12T14:00:00.000Z"],
    })),
  };
});

const { previewCadence } = await import("../../../api/schedules");

const SPECS: Spec[] = [
  { id: "auth", fileName: "auth.spec.ts", title: "auth" },
  { id: "booking-flow", fileName: "booking-flow.spec.ts", title: "Booking Flow" },
];

function baseProps() {
  return {
    schedule: null,
    specs: SPECS,
    emailConfigured: true,
    onSave: vi.fn(async (_input: ScheduleInput) => {}),
    onClose: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ScheduleDialog", () => {
  it("shows the server's plain-English description of the cadence", async () => {
    render(<ScheduleDialog {...baseProps()} />);

    expect(await screen.findByText("Every day at 09:00")).toBeInTheDocument();
    expect(previewCadence).toHaveBeenCalled();
  });

  it("saves a new schedule with what was filled in", async () => {
    const props = baseProps();
    const user = userEvent.setup();
    render(<ScheduleDialog {...props} />);

    await user.type(screen.getByPlaceholderText("e.g. Weekday live smoke"), "Nightly live");
    await user.click(screen.getByRole("radio", { name: "Weekdays" }));
    await user.click(screen.getByRole("radio", { name: "Local" }));
    await user.click(screen.getByRole("button", { name: "Create schedule" }));

    await waitFor(() => expect(props.onSave).toHaveBeenCalledTimes(1));
    expect(props.onSave.mock.calls[0][0]).toMatchObject({
      name: "Nightly live",
      cadence: { type: "weekdays", hour: 9, minute: 0 },
      environment: "local",
      specSelection: { mode: "all", specIds: [] },
      enabled: true,
    });
  });

  it("swaps to a cron box for a custom cadence", async () => {
    const user = userEvent.setup();
    render(<ScheduleDialog {...baseProps()} />);

    expect(screen.queryByPlaceholderText("0 9 * * 1-5")).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Custom" }));

    expect(screen.getByPlaceholderText("0 9 * * 1-5")).toBeInTheDocument();
  });

  it("only offers the spec checklist once specific specs are chosen", async () => {
    const props = baseProps();
    const user = userEvent.setup();
    render(<ScheduleDialog {...props} />);

    expect(screen.getByText(/Runs every spec in the suite \(2\)/)).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Specific specs" }));
    await user.click(screen.getByRole("checkbox", { name: /Booking Flow/ }));
    await user.click(screen.getByRole("button", { name: "Create schedule" }));

    await waitFor(() => expect(props.onSave).toHaveBeenCalled());
    expect(props.onSave.mock.calls[0][0].specSelection).toEqual({ mode: "specific", specIds: ["booking-flow"] });
  });

  it("warns that an address won't be used while email is unconfigured", async () => {
    const user = userEvent.setup();
    render(<ScheduleDialog {...baseProps()} emailConfigured={false} />);

    await user.type(screen.getByPlaceholderText("name@example.com"), "team@example.com");

    expect(screen.getByText(/Email isn't set up on the server yet/)).toBeInTheDocument();
  });

  it("loads an existing schedule into the form for editing", async () => {
    const schedule: ScheduleRecord = {
      id: "sched_1",
      name: "Hourly smoke",
      cadence: { type: "hourly", minute: 15 },
      timeZone: "America/Chicago",
      environment: "live",
      specSelection: { mode: "specific", specIds: ["auth"] },
      emailTo: "team@example.com",
      enabled: false,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      description: "Every hour at :15",
      nextRunAt: null,
    };

    render(<ScheduleDialog {...baseProps()} schedule={schedule} />);

    expect(screen.getByDisplayValue("Hourly smoke")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Hourly" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByDisplayValue("15")).toBeInTheDocument();
    expect(screen.getByDisplayValue("team@example.com")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Enabled" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("shows the server's complaint when a cadence can't be understood", async () => {
    vi.mocked(previewCadence).mockRejectedValueOnce(
      Object.assign(new Error('"nope" isn\'t a valid cron expression'), { status: 400, name: "ApiError" }),
    );
    render(<ScheduleDialog {...baseProps()} />);

    expect(await screen.findByText(/Couldn't work out when this would run|isn't a valid cron/)).toBeInTheDocument();
  });
});
