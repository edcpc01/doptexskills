"use client";

import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  Colaborador, Competencia, AvaliacaoCompetencia, NivelEsperado,
  AvaliacaoDesempenho, Assiduidade, NivelCompetencia,
} from "@/lib/types";
import { CARGO_LABELS, NIVEL_LABELS } from "@/lib/types";
import { FileText, Download, FileSpreadsheet, Loader2, Info } from "lucide-react";

// ── CSV helpers ──────────────────────────────────────────────────────────────

function downloadCSV(rows: string[][], filename: string) {
  const BOM = "﻿";
  const content = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildNotasMap(avals: AvaliacaoCompetencia[]) {
  const best: Record<string, Record<string, { nivel: NivelCompetencia; date: string; approved: boolean }>> = {};
  avals.forEach((aval) => {
    const isApproved = aval.status === "confirmado" || aval.status === "aprovado";
    if (!best[aval.colaboradorId]) best[aval.colaboradorId] = {};
    const ex = best[aval.colaboradorId][aval.competenciaId];
    const nivelShow = isApproved ? aval.nivelProposto : aval.nivelAtual;
    if (!ex || (isApproved && !ex.approved) || (isApproved === ex.approved && aval.dataAvaliacao > ex.date)) {
      best[aval.colaboradorId][aval.competenciaId] = { nivel: nivelShow, date: aval.dataAvaliacao, approved: isApproved };
    }
  });
  const map: Record<string, Record<string, NivelCompetencia>> = {};
  Object.entries(best).forEach(([cId, comps]) => {
    map[cId] = {};
    Object.entries(comps).forEach(([compId, v]) => { map[cId][compId] = v.nivel; });
  });
  return map;
}

// ── Report definitions ───────────────────────────────────────────────────────

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  format: "CSV";
}

