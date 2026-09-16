import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const AUTO_NAVIGATE_MS = 2400;

export default function SplashScreen() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login", { replace: true });
    }, AUTO_NAVIGATE_MS);

    const raf = requestAnimationFrame(function tick(start) {
      const step = (ts) => {
        const elapsed = ts - (start ?? ts);
        setProgress(Math.min(1, elapsed / AUTO_NAVIGATE_MS));
        if (elapsed < AUTO_NAVIGATE_MS) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [navigate]);

  return (
    <div className="app-shell flex flex-col items-center justify-center px-10 relative">
      {/* ambient gold halo behind the logo */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] h-72 w-72 rounded-full bg-gold-400/15 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex flex-col items-center gap-2"
      >
        <motion.img
          src="/images/Logo2.png"
          alt="GoldenWay"
          className="h-28 w-auto"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="font-display font-bold text-3xl tracking-tight bg-gradient-to-b from-ink-900 to-ink-700 bg-clip-text text-transparent leading-none">
          GoldenWay
        </span>
        <span className="mt-2 text-[11px] font-semibold tracking-[0.22em] text-gold-600">
          &bull; THE BUS FOR US &bull;
        </span>
      </motion.div>

      <div className="absolute bottom-16 left-10 right-10 flex flex-col items-center gap-4">
        <div className="h-1.5 w-full rounded-full bg-cream-200 overflow-hidden border border-gold-500/15">
          <motion.div
            className="h-full rounded-full"
            style={{
              width: `${progress * 100}%`,
              background: "linear-gradient(90deg, #ffd873, #ffc52e 45%, #f0b429)",
              boxShadow: "0 0 12px rgba(240,180,41,0.6)",
            }}
          />
        </div>
        <p className="text-[13px] text-slate-500">
          Powered by{" "}
          <span className="font-medium text-ink-700">
            Golden Arrow Bus Services
          </span>
        </p>
      </div>
    </div>
  );
}
