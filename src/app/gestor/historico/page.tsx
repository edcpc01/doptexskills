"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  Colaborador, Competencia, AvaliacaoCompetencia, NivelCompetencia,
} from "@/lib/types";
import { CARGO_LABELS, NIVEL_LABELS, NIVEL_COLORS } from "@/lib/types";
import { TrendingUp, ChevronDown, ChevronUp } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface HistoricoEntry {
  avaliacaoId: string;
  competenciaId: string;
  competenciaNome: string;
  nivelAnterior: NivelCompetencia;
  nivelNovo: NivelCompetencia;
  data: string;
  status: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function NivelBadge({ nivel }: { nivel: NivelCompetencia }) {
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
      style={{ background: NIVEL_COLORS[nivel] }}
    >
      {nivel}
    </span>
  );
}

function ArrowIcon({ from, to }: { from: NivelCompetencia; to: NivelCompetencia }) {
  const up = to > from;
  const color = up ? "#22C55E" : to < from ? "#EF4444" : "#94A3B8";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d={up ? "M10 14V6M10 6L6 10M10 6L14 10" : "M10 6V14M10 14L6 10M10 14L14 10"}
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HistoricoPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoCompetencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedColabId, setSelectedColabId] = useState<string>("");
  const [expandedComps, setExpandedComps] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const [colabSnap, compSnap, avalSnap] = await Promise.all([
        getDocs(collection(db, "colaboradores")),
        getDocs(collection(db, "competencias")),
        getDocs(collection(db, "avaliacoes_competencia")),
      ]);
      const colabs = colabSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Colaborador))
        .filter((c) => c.ativo)
        .sort((a, b) => a.nome.localeCompare(b.nome));
      setColaboradores(colabs);
      setCompetencias(compSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Competencia)));
      setAvaliacoes(avalSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AvaliacaoCompetencia)));
      if (colabs.length > 0) setSelectedColabId(colabs[0].id);
      setLoading(false);
    })();
  }, []);

  const compMap = useMemo(
    () => Object.fromEntries(competencias.map((c) => [c.id, c])),
    [competencias]
  );

  // Build timeline: only approved/confirmed evals, sorted by date asc
  const timeline = useMemo<HistoricoEntry[]>(() => {
    if (!selectedColabId) return [];
    const mine = avaliacoes
      .filter(
        (a) =>
          a.colaboradorId === selectedColabId &&
          (a.status === "aprovado" || a.status === "confirmado")
      )
      .sort((a, b) => a.dataAvaliacao.localeCompare(b.dataAvaliacao));

    return mine.map((a) => ({
      avaliacaoId: a.id,
      competenciaId: a.competenciaId,
      competenciaNome: compMap[a.competenciaId]?.nome ?? a.competenciaId,
      nivelAnterior: a.nivelAtual,
      nivelNovo: a.nivelProposto,
      data: a.dataAvaliacao,
      status: a.status,
    }));
  }, [selectedColabId, avaliacoes, compMap]);

  // Group by competencia
  const byCompetencia = useMemo(() => {
    const map: Record<string, HistoricoEntry[]> = {};
    timeline.forEach((e) => {
      if (!map[e.competenciaId]) map[e.competenciaId] = [];
      map[e.competenciaId].push(e);
    });
    return map;
  }, [timeline]);

  const selectedColab = colaboradores.find((c) => c.id === selectedColabId);

  const toggleComp = (compId: string) => {
    setExpandedComps((prev) => {
      const next = new Set(prev);
      next.has(compId) ? next.delete(compId) : next.add(compId);
      return next;
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Histórico de Evolução</h1>
        <p className="text-sm text-slate-400 mt-1">
          Acompanhe a progressão de competências por colaborador ao longo do tempo.
        </p>
      </div>

      {/* Collaborator picker */}
      <div className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1">
          <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">
            Colaborador
          </label>
          <select
            value={selectedColabId}
            onChange={(e) => {
              setSelectedColabId(e.target.value);
              setExpandedComps(new Set());
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-600/50 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {colaboradores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        {selectedColab && (
          <div className="text-sm text-slate-400">
            <span className="text-slate-500">Cargo: </span>
            <span className="text-white font-medium">{CARGO_LABELS[selectedColab.cargo]}</span>
          </div>
        )}
      </div>

      {/* Summary stats */}
      {timeline.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{timeline.length}</p>
            <p className="text-xs text-slate-400 mt-1">Avaliações aprovadas</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-green-400">
              {timeline.filter((e) => e.nivelNovo > e.nivelAnterior).length}
            </p>
            <p className="text-xs text-slate-400 mt-1">Progressões</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">
              {Object.keys(byCompetencia).length}
            </p>
            <p className="text-xs text-slate-400 mt-1">Competências avaliadas</p>
          </div>
        </div>
      )}

      {/* Timeline grouped by competencia */}
      {timeline.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <TrendingUp size={36} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm">Nenhuma avaliação aprovada para este colaborador.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(byCompetencia).map(([compId, entries]) => {
            const isOpen = expandedComps.has(compId);
            const latest = entries[entries.length - 1];
            const compNome = compMap[compId]?.nome ?? compId;
            const promotions = entries.filter((e) => e.nivelNovo > e.nivelAnterior).length;

            return (
              <div key={compId} className="glass-card rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleComp(compId)}
                  className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{compNome}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {entries.length} avaliação{entries.length !== 1 ? "ões" : ""} · {promotions} progressão{promotions !== 1 ? "ões" : ""}
                    </p>
                  </div>

                  {/* Level progression summary */}
                  <div className="flex items-center gap-2 shrink-0">
                    <NivelBadge nivel={entries[0].nivelAnterior} />
                    <svg width="28" height="10" viewBox="0 0 28 10">
                      <path d="M2 5H26M22 1L26 5L22 9" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <NivelBadge nivel={latest.nivelNovo} />
                  </div>

                  {isOpen ? (
                    <ChevronUp size={16} className="text-slate-500 shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-500 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-slate-700/30 px-5 py-4">
                    <div className="relative">
                      {/* Vertical line */}
                      <div className="absolute left-3 top-2 bottom-2 w-px bg-slate-700" />

                      <div className="space-y-4">
                        {entries.map((entry, idx) => (
                          <div key={entry.avaliacaoId} className="flex gap-4 items-start relative pl-8">
                            {/* Dot */}
                            <div
                              className="absolute left-0 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-slate-900"
                              style={{ borderColor: NIVEL_COLORS[entry.nivelNovo] }}
                            >
                              <span className="text-[9px] font-bold" style={{ color: NIVEL_COLORS[entry.nivelNovo] }}>
                                {entry.nivelNovo}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-slate-400">
                                  {new Date(entry.data).toLocaleDateString("pt-BR")}
                                </span>
                                <div className="flex items-center gap-1">
                                  <NivelBadge nivel={entry.nivelAnterior} />
                                  <ArrowIcon from={entry.nivelAnterior} to={entry.nivelNovo} />
                                  <NivelBadge nivel={entry.nivelNovo} />
                                </div>
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded-full border"
                                  style={{
                                    color: entry.nivelNovo > entry.nivelAnterior ? "#22C55E" : "#94A3B8",
                                    borderColor: entry.nivelNovo > entry.nivelAnterior ? "#22C55E40" : "#94A3B840",
                                  }}
                                >
                                  {entry.nivelNovo > entry.nivelAnterior
                                    ? "Progressão"
                                    : entry.nivelNovo === entry.nivelAnterior
                                    ? "Mantido"
                                    : "Regressão"}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                {NIVEL_LABELS[entry.nivelNovo]}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
