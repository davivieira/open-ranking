import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ScoresPage } from "../src/pages/admin/ScoresPage";
import { renderWithProviders } from "./test-utils";
import * as apiClientModule from "../src/lib/apiClient";
import * as authStoreModule from "../src/state/authStore";
import * as scoresStoreModule from "../src/state/scoresStore";

describe("ScoresPage", () => {
  it("renders scores layout with filters and form", async () => {
    vi.spyOn(authStoreModule, "useAuthStore").mockReturnValue({
      accessToken: "token",
    } as any);

    vi.spyOn(scoresStoreModule, "useScoresStore").mockReturnValue({
      scores: [],
      isLoading: false,
      error: null,
      fetchScores: vi.fn(),
      addScore: vi.fn(),
      deleteScore: vi.fn(),
    } as any);

    const getSpy = vi.spyOn(apiClientModule.apiClient, "get");
    // competitions + athletes initial loads
    getSpy.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    renderWithProviders(<ScoresPage />);

    expect(await screen.findByText(/Event scores/i)).toBeInTheDocument();
    expect(screen.getByText(/Select competition/i)).toBeInTheDocument();

    getSpy.mockRestore();
  });
});

