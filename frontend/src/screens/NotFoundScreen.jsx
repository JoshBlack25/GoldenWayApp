import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function NotFoundScreen() {
  const navigate = useNavigate();

  return (
    <div className="app-shell flex flex-col items-center justify-center gap-4 px-10 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-3"
      >
        <span className="font-display text-5xl font-bold text-gold-500">
          404
        </span>
        <h1 className="font-display text-xl font-bold text-ink-900">
          Wrong stop
        </h1>
        <p className="text-slate-500 text-[14px] leading-relaxed">
          That page isn&apos;t on this route. Let&apos;s get you back to the
          terminal.
        </p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={() => navigate("/")}
          className="btn-gold mt-3 px-6 py-3.5 text-[15px]"
        >
          Back to start
        </motion.button>
      </motion.div>
    </div>
  );
}
