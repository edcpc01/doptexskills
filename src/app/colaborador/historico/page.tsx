"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { AvaliacaoCompetencia, AvaliacaoDesempenho, Assiduidade, Competencia } from "@/lib/types";
import { NIVEL_LABELS, NIVEL_COLORS, type NivelCompetencia } from "@/lib/types";
import { History, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function HistoricoPage() {
  const { profile } = useAuth();
  const [avalComps, setAvalComps] = useState<(AvaliacaoCompetencia & { compNome: string })[]>([]);
  const [avalDes, setAvalDes] = useState<AvaliacaoDesempenho[]>([]);
  const [assids, setAssids] = useState<Assiduidade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.colaboradorId) loadData();
  }, [profile]);

  const loadData = async () => {
    try {
      const colabId = profile?.colaboradorId;
      const [avalCompSnap, avalDesSnap, assidSnap, compSnap] = await Promise.all([
        getDocs(collection(db, "avaliacoes_competencia")),
        getDocs(collection(db, "avaliacao_desempenho")),
        getDocs(collection(db, "assiduidade")),
        getDocs(collection(db, "competencias")),
      ]);
      const comps = Object.fromEntries(compSnap.docs.map((d) => [d.id, d.data().nome as string]));
      setAvalComps(
        avalCompSnap.docs
          .map((d) => ({ id: d.id, ...d.data(), compNome: comps[(d.data() as AvaliacaoCompetencia).competenciaId] || "—" } as any))
          .filter((a: any) => a.colaboradorId === colabId)
          .sort((a: any, b: any) => b.dataAvaliacao.localeCompare(a.dataAvaliacao))
      );
      setAvalDes(avalDesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AvaliacaoDesempenho)).filter((a) => a.colaboradorId === colabId).sort((a, b) => b.mes.localeCompare(a.mes)));
      setAssids(assidSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Assiduidade)).filter((a) => a.colaboradorId === colabId).sort((a, b) => b.mes.localeCompare(a.mes)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const desChart = avalDes.slice().reverse().slice(-12).map((a) => ({
    mes: new Date(a.mes + "-01").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
    nota: a.nota,
  }));

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Meu Histórico</h1>
        <p className="text-sm text-slate-400 mt-1">Acompanhe sua evolução ao longo do tempo</p>
      </div>

      {/* Desempenho chart */}
      {desChart.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Evolução de Desempenho</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={desChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="mes" tick={{ fill: "#94A3B8", fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#94A3B8", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 12, color: "#F8FAFC" }} />
              <Line type="monotone" dataKey="nota" stroke="#2563EB" strokeWidth={2} dot={{ r: 3, fill: "#2563EB" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent competency changes */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Histórico de Competências</h3>
        {avalComps.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">Nenhum registro ainda</p>
        ) : (
          <div className="space-y-2">
            {avalComps.slice(0, 20).map((a) => {
              const trend = a.nivelProposto > a.nivelAtual ? "up" : a.nivelProposto < a.nivelAtual ? "down" : "same";
              return (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/30 transition-colors">
                  <div className={`p-1.5 rounded-lg ${trend === "up" ? "bg-green-500/15 text-green-400" : trend === "down" ? "bg-red-500/15 text-red-400" : "bg-slate-700/50 text-slate-400"}`}>
                    {trend === "up" ? <TrendingUp size={14} /> : trend === "down" ? <TrendingDown size={14} /> : <Minus size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{a.compNome}</p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(a.dataAvaliacao).toLocaleDateString("pt-BR")} · {a.status === "aprovado" ? "Aprovado" : a.status === "reprovado" ? "Reprovado" : a.status === "pendente_prova" ? "Pendente" : "Confirmado"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-6 h-6 rounded text-[10px] font-bold text-white flex items-center justify-center"
                      style={{ backgroundColor: NIVEL_COLORS[a.nivelAtual] }}>{a.nivelAtual}</span>
                    <span className="text-slate-500 text-xs">→</span>
                    <span className="w-6 h-6 rounded text-[10px] font-bold text-white flex items-center justify-center"
                      style={{ backgroundColor: NIVEL_COLORS[a.nivelProposto] }}>{a.nivelProposto}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assiduidade history */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Histórico de Assiduidade</h3>
        {assids.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">Nenhum registro ainda</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {assids.slice(0, 12).map((a) => {
              const color = a.percentualPresenca >= 95 ? "text-green-400 border-green-500/20" : a.percentualPresenca >= 85 ? "text-yellow-300 border-yellow-500/20" : "text-red-400 border-red-500/20";
              return (
                <div key={a.id} className={`p-3 rounded-xl border bg-slate-800/30 text-center ${color}`}>
                  <p className="text-[10px] text-slate-400 capitalize">
                    {new Date(a.mes + "-01").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })}
                  </p>
                  <p className="text-xl font-bold mt-1">{a.percentualPresenca}%</p>
                  <p className="text-[10px] text-slate-500">{a.faltas} falta(s)</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
