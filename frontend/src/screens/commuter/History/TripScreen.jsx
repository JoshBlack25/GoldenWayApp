import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MapCanvas from "../../../components/MapCanvas";
import StopTimeline from "../../../components/StopTimeline";

const STOPS = [
  { label: "Cape town terminal", time: "Departed 08:15", state: "done" },
  { label: "Goodwood", time: "Arriving 08:30", state: "current" },
  { label: "Parrow", time: "Arriving 09:45", state: "upcoming" },
  { label: "Bellville terminal", time: "Final Stop 09:05", state: "upcoming" },
];

export default function TripScreen() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col px-5 pb-6">
      <div className="flex items-center justify-between pb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-ink-900 text-xl leading-none px-1 -ml-1"
          aria-label="Back"
        >
          &larr;
        </button>
        <h1 className="font-display text-[16px] font-bold text-gold-500">
          Trip History
        </h1>
        <span className="text-slate-400" aria-hidden="true">
          <ShareIcon />
        </span>
      </div>

      {/* Map with live tracking badge */}
      <div className="relative h-40 overflow-hidden rounded-2xl border border-ink-900/5">
        <MapCanvas />
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white shadow">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          LIVE TRACKING
        </span>
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-bold tracking-[0.16em] text-gold-600">
          CURRENT ROUTE
        </p>
        <h2 className="font-display text-xl font-bold text-ink-900 mt-1">
          Cape town to Bellville
        </h2>
      </div>

      <div className="mt-4">
        <StopTimeline stops={STOPS} />
      </div>

      {/* Fare + distance */}
      <div className="mt-4 rounded-2xl bg-white border border-ink-900/5 shadow-[0_2px_14px_-6px_rgba(0,0,0,0.08)] px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-slate-500">
            ESTIMATED FARE
          </p>
          <p className="font-display text-xl font-bold text-gold-600">
            R25.00
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold tracking-wide text-slate-500">
            TOTAL DISTANCE
          </p>
          <p className="font-display text-[16px] font-bold text-ink-900">
            12.4 km
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-cream-100 border border-gold-500/15 px-4 py-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[12px] font-medium text-ink-900">
          <RefreshIcon /> Real-time Updates
        </span>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          ACTIVE
        </span>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate("/load-trips")}
        className="btn-gold mt-5 w-full py-4 text-[15px]"
      >
        Buy Ticket
      </motion.button>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.3 10.8l7.4-3.6M8.3 13.2l7.4 3.6" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold-600" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 11a8 8 0 1 0-1.5 5.7" strokeLinecap="round" />
      <path d="M20 5v6h-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
