import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import AuthProvider from "./context/AuthProvider";
import ProtectedRoute from "./context/ProtectedRoute";
import TripProvider from "./context/TripProvider";
import NotificationProvider from "./context/NotificationProvider";
import SplashScreen from "./screens/auth/SplashScreen";
import LoginScreen from "./screens/auth/LoginScreen";
import RegisterScreen from "./screens/auth/RegisterScreen";
import ForgotPasswordScreen from "./screens/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "./screens/auth/ResetPasswordScreen";
import StaffSignupScreen from "./screens/auth/StaffSignupScreen";
import AccountCreatedScreen from "./screens/auth/AccountCreatedScreen";
import CheckEmailScreen from "./screens/auth/CheckEmailScreen";
import StaffCompleteSignupScreen from "./screens/auth/StaffCompleteSignupScreen";
import NotFoundScreen from "./screens/NotFoundScreen";
import DashboardLayout from "./layout/DashboardLayout";
import StaffLayout from "./layout/StaffLayout";

// Commuter surfaces (lazy — each screen is its own chunk)
const HomeScreen = lazy(() => import("./screens/commuter/home/HomeScreen"));
const TimetableScreen = lazy(
  () => import("./screens/commuter/home/TimetableScreen"),
);
const RoutesScreen = lazy(() => import("./screens/commuter/home/RoutesScreen"));
const RouteDetailScreen = lazy(
  () => import("./screens/commuter/home/RouteDetailScreen"),
);
const SupportScreen = lazy(
  () => import("./screens/commuter/home/SupportScreen"),
);
const LoadtripsScreen = lazy(
  () => import("./screens/commuter/LoadTrips/LoadtripsScreen"),
);
const CardScreen = lazy(() => import("./screens/commuter/Card/CardScreen"));
const UseTicketScreen = lazy(
  () => import("./screens/commuter/Card/UseTicketScreen"),
);
const RideSuccessScreen = lazy(
  () => import("./screens/commuter/Card/RideSuccessScreen"),
);
const HistoryScreen = lazy(
  () => import("./screens/commuter/History/HistoryScreen"),
);
const TripScreen = lazy(() => import("./screens/commuter/History/TripScreen"));
const ProfileScreen = lazy(
  () => import("./screens/commuter/Profile/ProfileScreen"),
);
const UpdateProfileScreen = lazy(
  () => import("./screens/commuter/Profile/UpdateProfileScreen"),
);
const NotificationsScreen = lazy(
  () => import("./screens/commuter/Notifications/NotificationsScreen"),
);

// Staff console (lazy — staff code never downloads for commuters)
const StaffHomeScreen = lazy(
  () => import("./screens/staff/shared/StaffHomeScreen"),
);
const StaffProfileScreen = lazy(
  () => import("./screens/staff/shared/StaffProfileScreen"),
);
const OnboardingScreen = lazy(
  () => import("./screens/staff/admin/OnboardingScreen"),
);
const TeamScreen = lazy(() => import("./screens/staff/admin/TeamScreen"));
const CatalogScreen = lazy(() => import("./screens/staff/admin/CatalogScreen"));
const AlertsScreen = lazy(() => import("./screens/staff/admin/AlertsScreen"));
const VerifyScreen = lazy(
  () => import("./screens/staff/inspector/VerifyScreen"),
);
const RunsScreen = lazy(() => import("./screens/staff/driver/RunsScreen"));
const InboxScreen = lazy(() => import("./screens/staff/agent/InboxScreen"));
const ChatScreen = lazy(() => import("./screens/staff/agent/ChatScreen"));
const KioskScreen = lazy(() => import("./screens/staff/clerk/KioskScreen"));
const ConcessionsScreen = lazy(
  () => import("./screens/staff/clerk/ConcessionsScreen"),
);

