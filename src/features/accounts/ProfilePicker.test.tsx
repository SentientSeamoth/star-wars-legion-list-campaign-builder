import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ProfilePicker from "./ProfilePicker";
import * as accountsApi from "../../lib/api/accounts";

// Real coverage goal for this suite: prove the vitest+jsdom+RTL pipeline
// actually renders a real component tree (not just pure functions), and
// exercises one real user flow -- create a profile and confirm onSelect
// fires with the new profile's id. `lib/api/accounts.ts` is mocked since
// its functions call Tauri's invoke(), which doesn't exist outside a real
// Tauri webview.
vi.mock("../../lib/api/accounts");

describe("ProfilePicker", () => {
  it("shows existing profiles once loaded", async () => {
    vi.mocked(accountsApi.listUsers).mockResolvedValue([
      { id: "user-1", display_name: "Ahsoka", created_at: "2026-01-01T00:00:00.000Z" },
    ]);

    render(<ProfilePicker onSelect={() => {}} />);

    expect(await screen.findByText("Ahsoka")).toBeInTheDocument();
  });

  it("creates a new profile and calls onSelect with its id", async () => {
    vi.mocked(accountsApi.listUsers).mockResolvedValue([]);
    vi.mocked(accountsApi.createUser).mockResolvedValue({
      id: "user-new",
      display_name: "Rex",
      created_at: "2026-01-01T00:00:00.000Z",
    });
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<ProfilePicker onSelect={onSelect} />);
    await waitFor(() => expect(accountsApi.listUsers).toHaveBeenCalled());

    await user.type(screen.getByPlaceholderText("Profile name"), "Rex");
    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith("user-new"));
    expect(accountsApi.createUser).toHaveBeenCalledWith("Rex");
  });
});
