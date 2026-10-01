import { createContext, useContext } from "react";

/**
<<<<<<< HEAD
 * Placeholder auth for the prototype: real endpoint gets wired in later,
 * but every screen already talks to useAuth() so the swap should be a
 * one-file change in AuthProvider.
=======
 * Auth context. `setUser` is exposed so screens that legitimately change
 * their own profile data (staff self-service details, 0013) can update
 * the cached user object without a full re-login.
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
 */
export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
