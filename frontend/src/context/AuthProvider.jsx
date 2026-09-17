import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./auth";
import { supabase } from "../lib/supabaseClient";
import {
  fetchMyCommuterProfile,
  loginCommuter,
  logoutCommuter,
  registerCommuter,
} from "../api/goldenway";
import { fetchMyProfileType, loginAny } from "../api/auth";
import { ApiError } from "../api/client";

/**
 * Auth against Supabase Auth with TWO profile types (FINAL-DEV-PLAN D1):
 *   · COMMUTER → the commuters row (unchanged context shape)
 *   · STAFF    → the staff row resolved via my_profile_type() RPC
 * The context shape (user / login / logout / initializing) is kept, so
 * every screen that reads useAuth() keeps working. `user.isStaff` tells
 * the two surfaces apart; ProtectedRoute still just checks truthiness.
 */
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Which profile is behind this session? (null = pre-0005 DB →
        // fall through to the commuter-only path)
        const profileType = await fetchMyProfileType();
        if (cancelled) return;

        if (profileType?.userType === "STAFF") {
          if (profileType.active === false) {
            await supabase.auth.signOut();
            return;
          }
          setUser({
            isStaff: true,
            role: profileType.role,
            firstName: profileType.firstName,
            surname: profileType.surname,
            email: profileType.email,
            phone: profileType.phone ?? null,
          });
          return;
        }
        if (profileType === null || profileType.userType === "COMMUTER") {
          const profile = await fetchMyCommuterProfile();
          if (!cancelled) setUser(profile);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => {
      cancelled = true;
      subscription?.subscription?.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await loginAny(email, password);

    if (result.profileType === "STAFF") {
      if (!result.staff.active) {
        await supabase.auth.signOut();
        throw new ApiError(403, { error: "This staff account has been deactivated. Contact a GoldenWay admin." });
      }
      const staffUser = { isStaff: true, ...result.staff, phone: result.staff.phone ?? null };
      setUser(staffUser);
      return staffUser;
    }

    const profile = await fetchMyCommuterProfile();
    if (!profile) throw new ApiError(401, { error: "No commuter profile for this account" });
    setUser(profile);
    return profile;
  }, []);

  const register = useCallback(async (payload) => {
    const profile = await registerCommuter(payload);
    setUser(profile);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    await logoutCommuter();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, login, register, logout, setUser }),
    [user, initializing, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
