import { Link } from "react-router-dom";
import { motion } from "framer-motion";

/**
 * Terms & Conditions / Disclaimer — public page linked from Splash and
 * Login. States clearly that GoldenWay is a student-built sample
 * simulation of a business idea, protects the team's original work,
 * and sets honest expectations about the demo data.
 */
const SECTIONS = [
  {
    title: "1. About this application",
    body: [
      "GoldenWay is a student-built sample simulation of a real-life business idea: an affordable, fair bus ticketing system for our communities in the Western Cape, South Africa.",
      "This is NOT a live transport service. No real tickets are sold, no real money is processed, and no real personal identity documents are stored or verified. All cards, commuters, staff accounts, fares, buses and routes shown in the app are fictional demonstration data created for an academic project (PRP37XS project practice).",
    ],
  },
  {
    title: "2. Educational & non-commercial use",
    body: [
      "This application was produced by students for assessment purposes at the Cape Peninsula University of Technology (CPUT). It may be shown, demonstrated and examined as academic work.",
      "It must not be used to operate a real transport business, process real payments, or collect real personal information from the public without completing all legal, regulatory and safety requirements that apply to a real operator.",
    ],
  },
  {
    title: "3. Original work & copyright",
    body: [
      "Unless stated otherwise, the design, code, copy and branding of this application are the original work of the GoldenWay project team and are © 2026 the team members named in the project logbook. All rights reserved.",
      "You may not copy, redistribute, or present this work as your own without written permission from the team. Examiners and lecturers may use and reference it for assessment purposes.",
      "Third-party open-source software used in this project (for example React, Vite, Tailwind CSS, Supabase client libraries) remains the property of its respective owners and is used under its published open-source licences. Trademarks and names referenced in demo data (such as bus depot or place names) belong to their respective owners and are used only for realistic fictional context.",
    ],
  },
  {
    title: "4. Demo data & privacy",
    body: [
      "All people shown in this app are fictional. Any resemblance to real persons is coincidental. Email addresses under goldenway.demo are demonstration accounts.",
      "Do not enter real identity numbers, real payment details, or any other sensitive personal information into this application.",
    ],
  },
  {
    title: "5. No warranty",
    body: [
      "The application is provided \"as is\" for demonstration. The team gives no warranty that it is fit for any particular purpose, uninterrupted, or error-free, and accepts no liability for any loss or damage arising from its use.",
    ],
  },
  {
    title: "6. Contact",
    body: [
      "Questions about this project, its data, or permission to reference it can be directed to the team via the project owner listed in the CPUT project logbook.",
    ],
  },
];

export default function TermsScreen() {
  return (
    <div className="app-shell">
      <div className="min-h-dvh flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex-1 px-6 py-8"
        >
          <div className="flex justify-center mb-4">
            <img src="/images/Logo2.png" alt="GoldenWay" className="h-12 w-auto" />
          </div>
          <p className="eyebrow text-gold-600 text-center">LEGAL & DISCLAIMER</p>
          <h1 className="font-display text-2xl font-bold text-ink-900 text-center mt-1">
            Terms &amp; Conditions
          </h1>
          <p className="text-[13px] text-slate-500 text-center mt-2 leading-relaxed">
            Please read before using this application.
          </p>

          <div className="mt-6 flex flex-col gap-4">
            {SECTIONS.map((s) => (
              <section key={s.title} className="rounded-2xl border border-ink-900/10 bg-white p-5" style={{ boxShadow: "var(--shadow-card)" }}>
                <h2 className="font-display text-[14.5px] font-bold text-ink-900">{s.title}</h2>
                {s.body.map((p, i) => (
                  <p key={i} className="mt-2 text-[12.5px] leading-relaxed text-ink-900/65">
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <p className="mt-6 text-center text-[11.5px] text-ink-900/40">
            © 2026 GoldenWay project team · Cape Peninsula University of Technology · Student project simulation
          </p>

          <div className="mt-5 pb-6">
            <Link
              to="/login"
              className="btn-gold block w-full py-3.5 text-center text-[14px]"
            >
              Back to sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
