"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Colaborador, CargoType } from "@/lib/types";
import { CARGO_LABELS } from "@/lib/types";
import { Plus, Edit2, Trash2, Search, X, Save } from "lucide-react";

const EMPTY_COLAB: Omit<Colaborador, "id"> = {
  nome: "",
  email: "",
  cargo: "TECELAO",
  dataAdmissao: new Date().toISOString().split("T")[0],
  ativo: true,
};

export default function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Colaborador | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<Colaborador, "id">>(EMPTY_COLAB);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const snap = await getDocs(collection(db, "colaboradores"));
      setColaboradores(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Colaborador)).sort((a, b) => a.nome.localeCompare(b.nome)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, "colaboradores", editing.id), { ...form });
      } else {
        await addDoc(collection(db, "colaboradores"), form);
      }
      setEditing(null);
      setCreating(false);
      setForm(EMPTY_COLAB);
      await loadData();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este colaborador?")) return;
    await deleteDoc(doc(db, "colaboradores", id));
    await loadData();
  };

  const startEdit = (c: Colaborador) => {
    setEditing(c);
    setCreating(false);
    setForm({ nome: c.nome, email: c.email, cargo: c.cargo, dataAdmissao: c.dataAdmissao, ativo: c.ativo });
  };

  const filtered = colaboradores.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase()) || c.cargo.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Colaboradores</h1>
          <p className="text-sm text-slate-400 mt-1">{colaboradores.length} cadastrados</p>
        </div>
        <button
          onClick={() => { setCreating(true); setEditing(null); setForm(EMPTY_COLAB); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all"
        >
          <Plus size={16} /> Novo Colaborador
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou cargo..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Form Modal */}
      {(creating || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md relative">
            <button onClick={() => { setCreating(false); setEditing(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-white mb-5">{editing ? "Editar" : "Novo"} Colaborador</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Nome completo</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">E-mail</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Cargo</label>
                <select value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value as CargoType })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  {Object.entries(CARGO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Data de admissão</label>
                <input type="date" value={form.dataAdmissao} onChange={(e) => setForm({ ...form, dataAdmissao: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  className="rounded border-slate-600" />
                <label className="text-sm text-slate-300">Ativo</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setCreating(false); setEditing(null); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 text-sm">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving || !form.nome || !form.email}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                <Save size={16} /> {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="glass-card rounded-2xl p-5">
        <div className="space-y-1">
          {filtered.map((c) => (
            <div key={c.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-800/50 transition-colors">
              <div className="w-9 h-9 rounded-full bg-blue-600/20 flex items-center justify-center text-xs font-bold text-blue-400 flex-shrink-0">
                {c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{c.nome}</p>
                <p className="text-[10px] text-slate-500">{c.email} · {CARGO_LABELS[c.cargo]} · Desde {new Date(c.dataAdmissao).toLocaleDateString("pt-BR")}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.ativo ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                {c.ativo ? "Ativo" : "Inativo"}
              </span>
              <button onClick={() => startEdit(c)} className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"><Edit2 size={15} /></button>
              <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
