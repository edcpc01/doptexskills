"use client";

export const dynamic = "force-dynamic";

import DashboardColaborador from "@/components/dashboard/DashboardColaborador";

export default function ColaboradorPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Meu Desenvolvimento</h1>
        <p className="text-sm text-slate-400 mt-1">Acompanhe sua evolução profissional</p>
      </div>
      <DashboardColaborador />
    </div>
  );
}
