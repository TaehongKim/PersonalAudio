import { useSession as useNextAuthSession, signIn, signOut } from "next-auth/react";

export function useSession() {
  const { data: session, status } = useNextAuthSession();
  
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const isLoggedIn = status === "authenticated";
  
  return {
    session,
    isLoading,
    isAuthenticated,
    isLoggedIn,
    signIn,
    signOut,
  };
} 