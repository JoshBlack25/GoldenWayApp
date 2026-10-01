import { createContext, useContext } from "react";

/**
 * Placeholder auth for the prototype: real endpoint gets wired in later,
 * but every screen already talks to useAuth() so the swap should be a
 * one-file change in AuthProvider.
 */
export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
