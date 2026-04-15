"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AvaliacaoCompetencia, Colaborador, Competencia } from "@/lib/types";
import { NIVEL_LABELS, NIVEL_COLORS } from "@/lib/types";
import { BookOpen, CheckCircle, XCircle, Clock, ExternalLink } from "lucide-react";

export default function ProvasPage() {
  const [provas, setProvas] = useState<(AvaliacaoCompetencia & { colabNome: string; compNome: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pendente_prova" | "aprovado" | "reprovado">("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [avalSnap, colabSnap, compSnap] = await Promise.all([
        getDocs(collection(db, "avaliacoes_competencia")),
        getDocs(collection(db, "colaboradores")),
        getDocs(collection(db, "competencias")),
      ]);

      const colabs = Object.fromEntries(colabSnap.docs.map((d) => [d.id, d.data().nome as string]));
      const comps = Object.fromEntries(compSnap.docs.map((d) => [d.id, d.data().nome as string]));

      const avals = avalSnap.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
          colabNome: colabs[(d.data() as AvaliacaoCompetencia).colaboradorId] || "—",
          compNome: comps[(d.data() as AvaliacaoCompetencia).competenciaId] || "—",
        }))
        .filter((a: any) => a.status !== "confirmado" || a.nivelProposto > a.nivelAtual) as any[];

      setProvas(avals.sort((a: any, b: any) => b.dataAvaliacao.localeCompare(a.dataAvaliacao)));
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === "all" ? provas : provas.filter((p) => p.status === filter);

  const statusConfig = {
    pendente_prova: { label: "Pendente", icon: <Clock size={14} />, class: "bg-yellow-500/15 text-yellow-400" },
    aprovado: { label: "Aprovado", icon: <CheckCircle size={14} />, class: "bg-green-500/15 text-green-400" },
    reprovado: { label: "Reprovado", icon: <XCircle size={14} />, class: "bg-red-500/15 text-red-400" },
    confirmado: { label: "Confirmado", icon: <CheckCircle size={14} />, class: "bg-blue-500/15 text-blue-400" },
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestão de Provas</h1>
          <p className="text-sm text-slate-400 mt-1">Acompanhe as provas de promoção de nível</p>
        </div>
        <div className="flex gap-2">
          {(["all", "pendente_prova", "aprovado", "reprovado"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {f === "all" ? "Todas" : f === "pendente_prova" ? "Pendentes" : f === "aprovado" ? "Aprovadas" : "Reprovadas"}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <BookOpen size={40} className="mx-auto mb-3 opacity-50" />
            <p>Nenhuma prova encontrada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((prova) => {
              const cfg = statusConfig[prova.status];
              return (
                <div key={prova.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-1">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: NIVEL_COLORS[prova.nivelAtual] }}
                    >
                      {prova.nivelAtual}
                    </div>
                    <span className="text-slate-500 text-xs">→</span>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: NIVEL_COLORS[prova.nivelProposto] }}
                    >
                      {prova.nivelProposto}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{prova.colabNome}</p>
                    <p className="text-xs text-slate-400 truncate">{prova.compNome}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 ${cfg.class}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                  {prova.notaProva !== undefined && (
                    <span className="text-sm font-bold text-white">{prova.notaProva}%</span>
                  )}
                  {prova.provaUrl && (
                    <a href={prova.provaUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                      <ExternalLink size={16} />
                    </a>
                  )}
                  <span className="text-[10px] text-slate-500">
                    {new Date(prova.dataAvaliacao).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
