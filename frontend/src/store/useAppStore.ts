// frontend/src/store/useAppStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserProfile {
  id?: number;
  name?: string;
  email?: string;
  height_cm: number;
  weight_kg: number;
  age: number;
  gender: "male" | "female" | "other";
  goal: "lose" | "maintain" | "gain";
  activity_lvl: number;
  diet_pref: string;
  fitness_level: "beginner" | "intermediate" | "advanced";
}

export interface BMIResult {
  bmi: number;
  category: string;
  color: string;
  bmr: number;
  tdee: number;
  target_calories: number;
  macros: {
    protein_pct: number;
    carbs_pct: number;
    fats_pct: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
  };
  advice: string;
}

interface AppState {
  // active tab
  activeTab: "bmi" | "posture" | "plan" | "chat" | "analytics";
  setActiveTab: (tab: AppState["activeTab"]) => void;

  // user profile
  profile: Partial<UserProfile>;
  setProfile: (p: Partial<UserProfile>) => void;

  // bmi result
  bmiResult: BMIResult | null;
  setBmiResult: (r: BMIResult | null) => void;

  // chat session
  sessionId: string;

  // loading states
  isCalculating: boolean;
  setIsCalculating: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeTab: "bmi",
      setActiveTab: (tab) => set({ activeTab: tab }),

      profile: {
        activity_lvl: 1.55,
        diet_pref: "balanced",
        fitness_level: "beginner",
      },
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),

      bmiResult: null,
      setBmiResult: (r) => set({ bmiResult: r }),

      sessionId: typeof crypto !== "undefined"
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),

      isCalculating: false,
      setIsCalculating: (v) => set({ isCalculating: v }),
    }),
    {
      name: "fitai-store",
      partialize: (state) => ({
        profile: state.profile,
        bmiResult: state.bmiResult,
        sessionId: state.sessionId,
      }),
    }
  )
);
