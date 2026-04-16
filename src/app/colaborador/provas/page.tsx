"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { AvaliacaoCompetencia, Competencia } from "@/lib/types";
import { NIVEL_LABELS, NIVEL_COLORS } from "@/lib/types";
import { BookOpen, ExternalLink, Clock, CheckCircle, XCircle } from "lucide-react";

export default function MinhasProvasPage() {
  const { profile } = useAuth();
  const [provas, setProvas] = useState<(AvaliacaoCompetencia & { compNome: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.colaboradorId) loadData();
  }, [profile]);

  const loadData = async () => {
    try {
      const [avalSnap, compSnap] = await Promise.all([
        getDocs(collection(db, "avaliacoes_competencia")),
        getDocs(collection(db, "competencias")),
      ]);
      const comps = Object.fromEntries(compSnap.docs.map((d) => [d.id, d.data().nome as string]));
      const avals = avalSnap.docs
        .map((d) => ({ id: d.id, ...d.data(), compNome: comps[(d.data() as AvaliacaoCompetencia).competenciaId] || "—" }))
        .filter((a: any) => a.colaboradorId === profile?.colaboradorId && a.nivelProposto > a.nivelAtual) as any[];
      setProvas(avals.sort((a: any, b: any) => b.dataAvaliacao.localeCompare(a.dataAvaliacao)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Minhas Provas</h1>
        <p className="text-sm text-slate-400 mt-1">Provas de promoção de nível de competência</p>
      </div>

      {provas.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <BookOpen size={48} className="mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400">Nenhuma prova pendente</p>
          <p className="text-slate-500 text-sm mt-1">Quando seu gestor propor uma promoção de nível, a prova aparecerá aqui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {provas.map((p) => {
            const isPending = p.status === "pendente_prova";
            const isApproved = p.status === "aprovado";
            return (
              <div key={p.id} className={`glass-card rounded-2xl p-5 ${isPending ? "pulse-pending" : ""}`}>
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: NIVEL_COLORS[p.nivelAtual] }}>{p.nivelAtual}</div>
                    <span className="text-slate-500">→</span>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: NIVEL_COLORS[p.nivelProposto] }}>{p.nivelProposto}</div>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{p.compNome}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      De "{NIVEL_LABELS[p.nivelAtual].split("/")[0].trim()}" para "{NIVEL_LABELS[p.nivelProposto].split("/")[0].trim()}"
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Solicitado em {new Date(p.dataAvaliacao).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right">
                    {isPending && (
                      <div>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400 mb-2">
                          <Clock size={12} /> Pendente
                        </span>
                        {p.provaUrl ? (
                          <a href={p.provaUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all">
                            <ExternalLink size={14} /> Fazer Prova
                          </a>
                        ) : (
                          <p className="text-xs text-slate-500">Aguardando envio do link</p>
                        )}
                      </div>
                    )}
                    {isApproved && (
                      <div className="text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-400">
                          <CheckCircle size={12} /> Aprovado
                        </span>
                        {p.notaProva !== undefined && <p className="text-lg font-bold text-green-400 mt-1">{p.notaProva}%</p>}
                      </div>
                    )}
                    {p.status === "reprovado" && (
                      <div className="text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400">
                          <XCircle size={12} /> Reprovado
                        </span>
                        {p.notaProva !== undefined && <p className="text-lg font-bold text-red-400 mt-1">{p.notaProva}%</p>}
                        <p className="text-[10px] text-slate-500 mt-0.5">Mínimo: 80%</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
