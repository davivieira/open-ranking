import { create } from "zustand";
import { apiClient } from "../lib/apiClient";
import { useAuthStore } from "./authStore";

export type Score = {
  id: number;
  athlete: {
    id: number;
    name: string;
    gender: string;
    level: string;
    doubles_level: string;
  };
  partner?: {
    id: number;
    name: string;
    gender: string;
    level: string;
    doubles_level: string;
  } | null;
  competition_id: number;
  phase_id: number | null;
  event_id: number;
  level: string;
  time_seconds: number | null;
  reps_points: number | null;
  rank_within_level: number | null;
  points_awarded: number | null;
};

export type AddScoreResult =
  | { ok: true; createdScore: Score }
  | { ok: false };

type ScoresState = {
  scores: Score[];
  isLoading: boolean;
  error: string | null;
  fetchScores: (eventId: number, level?: string) => Promise<void>;
  addScore: (payload: unknown) => Promise<AddScoreResult>;
  deleteScore: (scoreId: number, eventId: number) => Promise<boolean>;
};

export const useScoresStore = create<ScoresState>((set, get) => ({
  scores: [],
  isLoading: false,
  error: null,
  async fetchScores(eventId: number, level?: string) {
    const { accessToken } = useAuthStore.getState();
    set({ isLoading: true, error: null });
    try {
      const query = level ? `?level=${encodeURIComponent(level)}` : "";
      const data = await apiClient.get<Score[]>(
        `/scores/events/${eventId}${query}`,
        { token: accessToken },
      );
      set({ scores: data, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load scores";
      set({ error: message, isLoading: false });
    }
  },
  async addScore(payload: unknown) {
    const { accessToken } = useAuthStore.getState();
    set({ isLoading: true, error: null });
    try {
      const created = await apiClient.post<Score>("/scores", payload, { token: accessToken });
      const eventId = (payload as { event_id?: number }).event_id;
      if (eventId) {
        await get().fetchScores(eventId);
      } else {
        set({ isLoading: false });
      }
      return { ok: true, createdScore: created };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add score";
      set({ error: message, isLoading: false });
      return { ok: false };
    }
  },
  async deleteScore(scoreId: number, eventId: number): Promise<boolean> {
    const { accessToken } = useAuthStore.getState();
    set({ isLoading: true, error: null });
    try {
      await apiClient.delete(`/scores/${scoreId}`, { token: accessToken });
      await get().fetchScores(eventId);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete score";
      set({ error: message, isLoading: false });
      return false;
    }
  },
}));

