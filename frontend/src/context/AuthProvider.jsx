import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./auth";
import { supabase } from "../lib/supabaseClient";
import {
  fetchMyCommuterProfile,
<<<<<<< HEAD
  loginCommuter,
  logoutCommuter,
  registerCommuter,
  deleteMyAccount,
=======
  logoutCommuter,
  registerCommuter,
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
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
<<<<<<< HEAD
=======
 *
 * Commuter profile creation (0017) now happens server-side via the
 * on_auth_user_commuter_signup trigger, reading signUp()'s metadata —
 * not a client-side RPC call — because Confirm Email means no session
 * exists yet at signup time. A commuter who claimed an existing Gold
 * Card at signup carries pending_card_number in that same metadata;
 * we link it here, once, on their first confirmed login.
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
 */
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
<<<<<<< HEAD
        const { data: { session } } = await supabase.auth.getSession();
=======
        const {
          data: { session },
        } = await supabase.auth.getSession();
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
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
<<<<<<< HEAD
=======
            phone: profileType.phone ?? null,
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
          });
          return;
        }
        if (profileType === null || profileType.userType === "COMMUTER") {
          const profile = await fetchMyCommuterProfile();
<<<<<<< HEAD
          if (!cancelled) setUser(profile);
=======
          if (cancelled) return;
          setUser(profile);

          // One-time link of a Gold Card claimed at signup (0017). Read
          // from auth metadata, not the mapped profile — mapCommuterRow
          // doesn't expose id_number, and this only needs to run once.
          const pendingCard = session.user.user_metadata?.pending_card_number;
          if (pendingCard) {
            try {
              await supabase.rpc("link_existing_card", {
                p_card_number: pendingCard,
                p_id_number: session.user.user_metadata?.id_number,
              });
            } catch {
              /* best-effort — a failed link shouldn't block login */
            } finally {
              await supabase.auth.updateUser({
                data: { pending_card_number: null },
              });
            }
          }
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
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
<<<<<<< HEAD
=======
      // Session-expiry path: Supabase emits SIGNED_OUT itself when the
      // refresh token is rejected, but a failed silent refresh surfaces
      // here first. Either way, a dead session drops the user to /login
      // on the next protected navigation (ProtectedRoute sees user=null).
      if (event === "TOKEN_REFRESHED") {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) setUser(null);
        });
      }
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
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
<<<<<<< HEAD
        throw new ApiError(403, { error: "This staff account has been deactivated. Contact a GoldenWay admin." });
      }
      const staffUser = { isStaff: true, ...result.staff };
=======
        throw new ApiError(403, {
          error:
            "This staff account has been deactivated. Contact a GoldenWay admin.",
        });
      }
      const staffUser = {
        isStaff: true,
        ...result.staff,
        phone: result.staff.phone ?? null,
      };
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
      setUser(staffUser);
      return staffUser;
    }

    const profile = await fetchMyCommuterProfile();
<<<<<<< HEAD
    if (!profile) throw new ApiError(401, { error: "No commuter profile for this account" });
=======
    if (!profile)
      throw new ApiError(401, {
        error: "No commuter profile for this account",
      });
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
    setUser(profile);
    return profile;
  }, []);

<<<<<<< HEAD
  const register = useCallback(async (payload) => {
    const profile = await registerCommuter(payload);
    setUser(profile);
    return profile;
=======
  /**
   * registerCommuter (0017) no longer returns a live profile — Confirm
   * Email means no session exists until the user clicks the email link.
   * Callers (RegisterScreen) should navigate to a "check your email"
   * screen after this resolves, not assume `user` is now set.
   */
  const register = useCallback(async (payload) => {
    await registerCommuter(payload);
    return null;
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
  }, []);

  const logout = useCallback(async () => {
    await logoutCommuter();
    setUser(null);
  }, []);

<<<<<<< HEAD
  const deleteAccount = useCallback(async () => {
    await deleteMyAccount();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, login, register, logout, deleteAccount }),
    [user, initializing, login, register, logout, deleteAccount],
=======
  const value = useMemo(
    () => ({ user, initializing, login, register, logout, setUser }),
    [user, initializing, login, register, logout],
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
