import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import DashboardHeader from "../components/DashboardHeader";
import BottomNav from "../components/BottomNav";

/**
 * Shared shell for every screen reachable from the bottom nav. Page
 * content cross-fades/slides in on route change while the nav bar
 * itself stays put underneath.
 */
export default function DashboardLayout() {
  const location = useLocation();

  return (
    <div className="app-shell h-dvh flex flex-col">
      <DashboardHeader />
<<<<<<< HEAD
      <div className="flex-1 overflow-y-auto no-scrollbar">
=======
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
<<<<<<< HEAD
            className="min-h-full"
=======
            className="flex flex-col flex-1 min-h-full"
>>>>>>> d5273773720dca08d00f9421d34ca764068844bc
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
}