const REPORTS: ReportCard[] = [
  {
    id: "matriz",
    title: "Matriz de Competências",
    description: "Todos os colaboradores × competências com nível atual e nível esperado por cargo.",
    icon: <FileSpreadsheet size={22} className="text-emerald-400" />,
    format: "CSV",
  },
  {
    id: "gaps",
    title: "Relatório de Gaps",
    description: "Lista de colaboradores com lacunas em relação ao nível esperado por cargo.",
    icon: <FileSpreadsheet size={22} className="text-yellow-400" />,
    format: "CSV",
  },
  {
    id: "avaliacoes",
    title: "Histórico de Avaliações",
    description: "Todas as avaliações de competência com status, notas e datas.",
    icon: <FileSpreadsheet size={22} className="text-blue-400" />,
    format: "CSV",
  },
  {
    id: "desempenho",
    title: "Avaliações de Desempenho",
    description: "Notas mensais de desempenho por colaborador.",
    icon: <FileSpreadsheet size={22} className="text-purple-400" />,
    format: "CSV",
  },
  {
    id: "assiduidade",
    title: "Assiduidade",
    description: "Registro mensal de presença, faltas e atrasos por colaborador.",
    icon: <FileSpreadsheet size={22} className="text-orange-400" />,
    format: "CSV",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function RelatoriosPage() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleExport = async (reportId: string) => {
    setLoadingId(reportId);
    try {
      const today = new Date().toISOString().split("T")[0];

      if (reportId === "matriz") {
        const [colabSnap, compSnap, avalSnap, nivSnap] = await Promise.all([
          getDocs(collection(db, "colaboradores")),
          getDocs(collection(db, "competencias")),
          getDocs(collection(db, "avaliacoes_competencia")),
          getDocs(collection(db, "niveis_esperados")),
        ]);
        const colabs = colabSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Colaborador)).sort((a, b) => a.nome.localeCompare(b.nome));
        const comps = compSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Competencia)).sort((a, b) => a.ordem - b.ordem);
        const avals = avalSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AvaliacaoCompetencia));
        const niveisEsp = nivSnap.docs.map((d) => ({ id: d.id, ...d.data() } as NivelEsperado));
        const notasMap = buildNotasMap(avals);

        const header = ["Colaborador", "Cargo", ...comps.map((c) => c.nome), ...comps.map((c) => `Esperado: ${c.nome}`)];
        const rows: string[][] = [header];
        colabs.forEach((colab) => {
          const niveis = comps.map((comp) => {
            if (!comp.cargosAplicaveis.includes(colab.cargo)) return "N/A";
            const n = notasMap[colab.id]?.[comp.id];
            return n !== undefined ? String(n) : "—";
          });
          const esperados = comps.map((comp) => {
            if (!comp.cargosAplicaveis.includes(colab.cargo)) return "N/A";
            const esp = niveisEsp.find((n) => n.competenciaId === comp.id && n.cargo === colab.cargo);
            return esp ? String(esp.nivelMinimo) : "—";
          });
          rows.push([colab.nome, CARGO_LABELS[colab.cargo], ...niveis, ...esperados]);
        });
        downloadCSV(rows, `matriz_competencias_${today}.csv`);
      }

      if (reportId === "gaps") {
        const [colabSnap, compSnap, avalSnap, nivSnap] = await Promise.all([
          getDocs(collection(db, "colaboradores")),
          getDocs(collection(db, "competencias")),
          getDocs(collection(db, "avaliacoes_competencia")),
          getDocs(collection(db, "niveis_esperados")),
        ]);
        const colabs = colabSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Colaborador));
        const comps = compSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Competencia));
        const avals = avalSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AvaliacaoCompetencia));
        const niveisEsp = nivSnap.docs.map((d) => ({ id: d.id, ...d.data() } as NivelEsperado));
        const notasMap = buildNotasMap(avals);

        const header = ["Colaborador", "Cargo", "Competência", "Nível Atual", "Nível Esperado", "Lacuna", "Prioridade"];
        const rows: string[][] = [header];
        colabs.forEach((colab) => {
          comps.forEach((comp) => {
            if (!comp.cargosAplicaveis.includes(colab.cargo)) return;
            const esp = niveisEsp.find((n) => n.competenciaId === comp.id && n.cargo === colab.cargo);
            if (!esp) return;
            const atual = notasMap[colab.id]?.[comp.id] ?? 0;
            const gap = esp.nivelMinimo - atual;
            if (gap <= 0) return;
            rows.push([colab.nome, CARGO_LABELS[colab.cargo], comp.nome, String(atual), String(esp.nivelMinimo), String(gap), gap >= 2 ? "Crítica" : "Moderada"]);
          });
        });
        downloadCSV(rows, `gaps_competencias_${today}.csv`);
      }

      if (reportId === "avaliacoes") {
        const [colabSnap, compSnap, avalSnap] = await Promise.all([
          getDocs(collection(db, "colaboradores")),
          getDocs(collection(db, "competencias")),
          getDocs(collection(db, "avaliacoes_competencia")),
        ]);
        const colabs = Object.fromEntries(colabSnap.docs.map((d) => [d.id, d.data().nome as string]));
        const comps = Object.fromEntries(compSnap.docs.map((d) => [d.id, d.data().nome as string]));
        const header = ["Data", "Colaborador", "Competência", "Nível Anterior", "Nível Proposto", "Status", "Nota"];
        const rows: string[][] = [header];
        avalSnap.docs.forEach((d) => {
          const a = d.data() as AvaliacaoCompetencia;
          rows.push([
            new Date(a.dataAvaliacao).toLocaleDateString("pt-BR"),
            colabs[a.colaboradorId] ?? a.colaboradorId,
            comps[a.competenciaId] ?? a.competenciaId,
            NIVEL_LABELS[a.nivelAtual].split("/")[0].trim(),
            NIVEL_LABELS[a.nivelProposto].split("/")[0].trim(),
            a.status,
            a.notaProva !== undefined ? `${a.notaProva}%` : "—",
          ]);
        });
        rows.sort((a, b) => (b[0] ?? "").localeCompare(a[0] ?? ""));
        downloadCSV(rows, `avaliacoes_competencia_${today}.csv`);
      }

      if (reportId === "desempenho") {
        const [colabSnap, avalSnap] = await Promise.all([
          getDocs(collection(db, "colaboradores")),
          getDocs(collection(db, "avaliacao_desempenho")),
        ]);
        const colabs = Object.fromEntries(colabSnap.docs.map((d) => [d.id, d.data().nome as string]));
        const header = ["Colaborador", "Período", "Nota", "Observações"];
        const rows: string[][] = [header];
        avalSnap.docs.forEach((d) => {
          const a = d.data() as AvaliacaoDesempenho;
          rows.push([colabs[a.colaboradorId] ?? a.colaboradorId, a.mes, String(a.nota), a.observacoes ?? ""]);
        });
        rows.sort((a, b) => (b[1] ?? "").localeCompare(a[1] ?? ""));
        downloadCSV(rows, `avaliacao_desempenho_${today}.csv`);
      }

      if (reportId === "assiduidade") {
        const [colabSnap, assSnap] = await Promise.all([
          getDocs(collection(db, "colaboradores")),
          getDocs(collection(db, "assiduidade")),
        ]);
        const colabs = Object.fromEntries(colabSnap.docs.map((d) => [d.id, d.data().nome as string]));
        const header = ["Colaborador", "Mês", "Dias Úteis", "Dias Trabalhados", "Faltas", "Atrasos", "% Presença"];
        const rows: string[][] = [header];
        assSnap.docs.forEach((d) => {
          const a = d.data() as Assiduidade;
          rows.push([
            colabs[a.colaboradorId] ?? a.colaboradorId,
            a.mes,
            String(a.diasUteis),
            String(a.diasTrabalhados),
            String(a.faltas),
            String(a.atrasos),
            `${a.percentualPresenca.toFixed(1)}%`,
          ]);
        });
        rows.sort((a, b) => (b[1] ?? "").localeCompare(a[1] ?? ""));
        downloadCSV(rows, `assiduidade_${today}.csv`);
      }

      showToast("Arquivo gerado com sucesso!");
    } catch (e) {
      console.error(e);
      showToast("Erro ao gerar relatório.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg bg-emerald-600 text-white text-sm font-medium">
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white">Relatórios</h1>
        <p className="text-sm text-slate-400 mt-1">Exporte dados para Excel / CSV. Abra no Excel e use "Dados → Do Texto/CSV".</p>
      </div>

      <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
        <Info size={14} className="shrink-0" />
        Os arquivos são gerados com separador ponto-e-vírgula (;) e BOM UTF-8 — compatíveis com Excel em pt-BR.
      </div>

      <div className="grid grid-cols-1 gap-4">
        {REPORTS.map((r) => (
          <div key={r.id} className="glass-card rounded-2xl p-5 flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
              {r.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{r.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{r.description}</p>
            </div>
            <button
              onClick={() => handleExport(r.id)}
              disabled={loadingId === r.id}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold shrink-0 transition-all disabled:opacity-50"
            >
              {loadingId === r.id ? (
                <><Loader2 size={14} className="animate-spin" /> Gerando...</>
              ) : (
                <><Download size={14} /> Exportar CSV</>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
