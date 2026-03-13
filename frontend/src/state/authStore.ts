import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiClient } from "../lib/apiClient";

type User = {
  id: number;
  email: string;
  role: string;
};

type AuthState = {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      error: null,
      async login(email: string, password: string) {
        set({ isLoading: true, error: null });
        try {
          const result = await apiClient.post<{
            access_token: string;
            user: User;
          }>("/auth/login", { email, password });

          set({
            user: result.user,
            accessToken: result.access_token,
            isLoading: false,
            error: null,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Login failed";
          set({ error: message, isLoading: false });
        }
      },
      async register(email: string, password: string) {
        set({ isLoading: true, error: null });
        try {
          const result = await apiClient.post<{
            access_token: string;
            user: User;
          }>("/auth/register", { email, password });

          set({
            user: result.user,
            accessToken: result.access_token,
            isLoading: false,
            error: null,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Registration failed";
          set({ error: message, isLoading: false });
        }
      },
      logout() {
        set({ user: null, accessToken: null, error: null });
      },
    }),
    {
      name: "open-ranking-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
    },
  ),
);

