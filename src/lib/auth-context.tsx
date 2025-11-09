import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useAuth() {
  const { signIn, signOut } = useAuthActions();
  const currentUser = useQuery(api.users.getCurrentUser);
  const isLoading = currentUser === undefined;

  return {
    user: currentUser,
    isLoading,
    signIn: async (email: string, password: string) => {
      await signIn("password", { email, password, flow: "signIn" });
    },
    signUp: async (email: string, password: string, name: string) => {
      await signIn("password", { email, password, name, flow: "signUp" });
    },
    signOut,
  };
}
