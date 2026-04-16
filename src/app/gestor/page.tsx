"use client";

export const dynamic = "force-dynamic";

import DashboardGestor from "@/components/dashboard/DashboardGestor";

export default function GestorPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Visão geral do desenvolvimento da equipe</p>
      </div>
      <DashboardGestor />
    </div>
  );
}
