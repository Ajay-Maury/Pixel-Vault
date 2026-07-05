import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks ────────────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({
  isAuthenticated: () => true,
  getUserId: () => "user-1",
}));

const api = {
  listMyOwnedGroups: vi.fn(),
  listMyJoinedGroups: vi.fn(),
  listMyInvites: vi.fn(),
  createGroup: vi.fn(),
  acceptInvite: vi.fn(),
  rejectInvite: vi.fn(),
  renameGroup: vi.fn(),
  deleteGroup: vi.fn(),
  searchUsers: vi.fn(),
  inviteToGroup: vi.fn(),
};
vi.mock("@/lib/api", () => api);

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

import Groups from "@/pages/Groups";
import { toast } from "sonner";

function renderPage(ui: React.ReactNode, route = "/groups") {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listMyOwnedGroups.mockResolvedValue([]);
  api.listMyJoinedGroups.mockResolvedValue([]);
  api.listMyInvites.mockResolvedValue([]);
});

// ─── Group creation ────────────────────────────────────────────────────────
describe("Groups — creation", () => {
  it("clips name to 10 chars and calls createGroup", async () => {
    api.createGroup.mockResolvedValue({ id: "g1", name: "friends" });
    renderPage(<Groups />);
    await waitFor(() => expect(api.listMyOwnedGroups).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /new group/i }));
    const input = await screen.findByPlaceholderText(/friends/i);
    fireEvent.change(input, { target: { value: "abcdefghijklmnop" } });
    expect((input as HTMLInputElement).value.length).toBeLessThanOrEqual(10);

    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));
    await waitFor(() => expect(api.createGroup).toHaveBeenCalledTimes(1));
    expect(api.createGroup.mock.calls[0][0].length).toBeLessThanOrEqual(10);
  });
});

// ─── Accept / Reject invites ───────────────────────────────────────────────
describe("Groups — invites accept/reject", () => {
  const invite = {
    id: "inv-1",
    status: "pending",
    invitedAt: new Date().toISOString(),
    group: { id: "g1", name: "photos" },
  };

  it("accepts a pending invite", async () => {
    api.listMyInvites.mockResolvedValue([invite]);
    api.acceptInvite.mockResolvedValue({});
    renderPage(<Groups defaultTab="invites" />, "/invites");

    await screen.findByText("photos");
    fireEvent.click(screen.getByRole("button", { name: /accept/i }));
    await waitFor(() => expect(api.acceptInvite).toHaveBeenCalledWith("inv-1"));
    expect(toast.success).toHaveBeenCalled();
  });

  it("rejects a pending invite", async () => {
    api.listMyInvites.mockResolvedValue([invite]);
    api.rejectInvite.mockResolvedValue({});
    renderPage(<Groups defaultTab="invites" />, "/invites");

    await screen.findByText("photos");
    fireEvent.click(screen.getByRole("button", { name: /reject/i }));
    await waitFor(() => expect(api.rejectInvite).toHaveBeenCalledWith("inv-1"));
  });

  it("shows Open group button for accepted invites", async () => {
    api.listMyInvites.mockResolvedValue([{ ...invite, status: "accepted" }]);
    renderPage(<Groups defaultTab="invites" />, "/invites");
    expect(await screen.findByRole("button", { name: /open group/i })).toBeInTheDocument();
  });
});

// ─── Email validation & debounce (unit) ────────────────────────────────────
describe("Email validation", () => {
  it("rejects invalid emails via zod schema", async () => {
    const { z } = await import("zod");
    const schema = z.string().trim().toLowerCase().email().max(255);
    expect(schema.safeParse("not-an-email").success).toBe(false);
    expect(schema.safeParse("a@b.co").success).toBe(true);
    expect(schema.safeParse("  A@B.CO ").data).toBe("a@b.co");
  });
});

// ─── Debounced value hook ─────────────────────────────────────────────────
describe("useDebouncedValue", () => {
  it("delays updates until quiet period elapses", async () => {
    vi.useFakeTimers();
    const { renderHook, act } = await import("@testing-library/react");
    const { useDebouncedValue } = await import("@/hooks/use-debounced-value");
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 200), {
      initialProps: { v: "a" },
    });
    expect(result.current).toBe("a");
    rerender({ v: "ab" });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe("a");
    act(() => { vi.advanceTimersByTime(150); });
    expect(result.current).toBe("ab");
    vi.useRealTimers();
  });
});
