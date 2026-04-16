"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Competencia, CargoType, GrupoCompetencia } from "@/lib/types";
import { CARGO_LABELS } from "@/lib/types";
import { Plus, Edit2, Trash2, Search, X, Save } from "lucide-react";

const GRUPOS: GrupoCompetencia[] = [
  "Competências Operacionais",
  "Competências de Controle de Processo e Qualidade",
  "Competências de Atividades Logísticas",
  "Competências Comportamentais",
  "Competências Técnicas",
  "Competências de Gestão",
];

export default function CompetenciasPage() {
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [search, setSearch] = useState("");
  const [filterGrupo, setFilterGrupo] = useState<string>("TODOS");
  const [editing, setEditing] = useState<Competencia | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ nome: "", grupo: GRUPOS[0] as GrupoCompetencia, cargosAplicaveis: [] as CargoType[], ordem: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const snap = await getDocs(collection(db, "competencias"));
      setCompetencias(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Competencia)).sort((a, b) => a.ordem - b.ordem));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, "competencias", editing.id), { ...form });
      } else {
        await addDoc(collection(db, "competencias"), { ...form, ordem: competencias.length });
      }
      setEditing(null);
      setCreating(false);
      await loadData();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const toggleCargo = (cargo: CargoType) => {
    setForm((f) => ({
      ...f,
      cargosAplicaveis: f.cargosAplicaveis.includes(cargo)
        ? f.cargosAplicaveis.filter((c) => c !== cargo)
        : [...f.cargosAplicaveis, cargo],
    }));
  };

  const filtered = competencias.filter((c) => {
    const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase());
    const matchGrupo = filterGrupo === "TODOS" || c.grupo === filterGrupo;
    return matchSearch && matchGrupo;
  });

  // Group for display
  const grouped = GRUPOS.map((g) => ({
    grupo: g,
    items: filtered.filter((c) => c.grupo === g),
  })).filter((g) => g.items.length > 0);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Competências</h1>
          <p className="text-sm text-slate-400 mt-1">{competencias.length} cadastradas</p>
        </div>
        <button
          onClick={() => { setCreating(true); setEditing(null); setForm({ nome: "", grupo: GRUPOS[0], cargosAplicaveis: [], ordem: 0 }); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all"
        >
          <Plus size={16} /> Nova Competência
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <select value={filterGrupo} onChange={(e) => setFilterGrupo(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-600/50 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="TODOS">Todos os grupos</option>
          {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Form Modal */}
      {(creating || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md relative">
            <button onClick={() => { setCreating(false); setEditing(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20} /></button>
            <h3 className="text-lg font-bold text-white mb-5">{editing ? "Editar" : "Nova"} Competência</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Nome</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Grupo</label>
                <select value={form.grupo} onChange={(e) => setForm({ ...form, grupo: e.target.value as GrupoCompetencia })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Cargos aplicáveis</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(CARGO_LABELS) as [CargoType, string][]).map(([k, v]) => (
                    <button key={k} onClick={() => toggleCargo(k)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        form.cargosAplicaveis.includes(k) ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white border border-slate-600/50"
                      }`}>{v}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setCreating(false); setEditing(null); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 text-sm">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.nome || form.cargosAplicaveis.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                <Save size={16} /> {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grouped list */}
      {grouped.map(({ grupo, items }) => (
        <div key={grupo} className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3">{grupo} ({items.length})</h3>
          <div className="space-y-1">
            {items.map((c) => (
              <div key={c.id} className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-slate-800/50 transition-colors">
                <div className="flex-1">
                  <p className="text-sm text-white">{c.nome}</p>
                  <p className="text-[10px] text-slate-500">{c.cargosAplicaveis.map((cargo) => CARGO_LABELS[cargo]).join(", ")}</p>
                </div>
                <button onClick={() => { setEditing(c); setCreating(false); setForm({ nome: c.nome, grupo: c.grupo, cargosAplicaveis: c.cargosAplicaveis, ordem: c.ordem }); }}
                  className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"><Edit2 size={15} /></button>
                <button onClick={async () => { if (confirm("Excluir?")) { await deleteDoc(doc(db, "competencias", c.id)); await loadData(); }}}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
