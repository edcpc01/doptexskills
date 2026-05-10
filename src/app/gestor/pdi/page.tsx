"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type {
  Colaborador, Competencia, NivelCompetencia, AvaliacaoCompetencia,
  NivelEsperado, PDI, PDIMeta, CargoType,
} from "@/lib/types";
import { NIVEL_LABELS, NIVEL_COLORS, CARGO_LABELS } from "@/lib/types";
import {
  Target, TrendingUp, AlertTriangle, CheckCircle, Clock, Plus, X,
  ChevronDown, ChevronRight, Users, Calendar, Pencil,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

type NotasMap = Record<string, Record<string, NivelCompetencia>>;

function buildNotasMap(docs: AvaliacaoCompetencia[]): NotasMap {
  const best: Record<string, Record<string, { nivel: NivelCompetencia; date: string; approved: boolean }>> = {};
  docs.forEach((aval) => {
    const isApproved = aval.status === "confirmado" || aval.status === "aprovado";
    if (!best[aval.colaboradorId]) best[aval.colaboradorId] = {};
    const ex = best[aval.colaboradorId][aval.competenciaId];
    const nivelShow = isApproved ? aval.nivelProposto : aval.nivelAtual;
    if (!ex || (isApproved && !ex.approved) || (isApproved === ex.approved && aval.dataAvaliacao > ex.date)) {
      best[aval.colaboradorId][aval.competenciaId] = { nivel: nivelShow, date: aval.dataAvaliacao, approved: isApproved };
    }
  });
  const map: NotasMap = {};
  Object.entries(best).forEach(([colabId, comps]) => {
    map[colabId] = {};
    Object.entries(comps).forEach(([compId, v]) => { map[colabId][compId] = v.nivel; });
  });
  return map;
}

function getPDIProgress(pdi: PDI, notas: NotasMap) {
  const concluded = pdi.metas.filter(
    (m) => (notas[pdi.colaboradorId]?.[m.competenciaId] ?? 0) >= m.nivelAlvo
  ).length;
  return { total: pdi.metas.length, concluded };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

// ── Gap row type ──────────────────────────────────────────────────────────────

interface GapItem {
  comp: Competencia;
  atual: NivelCompetencia;
  esperado: NivelCompetencia;
  gap: number;
}
interface GapRow { colab: Colaborador; gaps: GapItem[] }

// ── Component ─────────────────────────────────────────────────────────────────

export default function PDIPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"gaps" | "pdis">("gaps");

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [niveisEsperados, setNiveisEsperados] = useState<NivelEsperado[]>([]);
  const [notas, setNotas] = useState<NotasMap>({});
  const [pdis, setPdis] = useState<PDI[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterCargo, setFilterCargo] = useState<CargoType | "TODOS">("TODOS");
  const [createModal, setCreateModal] = useState<{ colab: Colaborador; gaps: GapItem[] } | null>(null);
  const [detailPDI, setDetailPDI] = useState<PDI | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Create form
  const [form, setForm] = useState({
    titulo: "",
    dataFim: "",
    observacoes: "",
    metas: [] as (PDIMeta & { compNome?: string })[],
  });

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }
  }, [toast]);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let cancelled = false;
    (async () => {
      const [colabSnap, compSnap, nivSnap, avalSnap] = await Promise.all([
        getDocs(collection(db, "colaboradores")),
        getDocs(collection(db, "competencias")),
        getDocs(collection(db, "niveis_esperados")),
        getDocs(collection(db, "avaliacoes_competencia")),
      ]);
      if (cancelled) return;

      setColaboradores(colabSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Colaborador)).sort((a, b) => a.nome.localeCompare(b.nome)));
      setCompetencias(compSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Competencia)).sort((a, b) => a.ordem - b.ordem));
      setNiveisEsperados(nivSnap.docs.map((d) => ({ id: d.id, ...d.data() } as NivelEsperado)));
      setNotas(buildNotasMap(avalSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AvaliacaoCompetencia))));

      unsub = onSnapshot(collection(db, "pdis"), (snap) => {
        setPdis(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PDI)));
        setLoading(false);
      }, () => setLoading(false));
    })();
    return () => { cancelled = true; if (unsub) unsub(); };
  }, []);

  // ── Gap Analysis ────────────────────────────────────────────────────────────

  const gapRows = useMemo((): GapRow[] => {
    return colaboradores
      .filter((c) => filterCargo === "TODOS" || c.cargo === filterCargo)
      .map((colab) => {
        const gaps: GapItem[] = competencias
          .filter((comp) => comp.cargosAplicaveis.includes(colab.cargo))
          .flatMap((comp) => {
            const esp = niveisEsperados.find((n) => n.competenciaId === comp.id && n.cargo === colab.cargo);
            if (!esp) return [];
            const atual = notas[colab.id]?.[comp.id] ?? 0 as NivelCompetencia;
            const gap = esp.nivelMinimo - atual;
            if (gap <= 0) return [];
            return [{ comp, atual: atual as NivelCompetencia, esperado: esp.nivelMinimo, gap }];
          })
          .sort((a, b) => b.gap - a.gap);
        return { colab, gaps };
      })
      .filter((r) => r.gaps.length > 0);
  }, [colaboradores, competencias, niveisEsperados, notas, filterCargo]);

  const totalGaps = gapRows.reduce((s, r) => s + r.gaps.length, 0);
  const gapsCriticos = gapRows.reduce((s, r) => s + r.gaps.filter((g) => g.gap >= 2).length, 0);

  // ── Create PDI ──────────────────────────────────────────────────────────────

  const openCreate = (colab: Colaborador, gaps: GapItem[]) => {
    setCreateModal({ colab, gaps });
    const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
    setForm({
      titulo: `PDI — ${colab.nome.split(" ")[0]} — Q${quarter}/${new Date().getFullYear()}`,
      dataFim: "",
      observacoes: "",
      metas: gaps.map((g) => ({ competenciaId: g.comp.id, nivelAlvo: g.esperado, prazo: "", compNome: g.comp.nome })),
    });
  };

  const handleCreatePDI = async () => {
    if (!profile || !createModal || !form.dataFim || form.metas.length === 0) return;
    const { compNome: _cn, ...cleanMeta } = form.metas[0]; void _cn;
    const metas: PDIMeta[] = form.metas.map(({ compNome: _c, ...m }) => { void _c; return m; });
    const payload: Omit<PDI, "id"> = {
      colaboradorId: createModal.colab.id,
      gestorId: profile.uid,
      titulo: form.titulo,
      dataInicio: new Date().toISOString(),
      dataFim: form.dataFim,
      status: "ativo",
      metas,
      observacoes: form.observacoes,
      criadoEm: new Date().toISOString(),
    };
    void cleanMeta;
    await addDoc(collection(db, "pdis"), payload);
    setCreateModal(null);
    setToast(`PDI criado para ${createModal.colab.nome.split(" ")[0]}!`);
  };

  const handleClosePDI = async (pdi: PDI) => {
    await updateDoc(doc(db, "pdis", pdi.id), { status: "concluido" });
    setDetailPDI(null);
    setToast("PDI marcado como concluído.");
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Carregando...</div>;

  const pdisAtivos = pdis.filter((p) => p.status === "ativo");
  const pdisConcluidos = pdis.filter((p) => p.status === "concluido");

  return (
    <div className="space-y-6 relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg bg-emerald-600 text-white text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">PDI & Gap Analysis</h1>
        <p className="text-sm text-slate-400 mt-1">Planos de Desenvolvimento Individual e análise de lacunas por cargo</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-800/50 w-fit">
        {(["gaps", "pdis"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {t === "gaps" ? "Gap Analysis" : `Planos (${pdisAtivos.length})`}
          </button>
        ))}
      </div>

      {/* ── GAP ANALYSIS ── */}
      {tab === "gaps" && (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{gapsCriticos}</p>
                <p className="text-xs text-slate-400">Gaps críticos (≥2 níveis)</p>
              </div>
            </div>
            <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center">
                <Users size={20} className="text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{gapRows.length}</p>
                <p className="text-xs text-slate-400">Colaboradores com gaps</p>
              </div>
            </div>
            <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Target size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalGaps}</p>
                <p className="text-xs text-slate-400">Total de lacunas</p>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">Filtrar por cargo:</span>
            <select
              value={filterCargo}
              onChange={(e) => setFilterCargo(e.target.value as CargoType | "TODOS")}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-600/50 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="TODOS">Todos</option>
              {(Object.keys(CARGO_LABELS) as CargoType[]).map((c) => (
                <option key={c} value={c}>{CARGO_LABELS[c]}</option>
              ))}
            </select>
          </div>

          {/* Gap table */}
          {gapRows.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center text-slate-500">
              <CheckCircle size={36} className="mx-auto mb-3 text-emerald-500/50" />
              <p className="text-sm">Nenhum gap identificado para os filtros atuais.</p>
              {niveisEsperados.length === 0 && (
                <p className="text-xs text-slate-600 mt-2">Configure os níveis esperados em Admin → Níveis Esperados.</p>
              )}
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="px-5 py-3 text-left text-xs text-slate-400 font-medium">Colaborador</th>
                    <th className="px-4 py-3 text-center text-xs text-slate-400 font-medium">Cargo</th>
                    <th className="px-4 py-3 text-center text-xs text-slate-400 font-medium">Gaps</th>
                    <th className="px-4 py-3 text-center text-xs text-slate-400 font-medium">Maior Lacuna</th>
                    <th className="px-4 py-3 text-right text-xs text-slate-400 font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {gapRows.map(({ colab, gaps }) => {
                    const expanded = expandedRows.has(colab.id);
                    const piorGap = gaps[0];
                    const criticos = gaps.filter((g) => g.gap >= 2).length;
                    return (
                      <>
                        <tr key={colab.id} className="border-b border-slate-700/20 hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-3">
                            <button
                              onClick={() => setExpandedRows((prev) => {
                                const next = new Set(prev);
                                next.has(colab.id) ? next.delete(colab.id) : next.add(colab.id);
                                return next;
                              })}
                              className="flex items-center gap-2 text-sm text-white hover:text-blue-400 transition-colors"
                            >
                              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              <div className="w-7 h-7 rounded-full bg-blue-600/30 flex items-center justify-center text-[10px] font-bold text-blue-400">
                                {colab.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                              </div>
                              {colab.nome}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-slate-400">{CARGO_LABELS[colab.cargo]}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-semibold text-white">{gaps.length}</span>
                            {criticos > 0 && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] bg-red-500/20 text-red-400 font-semibold">
                                {criticos} crítico{criticos > 1 ? "s" : ""}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs text-slate-300">
                              <span style={{ color: NIVEL_COLORS[piorGap.atual] }}>{piorGap.atual}</span>
                              <span className="text-slate-500 mx-1">→</span>
                              <span style={{ color: NIVEL_COLORS[piorGap.esperado] }}>{piorGap.esperado}</span>
                              <span className="text-slate-500 ml-1">({piorGap.comp.nome.slice(0, 18)}…)</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => openCreate(colab, gaps)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs font-semibold ml-auto transition-all"
                            >
                              <Plus size={12} /> Criar PDI
                            </button>
                          </td>
                        </tr>
                        {expanded && (
                          <tr key={`${colab.id}-detail`} className="bg-slate-900/50">
                            <td colSpan={5} className="px-8 pb-4 pt-2">
                              <div className="grid grid-cols-1 gap-1.5">
                                {gaps.map((g) => (
                                  <div key={g.comp.id} className="flex items-center gap-3 text-xs">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: g.gap >= 2 ? "#EF4444" : "#EAB308" }} />
                                    <span className="text-slate-300 w-56 truncate">{g.comp.nome}</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: NIVEL_COLORS[g.atual] }}>{g.atual}</span>
                                      <span className="text-slate-500">→</span>
                                      <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: NIVEL_COLORS[g.esperado] }}>{g.esperado}</span>
                                    </div>
                                    <span className="text-slate-500">Lacuna: {g.gap} nível{g.gap > 1 ? "is" : ""}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PDIs ── */}
      {tab === "pdis" && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Clock size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{pdisAtivos.length}</p>
                <p className="text-xs text-slate-400">PDIs ativos</p>
              </div>
            </div>
            <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{pdisConcluidos.length}</p>
                <p className="text-xs text-slate-400">PDIs concluídos</p>
              </div>
            </div>
            <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center">
                <TrendingUp size={20} className="text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {pdisAtivos.length === 0 ? "—" : Math.round(
                    pdisAtivos.reduce((s, p) => {
                      const { total, concluded } = getPDIProgress(p, notas);
                      return s + (total > 0 ? concluded / total : 0);
                    }, 0) / pdisAtivos.length * 100
                  )}%
                </p>
                <p className="text-xs text-slate-400">Progresso médio</p>
              </div>
            </div>
          </div>

          {/* PDI list */}
          {pdis.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center text-slate-500">
              <Target size={36} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhum PDI criado ainda.</p>
              <p className="text-xs text-slate-600 mt-1">Crie PDIs a partir da aba Gap Analysis.</p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="px-5 py-3 text-left text-xs text-slate-400 font-medium">Colaborador</th>
                    <th className="px-4 py-3 text-left text-xs text-slate-400 font-medium">PDI</th>
                    <th className="px-4 py-3 text-center text-xs text-slate-400 font-medium">Progresso</th>
                    <th className="px-4 py-3 text-center text-xs text-slate-400 font-medium">Prazo</th>
                    <th className="px-4 py-3 text-center text-xs text-slate-400 font-medium">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {pdis.map((pdi) => {
                    const colab = colaboradores.find((c) => c.id === pdi.colaboradorId);
                    const { total, concluded } = getPDIProgress(pdi, notas);
                    const pct = total > 0 ? Math.round((concluded / total) * 100) : 0;
                    const vencido = pdi.status === "ativo" && new Date(pdi.dataFim) < new Date();
                    return (
                      <tr key={pdi.id} className="border-b border-slate-700/20 hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-600/30 flex items-center justify-center text-[10px] font-bold text-blue-400">
                              {colab?.nome.split(" ").map((n) => n[0]).slice(0, 2).join("") ?? "?"}
                            </div>
                            <span className="text-sm text-white">{colab?.nome ?? "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300 max-w-[200px] truncate">{pdi.titulo}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-24 h-2 rounded-full bg-slate-700 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? "#22C55E" : "#3B82F6" }}
                              />
                            </div>
                            <span className="text-xs text-slate-400 w-10">{concluded}/{total}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs ${vencido ? "text-red-400" : "text-slate-400"}`}>
                            {fmtDate(pdi.dataFim)}
                            {vencido && " ⚠"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            pdi.status === "ativo" ? "bg-blue-500/15 text-blue-400" :
                            pdi.status === "concluido" ? "bg-emerald-500/15 text-emerald-400" :
                            "bg-slate-700 text-slate-400"
                          }`}>
                            {pdi.status === "ativo" ? "Ativo" : pdi.status === "concluido" ? "Concluído" : "Cancelado"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setDetailPDI(pdi)}
                            className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Create PDI Modal ── */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setCreateModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-white mb-1">Novo PDI</h3>
            <p className="text-slate-400 text-sm mb-5">{createModal.colab.nome} — {CARGO_LABELS[createModal.colab.cargo]}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Título</label>
                <input
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Prazo final</label>
                <input
                  type="date"
                  value={form.dataFim}
                  onChange={(e) => setForm({ ...form, dataFim: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Metas <span className="text-slate-500 text-xs">(pré-preenchidas pelos gaps)</span>
                </label>
                <div className="space-y-2">
                  {form.metas.map((meta, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                      <div className="flex-1 text-xs text-slate-300 truncate">{meta.compNome}</div>
                      <div className="flex items-center gap-1.5 text-xs shrink-0">
                        <span className="text-slate-500">Nível alvo:</span>
                        <select
                          value={meta.nivelAlvo}
                          onChange={(e) => {
                            const updated = [...form.metas];
                            updated[i] = { ...updated[i], nivelAlvo: Number(e.target.value) as NivelCompetencia };
                            setForm({ ...form, metas: updated });
                          }}
                          className="px-2 py-1 rounded bg-slate-700 border border-slate-600 text-white text-xs focus:outline-none"
                        >
                          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <button
                        onClick={() => setForm({ ...form, metas: form.metas.filter((_, j) => j !== i) })}
                        className="text-slate-500 hover:text-red-400"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add meta from remaining competencias */}
                <button
                  onClick={() => {
                    const used = new Set(form.metas.map((m) => m.competenciaId));
                    const first = competencias.find(
                      (c) => c.cargosAplicaveis.includes(createModal.colab.cargo) && !used.has(c.id)
                    );
                    if (first) {
                      setForm({
                        ...form,
                        metas: [...form.metas, { competenciaId: first.id, nivelAlvo: 1, prazo: "", compNome: first.nome }],
                      });
                    }
                  }}
                  className="mt-2 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
                >
                  <Plus size={12} /> Adicionar meta
                </button>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Observações</label>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none placeholder-slate-500"
                  placeholder="Contexto, acordos com o colaborador..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCreateModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreatePDI}
                disabled={!form.titulo || !form.dataFim || form.metas.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Target size={16} /> Criar PDI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PDI Detail Modal ── */}
      {detailPDI && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setDetailPDI(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-white mb-1">{detailPDI.titulo}</h3>
            <div className="flex items-center gap-4 mb-5 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Calendar size={12} /> Prazo: {fmtDate(detailPDI.dataFim)}</span>
              <span className={`px-2 py-0.5 rounded-full font-semibold ${
                detailPDI.status === "ativo" ? "bg-blue-500/15 text-blue-400" : "bg-emerald-500/15 text-emerald-400"
              }`}>
                {detailPDI.status === "ativo" ? "Ativo" : "Concluído"}
              </span>
            </div>

            {/* Progress bar */}
            {(() => {
              const { total, concluded } = getPDIProgress(detailPDI, notas);
              const pct = total > 0 ? Math.round((concluded / total) * 100) : 0;
              return (
                <div className="mb-5 p-3 rounded-xl bg-slate-800/50">
                  <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span>Progresso geral</span>
                    <span className="font-semibold text-white">{concluded}/{total} metas ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? "#22C55E" : "#3B82F6" }} />
                  </div>
                </div>
              );
            })()}

            {/* Metas */}
            <div className="space-y-2 mb-5">
              {detailPDI.metas.map((meta, i) => {
                const comp = competencias.find((c) => c.id === meta.competenciaId);
                const atual = notas[detailPDI.colaboradorId]?.[meta.competenciaId] ?? 0 as NivelCompetencia;
                const concluida = atual >= meta.nivelAlvo;
                return (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${
                    concluida ? "bg-emerald-500/5 border-emerald-500/20" : "bg-slate-800/40 border-slate-700/40"
                  }`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      concluida ? "bg-emerald-500/20" : "bg-slate-700"
                    }`}>
                      {concluida ? <CheckCircle size={12} className="text-emerald-400" /> : <Clock size={12} className="text-slate-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${concluida ? "text-emerald-300 line-through opacity-70" : "text-slate-200"}`}>
                        {comp?.nome ?? meta.competenciaId}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs shrink-0">
                      <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-white" style={{ backgroundColor: NIVEL_COLORS[atual as NivelCompetencia] }}>{atual}</span>
                      <span className="text-slate-500">→</span>
                      <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-white" style={{ backgroundColor: NIVEL_COLORS[meta.nivelAlvo] }}>{meta.nivelAlvo}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {detailPDI.observacoes && (
              <p className="text-xs text-slate-400 mb-5 p-3 rounded-xl bg-slate-800/40">
                {detailPDI.observacoes}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setDetailPDI(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 text-sm"
              >
                Fechar
              </button>
              {detailPDI.status === "ativo" && (
                <button
                  onClick={() => handleClosePDI(detailPDI)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm"
                >
                  Marcar Concluído
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
