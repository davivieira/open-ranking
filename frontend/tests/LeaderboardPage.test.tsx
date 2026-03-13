import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LeaderboardPage } from "../src/pages/LeaderboardPage";
import { renderWithProviders } from "./test-utils";
import * as apiClientModule from "../src/lib/apiClient";

describe("LeaderboardPage", () => {
  it("renders loading and then empty state when no entries", async () => {
    const getSpy = vi.spyOn(apiClientModule.apiClient, "get");

    // 1) competition
    getSpy
      .mockResolvedValueOnce({ id: 1, name: "Open 2026", slug: "open-2026", public_slug: "open-2026", type: "OPEN" })
      // 2) phases
      .mockResolvedValueOnce([{ id: 10, competition_id: 1, code: "23.1", name: "Open", order_index: 0 }])
      // 3) events
      .mockResolvedValueOnce([])
      // 4) leaderboard entries
      .mockResolvedValueOnce([]);

    renderWithProviders(<LeaderboardPage />);

    // Initial loading spinner should appear.
    expect(await screen.findByRole("status")).toBeInTheDocument();

    // After data resolves but no entries, show empty message.
    const emptyText = await screen.findByText(/noScores/i);
    expect(emptyText).toBeInTheDocument();

    getSpy.mockRestore();
  });
});

