"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { AvaliacaoCompetencia, Competencia, AvaliacaoDesempenho, Assiduidade, NivelCompetencia } from "@/lib/types";
import { NIVEL_LABELS, NIVEL_COLORS, PESOS_DEFAULT } from "@/lib/types";
import { Award, TrendingUp, CalendarCheck, Target } from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export default function DashboardColaborador() {
  const { profile } = useAuth();
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [avalComps, setAvalComps] = useState<AvaliacaoCompetencia[]>([]);
  const [avalDes, setAvalDes] = useState<AvaliacaoDesempenho[]>([]);
  const [assids, setAssids] = useState<Assiduidade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.colaboradorId) loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile?.colaboradorId) return;
    try {
      const colabId = profile.colaboradorId;
      const [compSnap, avalCompSnap, avalDesSnap, assidSnap] = await Promise.all([
        getDocs(collection(db, "competencias")),
        getDocs(collection(db, "avaliacoes_competencia")),
        getDocs(collection(db, "avaliacao_desempenho")),
        getDocs(collection(db, "assiduidade")),
      ]);

      setCompetencias(compSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Competencia)));
      setAvalComps(
        avalCompSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as AvaliacaoCompetencia))
          .filter((a) => a.colaboradorId === colabId)
      );
      setAvalDes(
        avalDesSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as AvaliacaoDesempenho))
          .filter((a) => a.colaboradorId === colabId)
      );
      setAssids(
        assidSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Assiduidade))
          .filter((a) => a.colaboradorId === colabId)
      );
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate IDC
  const confirmedAvals = avalComps.filter((a) => a.status === "confirmado" || a.status === "aprovado");
  const niveis = confirmedAvals.map((a) => a.nivelProposto as number);
  const mediaComp = niveis.length > 0 ? (niveis.reduce((s, n) => s + n, 0) / (niveis.length * 4)) * 100 : 0;

  const latestDes = avalDes.sort((a, b) => b.mes.localeCompare(a.mes))[0];
  const desempenho = latestDes ? latestDes.nota : 0;

  const latestAssid = assids.sort((a, b) => b.mes.localeCompare(a.mes))[0];
  const assiduidade = latestAssid ? latestAssid.percentualPresenca : 0;

  const eficiencia = mediaComp;
  const idc = Math.round(mediaComp * PESOS_DEFAULT.competencias + eficiencia * PESOS_DEFAULT.eficiencia + desempenho * PESOS_DEFAULT.desempenho + assiduidade * PESOS_DEFAULT.assiduidade);

  const radarData = [
    { pilar: "Competências", valor: Math.round(mediaComp), fullMark: 100 },
    { pilar: "Eficiência", valor: Math.round(eficiencia), fullMark: 100 },
    { pilar: "Desempenho", valor: Math.round(desempenho), fullMark: 100 },
    { pilar: "Assiduidade", valor: Math.round(assiduidade), fullMark: 100 },
  ];

  // Evolution chart (monthly desempenho)
  const evolutionData = avalDes
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .slice(-12)
    .map((a) => ({
      mes: new Date(a.mes + "-01").toLocaleDateString("pt-BR", { month: "short" }),
      nota: a.nota,
    }));

  // Competencia details
  const compDetails = confirmedAvals.map((a) => {
    const comp = competencias.find((c) => c.id === a.competenciaId);
    return { nome: comp?.nome || "—", nivel: a.nivelProposto, grupo: comp?.grupo || "" };
  });

  const pendingProvas = avalComps.filter((a) => a.status === "pendente_prova");

  const idcLabel = idc >= 90 ? "Excelente" : idc >= 70 ? "Bom" : idc >= 50 ? "Em Desenvolvimento" : "Atenção";
  const idcColor = idc >= 90 ? "text-green-400" : idc >= 70 ? "text-emerald-300" : idc >= 50 ? "text-yellow-300" : "text-red-400";

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* IDC Hero */}
      <div className="glass-card rounded-2xl p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-cyan-600/5" />
        <div className="relative z-10">
          <p className="text-sm text-slate-400 mb-2">Índice de Desenvolvimento</p>
          <p className={`text-6xl font-bold ${idcColor}`}>{idc}%</p>
          <p className={`text-sm mt-1 ${idcColor}`}>{idcLabel}</p>
        </div>
      </div>

      {/* Pending provas alert */}
      {pendingProvas.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-center gap-3">
          <Target size={20} className="text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-yellow-300 font-medium">
              Você tem {pendingProvas.length} prova(s) pendente(s)
            </p>
            <p className="text-xs text-yellow-400/70">Complete as provas para subir seu nível de competência</p>
          </div>
        </div>
      )}

      {/* Pilars + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="grid grid-cols-2 gap-3">
          <PilarCard icon={<Award size={20} />} label="Competências" value={`${Math.round(mediaComp)}%`} weight="35%" color="blue" />
          <PilarCard icon={<TrendingUp size={20} />} label="Eficiência" value={`${Math.round(eficiencia)}%`} weight="25%" color="cyan" />
          <PilarCard icon={<Target size={20} />} label="Desempenho" value={`${Math.round(desempenho)}%`} weight="25%" color="purple" />
          <PilarCard icon={<CalendarCheck size={20} />} label="Assiduidade" value={`${Math.round(assiduidade)}%`} weight="15%" color="green" />
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Visão dos 4 Pilares</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="pilar" tick={{ fill: "#94A3B8", fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#64748B", fontSize: 10 }} />
              <Radar dataKey="valor" stroke="#2563EB" fill="#2563EB" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Competencias list */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Minhas Competências</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {compDetails.map((c, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/50 transition-colors">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: NIVEL_COLORS[c.nivel as NivelCompetencia] }}
              >
                {c.nivel}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-white truncate">{c.nome}</p>
                <p className="text-[10px] text-slate-500">{c.grupo}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PilarCard({
  icon, label, value, weight, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  weight: string;
  color: "blue" | "cyan" | "purple" | "green";
}) {
  const colors = {
    blue: "from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400",
    cyan: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/20 text-cyan-400",
    purple: "from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400",
    green: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
  };

  return (
    <div className={`rounded-2xl p-4 bg-gradient-to-br border ${colors[color]}`}>
      <div className="flex items-center justify-between mb-3">{icon}<span className="text-[10px] text-slate-500">Peso: {weight}</span></div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
