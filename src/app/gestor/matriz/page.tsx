"use client";

export const dynamic = "force-dynamic";

import MatrizCompetencias from "@/components/competencias/MatrizCompetencias";

export default function MatrizPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Matriz de Competências</h1>
        <p className="text-sm text-slate-400 mt-1">Clique em uma célula para avaliar o colaborador</p>
      </div>
      <MatrizCompetencias />
    </div>
  );
}
