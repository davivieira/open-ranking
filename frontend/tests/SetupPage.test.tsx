import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SetupPage } from "../src/pages/admin/SetupPage";
import { renderWithProviders } from "./test-utils";
import * as apiClientModule from "../src/lib/apiClient";
import * as authStoreModule from "../src/state/authStore";

describe("SetupPage", () => {
  it("renders basic admin setup cards", async () => {
    vi.spyOn(authStoreModule, "useAuthStore").mockReturnValue({
      accessToken: "token",
    } as any);

    vi.spyOn(apiClientModule.apiClient, "get").mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    renderWithProviders(<SetupPage />);

    expect(await screen.findByText(/New competition/i)).toBeInTheDocument();
    expect(screen.getByText(/New phase/i)).toBeInTheDocument();
    expect(screen.getByText(/New event/i)).toBeInTheDocument();
  });
});

