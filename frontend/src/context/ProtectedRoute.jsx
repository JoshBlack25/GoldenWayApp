import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./auth";

/**
 * Session + role guard (FINAL-DEV-PLAN §4).
 *
 *   <ProtectedRoute>                    → any signed-in user (as before)
 *   <ProtectedRoute staff>              → any active staff member
 *   <ProtectedRoute staff roles={["ADMIN"]}> → specific staff roles only
 *
 * Commuter screens are unchanged; staff-only trees use the `staff` prop.
 * A signed-in commuter hitting a staff route goes to /home (not /login,
 * which would bounce them straight back).
 */
export default function ProtectedRoute({ children, staff = false, roles = null }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="app-shell flex items-center justify-center">
        <span className="font-display text-[15px] font-semibold text-gold-600">
          GoldenWay…
        </span>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  if (staff) {
    if (!user.isStaff) {
      return <Navigate to="/home" replace />;
    }
    if (roles && !roles.includes(user.role)) {
      return <Navigate to="/staff" replace />;
    }
  }

  return children;
}
