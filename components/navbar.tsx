"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, Calendar, BarChart3, FileText, User, LogOut, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/calendar", label: "Kalendarz", icon: Calendar },
  { href: "/add", label: "Dodaj", icon: PlusCircle, accent: true },
  { href: "/stats", label: "Statystyki", icon: BarChart3 },
  { href: "/report", label: "Raport", icon: FileText },
  { href: "/profile", label: "Profil", icon: User },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
        <div className="warm-card px-2 py-2 flex items-center justify-around">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200",
                  item.accent && "bg-[var(--accent)] rounded-2xl px-4 py-3 -mt-8 shadow-lg",
                  !item.accent && isActive && "bg-[var(--accent)]/10",
                  !item.accent && !isActive && "hover:bg-[var(--warm-border)]"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors duration-200",
                    item.accent && "h-6 w-6 text-white",
                    isActive && !item.accent && "text-[var(--accent)]",
                    !isActive && !item.accent && "text-[var(--text-secondary)]"
                  )}
                />
                {!item.accent && (
                  <span
                    className={cn(
                      "text-[10px] font-medium transition-colors duration-200",
                      isActive ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"
                    )}
                  >
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-screen w-64 flex-col z-50 border-r"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--warm-border)",
        }}
      >
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--accent)]">MealSnap</h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Dziennik posilkow AI</p>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-[var(--warm-border)] transition-colors"
            title={theme === "light" ? "Tryb ciemny" : "Tryb jasny"}
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4 text-[var(--text-secondary)]" />
            ) : (
              <Sun className="h-4 w-4 text-[var(--text-secondary)]" />
            )}
          </button>
        </div>
        <nav className="flex-1 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200",
                  isActive
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--warm-border)]"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        {user && (
          <div className="p-4 border-t" style={{ borderColor: "var(--warm-border)" }}>
            <div className="flex items-center gap-3">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt=""
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-sm font-bold">
                  {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.user_metadata?.full_name || user.email}
                </p>
              </div>
              <button
                onClick={signOut}
                className="text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors duration-200"
                title="Wyloguj"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
