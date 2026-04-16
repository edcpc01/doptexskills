"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Colaborador, AvaliacaoCompetencia, AvaliacaoDesempenho, Assiduidade, NivelCompetencia } from "@/lib/types";
import { CARGO_LABELS } from "@/lib/types";
import { Users, TrendingUp, Award, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, Legend,
} from "recharts";

interface ColabStats {
  id: string;
  nome: string;
  cargo: string;
  mediaCompetencias: number;
  eficiencia: number;
  desempenho: number;
  assiduidade: number;
  idc: number;
}

export default function DashboardGestor() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [stats, setStats] = useState<ColabStats[]>([]);
  const [pendentes, setPendentes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [colabSnap, avalCompSnap, avalDesSnap, assidSnap] = await Promise.all([
        getDocs(collection(db, "colaboradores")),
        getDocs(collection(db, "avaliacoes_competencia")),
        getDocs(collection(db, "avaliacao_desempenho")),
        getDocs(collection(db, "assiduidade")),
      ]);

      const colabs = colabSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Colaborador));
      const avalComps = avalCompSnap.docs.map((d) => d.data() as AvaliacaoCompetencia);
      const avalDes = avalDesSnap.docs.map((d) => d.data() as AvaliacaoDesempenho);
      const assids = assidSnap.docs.map((d) => d.data() as Assiduidade);

      // Count pending provas
      const pend = avalComps.filter((a) => a.status === "pendente_prova").length;
      setPendentes(pend);

      // Calculate stats per colaborador
      const colabStats: ColabStats[] = colabs
        .filter((c) => c.ativo)
        .map((c) => {
          // Media competencias (latest confirmed evals)
          const colabAvals = avalComps.filter(
            (a) => a.colaboradorId === c.id && (a.status === "confirmado" || a.status === "aprovado")
          );
          const niveis = colabAvals.map((a) => a.nivelProposto as number);
          const mediaComp = niveis.length > 0 ? (niveis.reduce((s, n) => s + n, 0) / (niveis.length * 4)) * 100 : 0;

          // Desempenho (latest month)
          const colabDes = avalDes.filter((a) => a.colaboradorId === c.id);
          const latestDes = colabDes.sort((a, b) => b.mes.localeCompare(a.mes))[0];
          const desempenho = latestDes ? latestDes.nota : 0;

          // Assiduidade (latest month)
          const colabAssid = assids.filter((a) => a.colaboradorId === c.id);
          const latestAssid = colabAssid.sort((a, b) => b.mes.localeCompare(a.mes))[0];
          const assiduidade = latestAssid ? latestAssid.percentualPresenca : 0;

          // Eficiência (from competencias)
          const eficiencia = mediaComp; // Simplificado — na prática viria da aba Eficiência

          // IDC
          const idc = mediaComp * 0.35 + eficiencia * 0.25 + desempenho * 0.25 + assiduidade * 0.15;

          return {
            id: c.id,
            nome: c.nome,
            cargo: c.cargo,
            mediaCompetencias: Math.round(mediaComp),
            eficiencia: Math.round(eficiencia),
            desempenho: Math.round(desempenho),
            assiduidade: Math.round(assiduidade),
            idc: Math.round(idc),
          };
        })
        .sort((a, b) => b.idc - a.idc);

      setColaboradores(colabs);
      setStats(colabStats);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalColabs = colaboradores.filter((c) => c.ativo).length;
  const mediaIDC = stats.length > 0 ? Math.round(stats.reduce((s, c) => s + c.idc, 0) / stats.length) : 0;
  const emAtencao = stats.filter((c) => c.idc < 50).length;

  const idcDistribution = [
    { faixa: "Excelente (≥90)", count: stats.filter((c) => c.idc >= 90).length, color: "#15803D" },
    { faixa: "Bom (70-89)", count: stats.filter((c) => c.idc >= 70 && c.idc < 90).length, color: "#22C55E" },
    { faixa: "Desenv. (50-69)", count: stats.filter((c) => c.idc >= 50 && c.idc < 70).length, color: "#EAB308" },
    { faixa: "Atenção (<50)", count: stats.filter((c) => c.idc < 50).length, color: "#EF4444" },
  ];

  // Radar data for team average
  const radarData = [
    { pilar: "Competências", valor: stats.length > 0 ? Math.round(stats.reduce((s, c) => s + c.mediaCompetencias, 0) / stats.length) : 0 },
    { pilar: "Eficiência", valor: stats.length > 0 ? Math.round(stats.reduce((s, c) => s + c.eficiencia, 0) / stats.length) : 0 },
    { pilar: "Desempenho", valor: stats.length > 0 ? Math.round(stats.reduce((s, c) => s + c.desempenho, 0) / stats.length) : 0 },
    { pilar: "Assiduidade", valor: stats.length > 0 ? Math.round(stats.reduce((s, c) => s + c.assiduidade, 0) / stats.length) : 0 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Carregando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={<Users size={22} />} label="Colaboradores" value={totalColabs} color="blue" />
        <KPICard icon={<TrendingUp size={22} />} label="IDC Médio" value={`${mediaIDC}%`} color="green" />
        <KPICard icon={<Clock size={22} />} label="Provas Pendentes" value={pendentes} color="yellow" pulse={pendentes > 0} />
        <KPICard icon={<AlertTriangle size={22} />} label="Em Atenção" value={emAtencao} color="red" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar da equipe */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Média da Equipe — 4 Pilares</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="pilar" tick={{ fill: "#94A3B8", fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#64748B", fontSize: 10 }} />
              <Radar name="Equipe" dataKey="valor" stroke="#2563EB" fill="#2563EB" fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição IDC */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Distribuição IDC</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={idcDistribution} layout="vertical">
              <XAxis type="number" tick={{ fill: "#94A3B8", fontSize: 11 }} />
              <YAxis type="category" dataKey="faixa" tick={{ fill: "#94A3B8", fontSize: 11 }} width={120} />
              <Tooltip
                contentStyle={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 12, color: "#F8FAFC" }}
              />
              <Bar dataKey="count" name="Colaboradores" radius={[0, 8, 8, 0]}>
                {idcDistribution.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4 Pilares por Colaborador */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">4 Pilares por Colaborador</h3>
        {stats.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Nenhum dado disponível</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={stats.map((c) => ({
                nome: c.nome.split(" ")[0],
                Competências: c.mediaCompetencias,
                Eficiência: c.eficiencia,
                Desempenho: c.desempenho,
                Assiduidade: c.assiduidade,
              }))}
              margin={{ top: 4, right: 8, left: -10, bottom: 4 }}
            >
              <XAxis dataKey="nome" tick={{ fill: "#94A3B8", fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#64748B", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 12, color: "#F8FAFC" }}
                formatter={(value: number, name: string) => [`${value}%`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />
              <Bar dataKey="Competências" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Eficiência" fill="#06B6D4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Desempenho" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Assiduidade" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 6 mais desenvolvidos */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award size={16} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-300">Mais Desenvolvidos</h3>
          </div>
          <div className="space-y-2">
            {stats.slice(0, 6).map((colab, i) => (
              <RankingRow key={colab.id} colab={colab} position={i + 1} variant="top" />
            ))}
          </div>
        </div>

        {/* 6 que precisam de atenção */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-red-400" />
            <h3 className="text-sm font-semibold text-slate-300">Precisam de Atenção</h3>
          </div>
          <div className="space-y-2">
            {[...stats].reverse().slice(0, 6).map((colab, i) => (
              <RankingRow key={colab.id} colab={colab} position={stats.length - i} variant="bottom" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({
  icon, label, value, color, pulse,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "blue" | "green" | "yellow" | "red";
  pulse?: boolean;
}) {
  const colorMap = {
    blue: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    yellow: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    red: "bg-red-500/15 text-red-400 border-red-500/20",
  };
  const iconColor = {
    blue: "text-blue-400",
    green: "text-emerald-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
  };

  return (
    <div className={`glass-card rounded-2xl p-5 border ${colorMap[color]} ${pulse ? "pulse-pending" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={iconColor[color]}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  );
}

function RankingRow({
  colab, position, variant,
}: {
  colab: ColabStats;
  position: number;
  variant: "top" | "bottom";
}) {
  const avatarColor = variant === "top" ? "bg-emerald-600/20 text-emerald-400" : "bg-red-600/20 text-red-400";
  const posColor = variant === "top" ? "text-emerald-500" : "text-red-500";

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 transition-colors">
      <span className={`text-sm font-bold w-5 text-right ${posColor}`}>{position}</span>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${avatarColor}`}>
        {colab.nome.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{colab.nome}</p>
        <p className="text-[10px] text-slate-500">{CARGO_LABELS[colab.cargo as keyof typeof CARGO_LABELS]}</p>
      </div>
      <div className="hidden md:flex items-center gap-3 text-[10px] text-slate-400">
        <MiniBar label="Comp" value={colab.mediaCompetencias} color="#2563EB" />
        <MiniBar label="Efic" value={colab.eficiencia} color="#06B6D4" />
        <MiniBar label="Desemp" value={colab.desempenho} color="#8B5CF6" />
        <MiniBar label="Assid" value={colab.assiduidade} color="#10B981" />
      </div>
      <div
        className={`px-3 py-1 rounded-full text-xs font-bold ${
          colab.idc >= 90
            ? "bg-green-700/30 text-green-400"
            : colab.idc >= 70
            ? "bg-green-500/20 text-green-300"
            : colab.idc >= 50
            ? "bg-yellow-500/20 text-yellow-300"
            : "bg-red-500/20 text-red-300"
        }`}
      >
        {colab.idc}%
      </div>
    </div>
  );
}

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="w-16">
      <div className="flex justify-between mb-0.5">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full animate-fill" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
