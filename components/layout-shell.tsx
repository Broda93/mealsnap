"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="pb-20 md:pb-0 md:pl-64">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </>
  );
}
