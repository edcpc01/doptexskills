"use client";

import { useState, useEffect } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Colaborador, Competencia, Treinamento, TipoTreinamento } from "@/lib/types";
import { CARGO_LABELS, TIPO_TREINAMENTO_LABELS } from "@/lib/types";
import {
  GraduationCap, Plus, Pencil, Trash2, X, Save, Loader2, ChevronDown,
} from "lucide-react";

// ── Form state ────────────────────────────────────────────────────────────────

interface TreinForm {
  colaboradorId: string;
  titulo: string;
  instituicao: string;
  tipo: TipoTreinamento;
  dataInicio: string;
  dataConclusao: string;
  cargaHoraria: string;
  competenciasRelacionadas: string[];
  observacoes: string;
}

const emptyForm = (): TreinForm => ({
  colaboradorId: "",
  titulo: "",
  instituicao: "",
  tipo: "externo",
  dataInicio: "",
  dataConclusao: "",
  cargaHoraria: "",
  competenciasRelacionadas: [],
  observacoes: "",
});

// ── Badge ─────────────────────────────────────────────────────────────────────

const TIPO_COLORS: Record<TipoTreinamento, string> = {
  interno: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  externo: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  certificacao: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function TreinamentosPage() {
  const { profile } = useAuth();
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterColabId, setFilterColabId] = useState<string>("");
  const [filterTipo, setFilterTipo] = useState<string>("");

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TreinForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [compSearch, setCompSearch] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Load static data
  useEffect(() => {
    (async () => {
      const [colabSnap, compSnap] = await Promise.all([
        getDocs(collection(db, "colaboradores")),
        getDocs(collection(db, "competencias")),
      ]);
      setColaboradores(
        colabSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Colaborador))
          .filter((c) => c.ativo)
          .sort((a, b) => a.nome.localeCompare(b.nome))
      );
      setCompetencias(
        compSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Competencia))
          .sort((a, b) => a.ordem - b.ordem)
      );
    })();
  }, []);

  // Real-time treinamentos
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "treinamentos"), (snap) => {
      setTreinamentos(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Treinamento))
          .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio))
      );
      setLoading(false);
    });
    return unsub;
  }, []);

  const openCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setModal("create");
    setCompSearch("");
  };

  const openEdit = (t: Treinamento) => {
    setForm({
      colaboradorId: t.colaboradorId,
      titulo: t.titulo,
      instituicao: t.instituicao ?? "",
      tipo: t.tipo,
      dataInicio: t.dataInicio,
      dataConclusao: t.dataConclusao ?? "",
      cargaHoraria: t.cargaHoraria !== undefined ? String(t.cargaHoraria) : "",
      competenciasRelacionadas: t.competenciasRelacionadas,
      observacoes: t.observacoes ?? "",
    });
    setEditingId(t.id);
    setModal("edit");
    setCompSearch("");
  };

  const closeModal = () => {
    setModal(null);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.colaboradorId || !form.titulo || !form.dataInicio) {
      showToast("Preencha colaborador, título e data de início.");
      return;
    }
    setSaving(true);
    try {
      const payload: Omit<Treinamento, "id"> = {
        colaboradorId: form.colaboradorId,
        titulo: form.titulo,
        instituicao: form.instituicao || undefined,
        tipo: form.tipo,
        dataInicio: form.dataInicio,
        dataConclusao: form.dataConclusao || undefined,
        cargaHoraria: form.cargaHoraria ? Number(form.cargaHoraria) : undefined,
        competenciasRelacionadas: form.competenciasRelacionadas,
        observacoes: form.observacoes || undefined,
        registradoPor: profile?.uid ?? "",
        criadoEm: new Date().toISOString(),
      };

      if (modal === "edit" && editingId) {
        await updateDoc(doc(db, "treinamentos", editingId), payload as Record<string, unknown>);
        showToast("Treinamento atualizado.");
      } else {
        await addDoc(collection(db, "treinamentos"), payload);
        showToast("Treinamento registrado.");
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "treinamentos", id));
    setDeleteConfirm(null);
    showToast("Treinamento removido.");
  };

  const toggleComp = (compId: string) => {
    setForm((prev) => ({
      ...prev,
      competenciasRelacionadas: prev.competenciasRelacionadas.includes(compId)
        ? prev.competenciasRelacionadas.filter((c) => c !== compId)
        : [...prev.competenciasRelacionadas, compId],
    }));
  };

  // Filtered list
  const displayed = treinamentos.filter((t) => {
    if (filterColabId && t.colaboradorId !== filterColabId) return false;
    if (filterTipo && t.tipo !== filterTipo) return false;
    return true;
  });

  const colabMap = Object.fromEntries(colaboradores.map((c) => [c.id, c]));
  const compMap = Object.fromEntries(competencias.map((c) => [c.id, c]));

  const filteredComps = competencias.filter((c) =>
    c.nome.toLowerCase().includes(compSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg bg-emerald-600 text-white text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Treinamentos</h1>
          <p className="text-sm text-slate-400 mt-1">Registro de treinamentos internos, externos e certificações.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shrink-0"
        >
          <Plus size={16} /> Novo Treinamento
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterColabId}
          onChange={(e) => setFilterColabId(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-600/50 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">Todos colaboradores</option>
          {colaboradores.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-600/50 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">Todos os tipos</option>
          {Object.entries(TIPO_TREINAMENTO_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">Carregando...</div>
      ) : displayed.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <GraduationCap size={36} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm">Nenhum treinamento encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((t) => {
            const colab = colabMap[t.colaboradorId];
            return (
              <div key={t.id} className="glass-card rounded-2xl p-5 flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  <GraduationCap size={20} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-white">{t.titulo}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${TIPO_COLORS[t.tipo]}`}>
                      {TIPO_TREINAMENTO_LABELS[t.tipo]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {colab ? `${colab.nome} · ${CARGO_LABELS[colab.cargo]}` : t.colaboradorId}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                    {t.instituicao && <span>{t.instituicao}</span>}
                    <span>
                      {new Date(t.dataInicio).toLocaleDateString("pt-BR")}
                      {t.dataConclusao && ` → ${new Date(t.dataConclusao).toLocaleDateString("pt-BR")}`}
                    </span>
                    {t.cargaHoraria && <span>{t.cargaHoraria}h</span>}
                  </div>
                  {t.competenciasRelacionadas.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.competenciasRelacionadas.map((cId) => (
                        <span key={cId} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                          {compMap[cId]?.nome ?? cId}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(t)}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(t.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm space-y-4">
            <p className="text-white font-semibold">Remover treinamento?</p>
            <p className="text-sm text-slate-400">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <h2 className="text-white font-semibold">
                {modal === "create" ? "Novo Treinamento" : "Editar Treinamento"}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Collaborator */}
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">
                  Colaborador *
                </label>
                <select
                  value={form.colaboradorId}
                  onChange={(e) => setForm({ ...form, colaboradorId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-600/50 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Selecione...</option>
                  {colaboradores.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">
                  Título *
                </label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex: NR-12 – Segurança em Máquinas"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-600/50 text-white text-sm placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Instituicao + Tipo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">
                    Instituição
                  </label>
                  <input
                    type="text"
                    value={form.instituicao}
                    onChange={(e) => setForm({ ...form, instituicao: e.target.value })}
                    placeholder="SENAI, SESI..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-600/50 text-white text-sm placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">
                    Tipo
                  </label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoTreinamento })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-600/50 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {Object.entries(TIPO_TREINAMENTO_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates + Carga horaria */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">
                    Início *
                  </label>
                  <input
                    type="date"
                    value={form.dataInicio}
                    onChange={(e) => setForm({ ...form, dataInicio: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-600/50 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">
                    Conclusão
                  </label>
                  <input
                    type="date"
                    value={form.dataConclusao}
                    onChange={(e) => setForm({ ...form, dataConclusao: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-600/50 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">
                    Carga (h)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.cargaHoraria}
                    onChange={(e) => setForm({ ...form, cargaHoraria: e.target.value })}
                    placeholder="40"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-600/50 text-white text-sm placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Competencias relacionadas */}
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">
                  Competências Relacionadas
                </label>
                <input
                  type="text"
                  value={compSearch}
                  onChange={(e) => setCompSearch(e.target.value)}
                  placeholder="Buscar competência..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-600/50 text-white text-sm placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none mb-2"
                />
                <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl border border-slate-700/30 p-2">
                  {filteredComps.map((c) => {
                    const selected = form.competenciasRelacionadas.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                          selected ? "bg-blue-500/10" : "hover:bg-slate-800/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleComp(c.id)}
                          className="accent-blue-500"
                        />
                        <span className="text-xs text-slate-300">{c.nome}</span>
                      </label>
                    );
                  })}
                </div>
                {form.competenciasRelacionadas.length > 0 && (
                  <p className="text-[11px] text-blue-400 mt-1">
                    {form.competenciasRelacionadas.length} selecionada{form.competenciasRelacionadas.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {/* Observacoes */}
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5">
                  Observações
                </label>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  rows={3}
                  placeholder="Informações adicionais sobre o treinamento..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-600/50 text-white text-sm placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-700/50 flex gap-3 justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-all"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
