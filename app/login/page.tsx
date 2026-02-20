"use client";

import { createClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Camera, Zap, Shield } from "lucide-react";

const features = [
  { icon: Camera, text: "Zrob zdjecie - AI rozpozna posilek" },
  { icon: Zap, text: "Szybkie dodawanie z szablonow" },
  { icon: Shield, text: "Twoje dane sa bezpieczne" },
];

export default function LoginPage() {
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: "var(--bg)" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm space-y-8 text-center relative z-10"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 className="text-5xl font-bold text-[var(--accent)]">
            MealSnap
          </h1>
          <p className="text-[var(--text-secondary)] mt-2 text-sm">
            Inteligentny dziennik posilkow
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="warm-card p-8 space-y-6"
        >
          <div>
            <h2 className="text-lg font-semibold">Zaloguj sie</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Aby sledzic swoje posilki i kalorie
            </p>
          </div>

          <Button
            onClick={handleGoogleLogin}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white h-12 text-base rounded-xl shadow-sm"
          >
            <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Zaloguj przez Google
          </Button>
        </motion.div>

        {/* Feature bullets */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="space-y-3"
        >
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.1 }}
              className="flex items-center gap-3 text-sm text-[var(--text-secondary)]"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--protein-soft)" }}>
                <f.icon className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <span>{f.text}</span>
            </motion.div>
          ))}
        </motion.div>

        <p className="text-xs text-[var(--text-secondary)] opacity-60">
          Logujac sie akceptujesz warunki korzystania z aplikacji
        </p>
      </motion.div>
    </div>
  );
}