/** Per-screen Suspense so layouts/nav stay mounted while a chunk loads. */
function Lazy({ children }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-[13px] text-slate-400">
          Loading…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

const commuterTree = (
  <Route
    element={
      <ProtectedRoute>
        <TripProvider>
          <DashboardLayout />
        </TripProvider>
      </ProtectedRoute>
    }
  >
    <Route
      path="/home"
      element={
        <Lazy>
          <HomeScreen />
        </Lazy>
      }
    />
    <Route
      path="/timetable"
      element={
        <Lazy>
          <TimetableScreen />
        </Lazy>
      }
    />
    <Route
      path="/routes"
      element={
        <Lazy>
          <RoutesScreen />
        </Lazy>
      }
    />
    <Route
      path="/routes/:code"
      element={
        <Lazy>
          <RouteDetailScreen />
        </Lazy>
      }
    />
    <Route
      path="/support"
      element={
        <Lazy>
          <SupportScreen />
        </Lazy>
      }
    />
    <Route
      path="/load-trips"
      element={
        <Lazy>
          <LoadtripsScreen />
        </Lazy>
      }
    />
    <Route
      path="/card"
      element={
        <Lazy>
          <CardScreen />
        </Lazy>
      }
    />
    <Route
      path="/use-ticket"
      element={
        <Lazy>
          <UseTicketScreen />
        </Lazy>
      }
    />
    <Route
      path="/ride-success"
      element={
        <Lazy>
          <RideSuccessScreen />
        </Lazy>
      }
    />
    <Route
      path="/history"
      element={
        <Lazy>
          <HistoryScreen />
        </Lazy>
      }
    />
    <Route
      path="/trip"
      element={
        <Lazy>
          <TripScreen />
        </Lazy>
      }
    />
    <Route
      path="/profile"
      element={
        <Lazy>
          <ProfileScreen />
        </Lazy>
      }
    />
    <Route
      path="/profile/update"
      element={
        <Lazy>
          <UpdateProfileScreen />
        </Lazy>
      }
    />
    <Route
      path="/notifications"
      element={
        <Lazy>
          <NotificationsScreen />
        </Lazy>
      }
    />
  </Route>
);

/**
 * Staff console — one layout, role-filtered nav. Each role folder in
 * screens/staff/<role>/ is a team lane (SPRINT2-STAFF-UI-PLAN.md §2);
 * shared chrome lives in screens/staff/shared/ + layout/StaffLayout.
 */
const staffScreens = {
  onboarding: { element: <OnboardingScreen />, roles: ["ADMIN"] },
  team: { element: <TeamScreen />, roles: ["ADMIN"] },
  catalog: { element: <CatalogScreen />, roles: ["ADMIN"] }, // Matthew's lane (S2-D4)
  alerts: { element: <AlertsScreen />, roles: ["ADMIN"] }, // Matthew's lane (S2-D4)
  verify: { element: <VerifyScreen />, roles: ["INSPECTOR", "ADMIN"] },
  runs: { element: <RunsScreen />, roles: ["DRIVER", "ADMIN"] },
  timetable: {
    element: <TimetableScreen hideCta />,
    roles: ["DRIVER", "ADMIN"],
  },
  inbox: { element: <InboxScreen />, roles: ["AGENT", "ADMIN"] },
  chats: { element: <ChatScreen />, roles: ["AGENT", "ADMIN"] },
  kiosk: { element: <KioskScreen />, roles: ["CLERK", "ADMIN"] },
  concessions: { element: <ConcessionsScreen />, roles: ["CLERK", "ADMIN"] },
  profile: { element: <StaffProfileScreen />, roles: "ANY_STAFF" },
};

const PROFILE_ROUTE_KEY = "profile"; // route key reserved for every staff member

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
          <Route path="/reset-password" element={<ResetPasswordScreen />} />
          <Route path="/staff-signup" element={<StaffSignupScreen />} />
          <Route
            path="/staff/complete-signup"
            element={<StaffCompleteSignupScreen />}
          />
          <Route path="/account-created" element={<AccountCreatedScreen />} />
          <Route path="/check-email" element={<CheckEmailScreen />} />

          {/* Staff console: /staff + role tools nested under StaffLayout */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute staff>
                <StaffLayout />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={
                <Lazy>
                  <StaffHomeScreen />
                </Lazy>
              }
            />
            {Object.entries(staffScreens).map(([slug, cfg]) =>
              slug === PROFILE_ROUTE_KEY ? null : (
                <Route
                  key={slug}
                  path={slug}
                  element={
                    cfg.element ? (
                      <ProtectedRoute staff roles={cfg.roles}>
                        <Lazy>{cfg.element}</Lazy>
                      </ProtectedRoute>
                    ) : (
                      <ComingSoon slug={slug} />
                    )
                  }
                />
              ),
            )}
            {/* Every staff member gets a profile page (Home-first nav skeleton) */}
            <Route
              path="profile"
              element={
                <ProtectedRoute staff>
                  <Lazy>
                    <StaffProfileScreen />
                  </Lazy>
                </ProtectedRoute>
              }
            />
          </Route>

          {commuterTree}

          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </NotificationProvider>
    </AuthProvider>
  );
}

function ComingSoon({ slug }) {
  return (
    <div
      className="min-h-dvh text-white flex items-center justify-center"
      style={{ background: "linear-gradient(180deg, #0b1526, #12203d)" }}
    >
      <div className="text-center">
        <p className="text-3xl mb-2">🚧</p>
        <h2 className="font-display text-lg font-bold">/staff/{slug}</h2>
        <p className="text-[13px] text-white/50 mt-1">
          Reserved lane — this module is on the Sprint 2 board.
        </p>
        <a
          href="/staff"
          className="inline-block mt-4 text-[12px] font-semibold text-gold-300 underline underline-offset-2"
        >
          Back to console
        </a>
      </div>
    </div>
  );
}
