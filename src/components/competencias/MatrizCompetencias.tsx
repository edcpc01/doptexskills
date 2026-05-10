"use client";

import { useState, useEffect, type CSSProperties } from "react";
import { collection, getDocs, addDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type {
  Colaborador,
  Competencia,
  NivelCompetencia,
  AvaliacaoCompetencia,
  GrupoCompetencia,
  CargoType,
} from "@/lib/types";
import { NIVEL_LABELS, NIVEL_COLORS, CARGO_LABELS } from "@/lib/types";
import { X, TrendingUp, Send, Filter, Loader2, CheckCircle } from "lucide-react";

interface NotasMap {
  [colaboradorId: string]: {
    [competenciaId: string]: NivelCompetencia;
  };
}

type AvalEntry = {
  nivelAtual: NivelCompetencia;
  nivelProposto: NivelCompetencia;
  dataAvaliacao: string;
};

// Builds the display level map from all evaluations.
// For each (colaborador, competência) pair:
//   - If there's an "aprovado"/"confirmado" doc, use the most recent one → nivelProposto
//   - Otherwise fall back to the most recent pending doc → nivelAtual
function buildNotasMap(docs: AvaliacaoCompetencia[]): NotasMap {
  const bestApproved: Record<string, Record<string, AvalEntry>> = {};
  const bestPending: Record<string, Record<string, AvalEntry>> = {};

  docs.forEach((aval) => {
    const isApproved = aval.status === "confirmado" || aval.status === "aprovado";
    const target = isApproved ? bestApproved : bestPending;

    if (!target[aval.colaboradorId]) target[aval.colaboradorId] = {};
    const existing = target[aval.colaboradorId][aval.competenciaId];
    if (!existing || aval.dataAvaliacao > existing.dataAvaliacao) {
      target[aval.colaboradorId][aval.competenciaId] = {
        nivelAtual: aval.nivelAtual,
        nivelProposto: aval.nivelProposto,
        dataAvaliacao: aval.dataAvaliacao,
      };
    }
  });

  const notasMap: NotasMap = {};
  const allColabs = new Set([...Object.keys(bestApproved), ...Object.keys(bestPending)]);

  allColabs.forEach((colabId) => {
    notasMap[colabId] = {};
    const approved = bestApproved[colabId] || {};
    const pending = bestPending[colabId] || {};
    const allComps = new Set([...Object.keys(approved), ...Object.keys(pending)]);

    allComps.forEach((compId) => {
      if (approved[compId]) {
        notasMap[colabId][compId] = approved[compId].nivelProposto;
      } else {
        notasMap[colabId][compId] = pending[compId].nivelAtual;
      }
    });
  });

  return notasMap;
}

export default function MatrizCompetencias() {
  const { profile } = useAuth();
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [notas, setNotas] = useState<NotasMap>({});
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{
    colaborador: Colaborador;
    competencia: Competencia;
    nivelAtual: NivelCompetencia;
  } | null>(null);
  const [nivelProposto, setNivelProposto] = useState<NivelCompetencia>(0);
  const [justificativa, setJustificativa] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterCargo, setFilterCargo] = useState<CargoType | "TODOS">("TODOS");
  const [filterGrupo, setFilterGrupo] = useState<GrupoCompetencia | "TODOS">("TODOS");
  const [toast, setToast] = useState<{ type: "success" | "error" | "warning"; msg: string } | null>(null);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Load static data once, then subscribe to evaluations in real time
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      try {
        const [colabSnap, compSnap] = await Promise.all([
          getDocs(collection(db, "colaboradores")),
          getDocs(collection(db, "competencias")),
        ]);
        if (cancelled) return;

        setColaboradores(
          colabSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as Colaborador))
            .sort((a, b) => a.nome.localeCompare(b.nome))
        );
        setCompetencias(
          compSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as Competencia))
            .sort((a, b) => a.ordem - b.ordem)
        );

        unsubscribe = onSnapshot(
          collection(db, "avaliacoes_competencia"),
          (snap) => {
            const avals = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AvaliacaoCompetencia));
            setNotas(buildNotasMap(avals));
            setLoading(false);
          },
          (err) => {
            console.error("Erro no listener de avaliações:", err);
            setLoading(false);
          }
        );
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleCellClick = (colab: Colaborador, comp: Competencia) => {
    const nivel = notas[colab.id]?.[comp.id] ?? (0 as NivelCompetencia);
    setSelectedCell({ colaborador: colab, competencia: comp, nivelAtual: nivel });
    setNivelProposto(nivel);
    setJustificativa("");
  };

  const handleSaveAvaliacao = async () => {
    if (!selectedCell || !profile) return;
    setSaving(true);

    try {
      const isPromotion = nivelProposto > selectedCell.nivelAtual;
      // Levels 0→1 and 1→2 don't require an exam — direct manager approval
      const needsExam = isPromotion && nivelProposto >= 3;

      const avalData: Omit<AvaliacaoCompetencia, "id"> = {
        colaboradorId: selectedCell.colaborador.id,
        competenciaId: selectedCell.competencia.id,
        nivelAtual: selectedCell.nivelAtual,
        nivelProposto,
        avaliadorId: profile.uid,
        dataAvaliacao: new Date().toISOString(),
        periodoReferencia: `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
        status: needsExam ? "pendente_prova" : "confirmado",
        provaEnviada: false,
        justificativa,
      };

      const docRef = await addDoc(collection(db, "avaliacoes_competencia"), avalData);

      if (needsExam) {
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          const res = await fetch("/api/provas/enviar", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ avaliacaoId: docRef.id }),
          });
          const data = await res.json();
          if (res.ok) {
            setToast({ type: "success", msg: data.message || "Prova enviada com sucesso!" });
          } else {
            setToast({
              type: "warning",
              msg: `Avaliação criada, mas falha ao enviar prova: ${data.error}. Envie pela aba Provas.`,
            });
          }
        }
      } else {
        setToast({
          type: "success",
          msg: isPromotion
            ? `${selectedCell.colaborador.nome.split(" ")[0]} promovido de nível ${selectedCell.nivelAtual} para ${nivelProposto}!`
            : "Avaliação salva.",
        });
      }

      setSelectedCell(null);
    } catch (error) {
      console.error("Erro ao salvar avaliação:", error);
      setToast({ type: "error", msg: "Erro ao salvar. Tente novamente." });
    } finally {
      setSaving(false);
    }
  };

  // Filter data
  const filteredColabs = colaboradores.filter(
    (c) => filterCargo === "TODOS" || c.cargo === filterCargo
  );

  const filteredComps = competencias.filter((c) => {
    const cargoMatch =
      filterCargo === "TODOS" || c.cargosAplicaveis.includes(filterCargo as CargoType);
    const grupoMatch = filterGrupo === "TODOS" || c.grupo === filterGrupo;
    return cargoMatch && grupoMatch;
  });

  const grupos = [...new Set(filteredComps.map((c) => c.grupo))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Carregando matriz...</div>
      </div>
    );
  }

  const isPromotion = selectedCell ? nivelProposto > selectedCell.nivelAtual : false;
  const needsExam = isPromotion && nivelProposto >= 3;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium max-w-md ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : toast.type === "warning"
              ? "bg-yellow-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Filter size={16} />
          <span>Filtros:</span>
        </div>
        <select
          value={filterCargo}
          onChange={(e) => setFilterCargo(e.target.value as CargoType | "TODOS")}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-600/50 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="TODOS">Todos os cargos</option>
          {Object.entries(CARGO_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={filterGrupo}
          onChange={(e) => setFilterGrupo(e.target.value as GrupoCompetencia | "TODOS")}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-600/50 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="TODOS">Todos os grupos</option>
          {grupos.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {/* Matrix Grid */}
      <div className="overflow-x-auto glass-card rounded-2xl p-4">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-slate-900/95 p-2 min-w-[200px]" />
              {grupos.map((grupo) => {
                const count = filteredComps.filter((c) => c.grupo === grupo).length;
                return (
                  <th
                    key={grupo}
                    colSpan={count}
                    className="px-2 py-2 text-[10px] uppercase tracking-wider text-blue-400 font-semibold text-center border-b border-slate-700/50"
                  >
                    {grupo}
                  </th>
                );
              })}
            </tr>
            <tr>
              <th className="sticky left-0 z-20 bg-slate-900/95 p-2 text-left text-xs text-slate-400 font-medium">
                Colaborador
              </th>
              {filteredComps.map((comp) => (
                <th
                  key={comp.id}
                  className="p-1 text-center border-b border-slate-700/30"
                  style={{ minWidth: 40 }}
                >
                  <div
                    className="writing-mode-vertical text-[9px] text-slate-400 font-normal whitespace-nowrap overflow-hidden"
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                      height: 100,
                      lineHeight: "40px",
                    }}
                    title={comp.nome}
                  >
                    {comp.nome.length > 20 ? comp.nome.slice(0, 20) + "…" : comp.nome}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredColabs.map((colab) => (
              <tr key={colab.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="sticky left-0 z-10 bg-slate-900/95 px-3 py-2 text-sm text-slate-200 font-medium whitespace-nowrap border-b border-slate-700/20">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-600/30 flex items-center justify-center text-[10px] font-bold text-blue-400 flex-shrink-0">
                      {colab.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <p className="text-xs">{colab.nome.split(" ").slice(0, 2).join(" ")}</p>
                      <p className="text-[10px] text-slate-500">{CARGO_LABELS[colab.cargo]}</p>
                    </div>
                  </div>
                </td>
                {filteredComps.map((comp) => {
                  const nivel = (notas[colab.id]?.[comp.id] ?? null) as NivelCompetencia | null;
                  const isApplicable = comp.cargosAplicaveis.includes(colab.cargo);
                  return (
                    <td key={comp.id} className="p-0.5 text-center border-b border-slate-700/10">
                      {isApplicable ? (
                        <button
                          onClick={() => handleCellClick(colab, comp)}
                          className="heatmap-cell w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white mx-auto cursor-pointer"
                          style={{
                            backgroundColor: nivel !== null ? NIVEL_COLORS[nivel] : "#475569",
                          }}
                          title={`${colab.nome} — ${comp.nome}: ${nivel !== null ? NIVEL_LABELS[nivel] : "Não avaliado"}`}
                        >
                          {nivel !== null ? nivel : "–"}
                        </button>
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-slate-800/30 mx-auto" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-400">
        {([0, 1, 2, 3, 4] as NivelCompetencia[]).map((n) => (
          <div key={n} className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: NIVEL_COLORS[n] }}
            />
            <span>{n} — {NIVEL_LABELS[n].split("/")[0].trim()}</span>
          </div>
        ))}
      </div>

      {/* Modal de Avaliação */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-lg relative">
            <button
              onClick={() => setSelectedCell(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Avaliar Competência</h3>
            <p className="text-slate-400 text-sm mb-5">
              {selectedCell.colaborador.nome} — {selectedCell.competencia.nome}
            </p>

            {/* Current level */}
            <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-slate-800/50">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold text-white"
                style={{ backgroundColor: NIVEL_COLORS[selectedCell.nivelAtual] }}
              >
                {selectedCell.nivelAtual}
              </div>
              <div>
                <p className="text-xs text-slate-400">Nível atual</p>
                <p className="text-sm text-white">{NIVEL_LABELS[selectedCell.nivelAtual]}</p>
              </div>
            </div>

            {/* New level selector */}
            <div className="mb-5">
              <label className="block text-sm text-slate-300 mb-2">Novo nível</label>
              <div className="flex gap-2">
                {([0, 1, 2, 3, 4] as NivelCompetencia[]).map((n) => (
                  <button
                    key={n}
                    onClick={() => setNivelProposto(n)}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                      nivelProposto === n
                        ? "ring-2 ring-offset-2 ring-offset-slate-900 text-white scale-105"
                        : "text-white/70 hover:text-white"
                    }`}
                    style={{
                      backgroundColor: NIVEL_COLORS[n],
                      ...(nivelProposto === n
                        ? ({ "--tw-ring-color": NIVEL_COLORS[n] } as CSSProperties)
                        : {}),
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">{NIVEL_LABELS[nivelProposto]}</p>
            </div>

            {/* Promotion info */}
            {isPromotion && (
              needsExam ? (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 mb-5">
                  <TrendingUp size={18} className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-blue-300 font-medium">Promoção de nível</p>
                    <p className="text-xs text-blue-400/80 mt-0.5">
                      Uma prova será enviada ao colaborador. O nível só será atualizado após aprovação com nota ≥ 80%.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 mb-5">
                  <CheckCircle size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-emerald-300 font-medium">Aprovação direta</p>
                    <p className="text-xs text-emerald-400/80 mt-0.5">
                      Níveis 0 → 1 e 1 → 2 não exigem prova. O nível será atualizado imediatamente.
                    </p>
                  </div>
                </div>
              )
            )}

            {/* Justificativa */}
            <div className="mb-5">
              <label className="block text-sm text-slate-300 mb-1.5">Justificativa</label>
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm resize-none"
                rows={3}
                placeholder="Observações sobre a avaliação..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedCell(null)}
                className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAvaliacao}
                disabled={saving || nivelProposto === selectedCell.nivelAtual}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {needsExam ? "Enviando..." : "Salvando..."}
                  </>
                ) : isPromotion ? (
                  needsExam ? (
                    <>
                      <Send size={16} />
                      Enviar Prova
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Aprovar
                    </>
                  )
                ) : (
                  "Salvar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
