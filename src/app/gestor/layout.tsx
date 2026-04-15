"use client";

import AppShell from "@/components/layout/AppShell";

export default function GestorLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
