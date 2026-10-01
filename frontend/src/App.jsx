<<<<<<< HEAD
=======
import { lazy, Suspense } from "react";
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
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
<<<<<<< HEAD
=======
import CheckEmailScreen from "./screens/auth/CheckEmailScreen";
import StaffCompleteSignupScreen from "./screens/auth/StaffCompleteSignupScreen";
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
import NotFoundScreen from "./screens/NotFoundScreen";
import DashboardLayout from "./layout/DashboardLayout";
import StaffLayout from "./layout/StaffLayout";

<<<<<<< HEAD
// Commuter surfaces
import HomeScreen from "./screens/commuter/home/HomeScreen";
import TimetableScreen from "./screens/commuter/home/TimetableScreen";
import Route42Screen from "./screens/commuter/home/Route42Screen";
import SupportScreen from "./screens/commuter/home/SupportScreen";
import LoadtripsScreen from "./screens/commuter/LoadTrips/LoadtripsScreen";
import CardScreen from "./screens/commuter/Card/CardScreen";
import UseTicketScreen from "./screens/commuter/Card/UseTicketScreen";
import RideSuccessScreen from "./screens/commuter/Card/RideSuccessScreen";
import HistoryScreen from "./screens/commuter/History/HistoryScreen";
import TripScreen from "./screens/commuter/History/TripScreen";
import ProfileScreen from "./screens/commuter/Profile/ProfileScreen";
import UpdateProfileScreen from "./screens/commuter/Profile/UpdateProfileScreen";
import NotificationsScreen from "./screens/commuter/Notifications/NotificationsScreen";

// Staff console — shared + per-role (one folder per team lane)
import StaffHomeScreen from "./screens/staff/shared/StaffHomeScreen";
import OnboardingScreen from "./screens/staff/admin/OnboardingScreen";
import TeamScreen from "./screens/staff/admin/TeamScreen";
import CatalogScreen from "./screens/staff/admin/CatalogScreen";
import AlertsScreen from "./screens/staff/admin/AlertsScreen";
import VerifyScreen from "./screens/staff/inspector/VerifyScreen";
import RunsScreen from "./screens/staff/driver/RunsScreen";
import InboxScreen from "./screens/staff/agent/InboxScreen";
import KioskScreen from "./screens/staff/clerk/KioskScreen";
import ConcessionsScreen from "./screens/staff/clerk/ConcessionsScreen";
import StaffProfileScreen from "./screens/staff/shared/StaffProfileScreen";
=======
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
const InspectionHistoryScreen = lazy(
  () => import("./screens/staff/inspector/InspectionHistoryScreen"),
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
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc

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
<<<<<<< HEAD
    <Route path="/home" element={<HomeScreen />} />
    <Route path="/timetable" element={<TimetableScreen />} />
    <Route path="/route-42" element={<Route42Screen />} />
    <Route path="/support" element={<SupportScreen />} />
    <Route path="/load-trips" element={<LoadtripsScreen />} />
    <Route path="/card" element={<CardScreen />} />
    <Route path="/use-ticket" element={<UseTicketScreen />} />
    <Route path="/ride-success" element={<RideSuccessScreen />} />
    <Route path="/history" element={<HistoryScreen />} />
    <Route path="/trip" element={<TripScreen />} />
    <Route path="/profile" element={<ProfileScreen />} />
    <Route path="/profile/update" element={<UpdateProfileScreen />} />
    <Route path="/notifications" element={<NotificationsScreen />} />
=======
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
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
  </Route>
);

/**
 * Staff console — one layout, role-filtered nav. Each role folder in
 * screens/staff/<role>/ is a team lane (SPRINT2-STAFF-UI-PLAN.md §2);
 * shared chrome lives in screens/staff/shared/ + layout/StaffLayout.
 */
const staffScreens = {
<<<<<<< HEAD
=======
  inspections: {
    element: <InspectionHistoryScreen />,
    roles: ["INSPECTOR", "ADMIN"],
  },
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
  onboarding: { element: <OnboardingScreen />, roles: ["ADMIN"] },
  team: { element: <TeamScreen />, roles: ["ADMIN"] },
  catalog: { element: <CatalogScreen />, roles: ["ADMIN"] }, // Matthew's lane (S2-D4)
  alerts: { element: <AlertsScreen />, roles: ["ADMIN"] }, // Matthew's lane (S2-D4)
  verify: { element: <VerifyScreen />, roles: ["INSPECTOR", "ADMIN"] },
  runs: { element: <RunsScreen />, roles: ["DRIVER", "ADMIN"] },
<<<<<<< HEAD
  inbox: { element: <InboxScreen />, roles: ["AGENT", "ADMIN"] },
=======
  timetable: {
    element: <TimetableScreen hideCta />,
    roles: ["DRIVER", "ADMIN"],
  },
  inbox: { element: <InboxScreen />, roles: ["AGENT", "ADMIN"] },
  chats: { element: <ChatScreen />, roles: ["AGENT", "ADMIN"] },
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
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
<<<<<<< HEAD
          <Route path="/account-created" element={<AccountCreatedScreen />} />
=======
          <Route
            path="/staff/complete-signup"
            element={<StaffCompleteSignupScreen />}
          />
          <Route path="/account-created" element={<AccountCreatedScreen />} />
          <Route path="/check-email" element={<CheckEmailScreen />} />
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc

          {/* Staff console: /staff + role tools nested under StaffLayout */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute staff>
                <StaffLayout />
              </ProtectedRoute>
            }
          >
<<<<<<< HEAD
            <Route index element={<StaffHomeScreen />} />
=======
            <Route
              index
              element={
                <Lazy>
                  <StaffHomeScreen />
                </Lazy>
              }
            />
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
            {Object.entries(staffScreens).map(([slug, cfg]) =>
              slug === PROFILE_ROUTE_KEY ? null : (
                <Route
                  key={slug}
                  path={slug}
                  element={
                    cfg.element ? (
                      <ProtectedRoute staff roles={cfg.roles}>
<<<<<<< HEAD
                        {cfg.element}
=======
                        <Lazy>{cfg.element}</Lazy>
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
                      </ProtectedRoute>
                    ) : (
                      <ComingSoon slug={slug} />
                    )
                  }
                />
              ),
            )}
            {/* Every staff member gets a profile page (Home-first nav skeleton) */}
<<<<<<< HEAD
            <Route path="profile" element={<ProtectedRoute staff><StaffProfileScreen /></ProtectedRoute>} />
=======
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
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
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
<<<<<<< HEAD
    <div className="min-h-dvh text-white flex items-center justify-center" style={{ background: "linear-gradient(180deg, #0b1526, #12203d)" }}>
      <div className="text-center">
        <p className="text-3xl mb-2">🚧</p>
        <h2 className="font-display text-lg font-bold">/staff/{slug}</h2>
        <p className="text-[13px] text-white/50 mt-1">Reserved lane — this module is on the Sprint 2 board.</p>
        <a href="/staff" className="inline-block mt-4 text-[12px] font-semibold text-gold-300 underline underline-offset-2">Back to console</a>
=======
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
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
      </div>
    </div>
  );
}
