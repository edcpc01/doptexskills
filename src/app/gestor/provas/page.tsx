"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type { AvaliacaoCompetencia } from "@/lib/types";
import { NIVEL_COLORS } from "@/lib/types";
import {
  BookOpen, CheckCircle, XCircle, Clock, ExternalLink,
  Send, Loader2, Copy, MoreVertical, Trash2, ThumbsUp, ThumbsDown, AlertTriangle, Mail,
} from "lucide-react";

type ProvaItem = AvaliacaoCompetencia & { colabNome: string; colabEmail: string; compNome: string };

type ConfirmAction = {
  title: string;
  message: string;
  variant: "danger" | "success" | "warning";
  onConfirm: () => Promise<void>;
} | null;

export default function ProvasPage() {
  const [provas, setProvas] = useState<ProvaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pendente_prova" | "aprovado" | "reprovado">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const loadData = async () => {
    try {
      const [avalSnap, colabSnap, compSnap] = await Promise.all([
        getDocs(collection(db, "avaliacoes_competencia")),
        getDocs(collection(db, "colaboradores")),
        getDocs(collection(db, "competencias")),
      ]);

      const colabs = Object.fromEntries(colabSnap.docs.map((d) => [d.id, d.data()]));
      const comps = Object.fromEntries(compSnap.docs.map((d) => [d.id, d.data().nome as string]));

      const avals = avalSnap.docs
        .map((d) => {
          const data = d.data() as AvaliacaoCompetencia;
          return {
            ...data,
            id: d.id,
            colabNome: colabs[data.colaboradorId]?.nome || "—",
            colabEmail: colabs[data.colaboradorId]?.email || "",
            compNome: comps[data.competenciaId] || "—",
          };
        })
        .filter((a) => a.status !== "confirmado" || a.nivelProposto > a.nivelAtual) as ProvaItem[];

      setProvas(avals.sort((a, b) => b.dataAvaliacao.localeCompare(a.dataAvaliacao)));
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const getToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Sessão expirada. Faça login novamente.");
    return user.getIdToken();
  };

  const handleEnviarProva = async (avaliacaoId: string) => {
    setBusyId(avaliacaoId);
    setOpenMenuId(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/provas/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avaliacaoId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ type: "error", msg: data.error || "Erro ao enviar prova" });
        return;
      }
      setToast({ type: "success", msg: data.message || "Prova enviada!" });
      await loadData();
    } catch (e: unknown) {
      setToast({ type: "error", msg: e instanceof Error ? e.message : "Erro" });
    } finally {
      setBusyId(null);
    }
  };

  const handleCopyLink = async (url: string) => {
    setOpenMenuId(null);
    try {
      await navigator.clipboard.writeText(url);
      setToast({ type: "success", msg: "Link copiado!" });
    } catch {
      setToast({ type: "error", msg: "Não foi possível copiar" });
    }
  };

  const handleSetStatus = async (avaliacaoId: string, novoStatus: "aprovado" | "reprovado") => {
    setBusyId(avaliacaoId);
    setOpenMenuId(null);
    try {
      await updateDoc(doc(db, "avaliacoes_competencia", avaliacaoId), {
        status: novoStatus,
        provaAprovada: novoStatus === "aprovado",
        notaProva: novoStatus === "aprovado" ? 100 : 0,
      });
      setToast({
        type: "success",
        msg: novoStatus === "aprovado" ? "Marcada como aprovada" : "Marcada como reprovada",
      });
      await loadData();
    } catch (e: unknown) {
      setToast({ type: "error", msg: e instanceof Error ? e.message : "Erro" });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (avaliacaoId: string) => {
    setBusyId(avaliacaoId);
    setOpenMenuId(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/provas/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avaliacaoId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ type: "error", msg: data.error || "Erro ao excluir" });
        return;
      }
      setToast({ type: "success", msg: "Prova excluída" });
      await loadData();
    } catch (e: unknown) {
      setToast({ type: "error", msg: e instanceof Error ? e.message : "Erro" });
    } finally {
      setBusyId(null);
    }
  };

  const askConfirm = (action: NonNullable<ConfirmAction>) => {
    setOpenMenuId(null);
    setConfirm(action);
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
    <div className="space-y-6 relative">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium max-w-md ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Confirm Dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-start gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  confirm.variant === "danger"
                    ? "bg-red-500/15 text-red-400"
                    : confirm.variant === "success"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-yellow-500/15 text-yellow-400"
                }`}
              >
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">{confirm.title}</h3>
                <p className="text-sm text-slate-400 mt-1">{confirm.message}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await confirm.onConfirm();
                  setConfirm(null);
                }}
                className={`flex-1 py-2.5 rounded-xl text-white font-semibold text-sm ${
                  confirm.variant === "danger"
                    ? "bg-red-600 hover:bg-red-700"
                    : confirm.variant === "success"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-yellow-600 hover:bg-yellow-700"
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

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
              const isPendente = prova.status === "pendente_prova";
              const isBusy = busyId === prova.id;
              const naoEnviada = isPendente && !prova.provaEnviada;

              return (
                <div key={prova.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-800/50 transition-colors group">
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
                    <p className="text-sm text-white truncate">{prova.colabNome}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {prova.compNome}
                      {prova.colabEmail && <span className="text-slate-600 ml-2">· {prova.colabEmail}</span>}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 ${cfg.class}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                  {prova.notaProva !== undefined && (
                    <span className="text-sm font-bold text-white w-12 text-right">{prova.notaProva}%</span>
                  )}

                  {/* Botão primário: Enviar / Reenviar */}
                  {isPendente && (
                    <button
                      onClick={() => handleEnviarProva(prova.id)}
                      disabled={isBusy}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 shrink-0 ${
                        naoEnviada
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-slate-700 hover:bg-slate-600 text-slate-200"
                      }`}
                    >
                      {isBusy ? (
                        <>
                          <Loader2 size={12} className="animate-spin" /> Enviando...
                        </>
                      ) : (
                        <>
                          {naoEnviada ? <Send size={12} /> : <Mail size={12} />}
                          {naoEnviada ? "Enviar Prova" : "Reenviar"}
                        </>
                      )}
                    </button>
                  )}

                  <span className="text-[10px] text-slate-500 w-20 text-right shrink-0">
                    {new Date(prova.dataAvaliacao).toLocaleDateString("pt-BR")}
                  </span>

                  {/* Menu de ações */}
                  <div className="relative shrink-0" ref={openMenuId === prova.id ? menuRef : null}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === prova.id ? null : prova.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/70 transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === prova.id && (
                      <div className="absolute right-0 top-full mt-1 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 z-30">
                        {prova.provaUrl && (
                          <>
                            <MenuItem onClick={() => handleCopyLink(prova.provaUrl!)} icon={<Copy size={14} />}>
                              Copiar link
                            </MenuItem>
                            <MenuItem
                              onClick={() => {
                                window.open(prova.provaUrl, "_blank");
                                setOpenMenuId(null);
                              }}
                              icon={<ExternalLink size={14} />}
                            >
                              Abrir prova
                            </MenuItem>
                            <div className="my-1 h-px bg-slate-700" />
                          </>
                        )}
                        {isPendente && (
                          <>
                            <MenuItem
                              onClick={() =>
                                askConfirm({
                                  title: "Marcar como Aprovado?",
                                  message: `${prova.colabNome} terá o nível promovido para ${prova.nivelProposto} sem realizar a prova.`,
                                  variant: "success",
                                  onConfirm: () => handleSetStatus(prova.id, "aprovado"),
                                })
                              }
                              icon={<ThumbsUp size={14} />}
                              variant="success"
                            >
                              Marcar como Aprovado
                            </MenuItem>
                            <MenuItem
                              onClick={() =>
                                askConfirm({
                                  title: "Marcar como Reprovado?",
                                  message: `A prova de ${prova.colabNome} será marcada como reprovada.`,
                                  variant: "warning",
                                  onConfirm: () => handleSetStatus(prova.id, "reprovado"),
                                })
                              }
                              icon={<ThumbsDown size={14} />}
                              variant="warning"
                            >
                              Marcar como Reprovado
                            </MenuItem>
                            <div className="my-1 h-px bg-slate-700" />
                          </>
                        )}
                        <MenuItem
                          onClick={() =>
                            askConfirm({
                              title: "Excluir prova?",
                              message: `A avaliação de ${prova.colabNome} será removida permanentemente. Esta ação não pode ser desfeita.`,
                              variant: "danger",
                              onConfirm: () => handleDelete(prova.id),
                            })
                          }
                          icon={<Trash2 size={14} />}
                          variant="danger"
                        >
                          Excluir prova
                        </MenuItem>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  onClick, icon, children, variant,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  variant?: "danger" | "success" | "warning";
}) {
  const colorClass =
    variant === "danger"
      ? "text-red-400 hover:bg-red-500/10"
      : variant === "success"
      ? "text-emerald-400 hover:bg-emerald-500/10"
      : variant === "warning"
      ? "text-yellow-400 hover:bg-yellow-500/10"
      : "text-slate-300 hover:bg-slate-700/70";
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors ${colorClass}`}
    >
      {icon} {children}
    </button>
  );
}
