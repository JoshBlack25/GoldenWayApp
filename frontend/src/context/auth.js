import { createContext, useContext } from "react";

/**
 * Auth context. `setUser` is exposed so screens that legitimately change
 * their own profile data (staff self-service details, 0013) can update
 * the cached user object without a full re-login.
 */
export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
