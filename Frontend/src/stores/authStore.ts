import { create } from "zustand";
import { persist } from "zustand/middleware";
import { loginApi, signupApi, logoutApi } from "@/lib/api";

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;

  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      isAuthenticated: false,
      loading: false,

      login: async (email, password) => {
        set({ loading: true });
        try {
          const res = await loginApi(email, password);
          const token = res.access_token;

          set({
            token,
            isAuthenticated: true,
            loading: false,
          });
        } catch (err) {
          set({ loading: false });
          throw err;
        }
      },

      signup: async (email, password, fullName) => {
        set({ loading: true });
        try {
          await signupApi(email, password, fullName);

          // auto-login after signup
          const res = await loginApi(email, password);
          const token = res.access_token;

          set({
            token,
            isAuthenticated: true,
            loading: false,
          });
        } catch (err) {
          set({ loading: false });
          throw err;
        }
      },

      logout: () => {
        logoutApi();
        set({
          token: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: "bullseye-auth", // storage key
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
