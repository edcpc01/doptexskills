"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Colaborador, AvaliacaoDesempenho } from "@/lib/types";
import { CARGO_LABELS } from "@/lib/types";
import { Save, ChevronLeft, ChevronRight } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function AvaliacoesDesempenho() {
  const { profile } = useAuth();
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoDesempenho[]>([]);
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [notas, setNotas] = useState<Record<string, number>>({});
  const [observacoes, setObservacoes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [selectedColab, setSelectedColab] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [colabSnap, avalSnap] = await Promise.all([
        getDocs(collection(db, "colaboradores")),
        getDocs(collection(db, "avaliacao_desempenho")),
      ]);
      const colabs = colabSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Colaborador)).filter((c) => c.ativo);
      const avals = avalSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AvaliacaoDesempenho));

      setColaboradores(colabs.sort((a, b) => a.nome.localeCompare(b.nome)));
      setAvaliacoes(avals);

      // Pre-fill notas for current month
      const notasMap: Record<string, number> = {};
      const obsMap: Record<string, string> = {};
      avals
        .filter((a) => a.mes === mesAtual)
        .forEach((a) => {
          notasMap[a.colaboradorId] = a.nota;
          if (a.observacoes) obsMap[a.colaboradorId] = a.observacoes;
        });
      setNotas(notasMap);
      setObservacoes(obsMap);
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const batch = Object.entries(notas).map(([colabId, nota]) =>
        addDoc(collection(db, "avaliacao_desempenho"), {
          colaboradorId: colabId,
          mes: mesAtual,
          nota,
          observacoes: observacoes[colabId] || "",
          avaliadorId: profile.uid,
        })
      );
      await Promise.all(batch);
      await loadData();
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setSaving(false);
    }
  };

  const navigateMonth = (dir: number) => {
    const [y, m] = mesAtual.split("-").map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setMesAtual(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const mesLabel = new Date(mesAtual + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  // Chart data for selected colaborador
  const chartData = selectedColab
    ? avaliacoes
        .filter((a) => a.colaboradorId === selectedColab)
        .sort((a, b) => a.mes.localeCompare(b.mes))
        .slice(-12)
        .map((a) => ({
          mes: new Date(a.mes + "-01").toLocaleDateString("pt-BR", { month: "short" }),
          nota: a.nota,
        }))
    : [];

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Avaliação de Desempenho Mensal</h2>
        <div className="flex items-center gap-3">
          <button onClick={() => navigateMonth(-1)} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-white font-medium capitalize min-w-[140px] text-center">{mesLabel}</span>
          <button onClick={() => navigateMonth(1)} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5">
          <div className="space-y-2">
            {colaboradores.map((colab) => {
              const nota = notas[colab.id] ?? 0;
              const notaColor =
                nota >= 90 ? "text-green-400" : nota >= 70 ? "text-emerald-300" : nota >= 50 ? "text-yellow-300" : "text-red-400";
              return (
                <div
                  key={colab.id}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-colors cursor-pointer ${
                    selectedColab === colab.id ? "bg-blue-500/10 border border-blue-500/30" : "hover:bg-slate-800/50"
                  }`}
                  onClick={() => setSelectedColab(colab.id)}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-[10px] font-bold text-blue-400 flex-shrink-0">
                    {colab.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{colab.nome}</p>
                    <p className="text-[10px] text-slate-500">{CARGO_LABELS[colab.cargo]}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={notas[colab.id] ?? ""}
                      onChange={(e) => setNotas({ ...notas, [colab.id]: Number(e.target.value) })}
                      onClick={(e) => e.stopPropagation()}
                      className="w-16 px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-600/50 text-center text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="0-100"
                    />
                    <span className={`text-sm font-bold w-10 text-right ${notaColor}`}>{nota > 0 ? `${nota}%` : "–"}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Salvando..." : "Salvar Avaliações"}
          </button>
        </div>

        {/* Chart */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            {selectedColab
              ? `Evolução — ${colaboradores.find((c) => c.id === selectedColab)?.nome.split(" ").slice(0, 2).join(" ")}`
              : "Selecione um colaborador"}
          </h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="mes" tick={{ fill: "#94A3B8", fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "#94A3B8", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 12, color: "#F8FAFC" }} />
                <Line type="monotone" dataKey="nota" stroke="#2563EB" strokeWidth={2} dot={{ r: 4, fill: "#2563EB" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-500 text-sm">
              {selectedColab ? "Sem dados ainda" : "Clique em um colaborador"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
