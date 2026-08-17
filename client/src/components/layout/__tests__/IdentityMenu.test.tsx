import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserProvider } from "../../../context/UserContext";
import { IdentityMenu } from "../IdentityMenu";

function renderMenu() {
  return render(
    <UserProvider>
      <IdentityMenu />
    </UserProvider>,
  );
}

describe("IdentityMenu", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to an unset name and the Developer role", () => {
    renderMenu();
    expect(screen.getByText("Set your name")).toBeInTheDocument();
    expect(screen.getByText("Developer")).toBeInTheDocument();
  });

  it("loads a previously saved identity from localStorage", () => {
    localStorage.setItem("claritas-identity", JSON.stringify({ name: "Riley", role: "Product Owner" }));
    renderMenu();
    expect(screen.getByText("Riley")).toBeInTheDocument();
    expect(screen.getByText("Product Owner")).toBeInTheDocument();
  });

  it("opens the panel, edits the name and role, and saves — updating the trigger and persisting", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: /set your name/i }));

    expect(screen.getByText("YOUR IDENTITY")).toBeInTheDocument();

    const nameInput = screen.getByLabelText("Name");
    await user.type(nameInput, "Riley Customer");
    await user.click(screen.getByRole("radio", { name: /business end user/i }));
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    // Panel closes and the trigger reflects the new identity.
    expect(screen.queryByText("YOUR IDENTITY")).not.toBeInTheDocument();
    expect(screen.getByText("Riley Customer")).toBeInTheDocument();
    expect(screen.getByText("Business End User")).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem("claritas-identity") ?? "{}");
    expect(stored).toEqual({ name: "Riley Customer", role: "Business End User" });
  });

  it("trims whitespace from the name on save", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: /set your name/i }));
    await user.type(screen.getByLabelText("Name"), "  Riley  ");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(screen.getByText("Riley")).toBeInTheDocument();
  });

  it("discards unsaved edits when the panel is closed by clicking the trigger again", async () => {
    const user = userEvent.setup();
    renderMenu();

    const trigger = screen.getByRole("button", { name: /set your name/i });
    await user.click(trigger);
    await user.type(screen.getByLabelText("Name"), "Not saved");
    // The trigger's own accessible name is still "Set your name" here —
    // only handleSave commits the draft, so closing this way (without
    // saving) must discard it.
    await user.click(trigger);

    expect(screen.getByText("Set your name")).toBeInTheDocument();
  });
});
