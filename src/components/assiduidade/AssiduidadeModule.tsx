"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Colaborador, Assiduidade } from "@/lib/types";
import { CARGO_LABELS } from "@/lib/types";
import { Save, ChevronLeft, ChevronRight, CheckCircle, AlertCircle } from "lucide-react";

export default function AssiduidedeModule() {
  const { profile } = useAuth();
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [registros, setRegistros] = useState<Record<string, Partial<Assiduidade>>>({});
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [mesAtual]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [colabSnap, assidSnap] = await Promise.all([
        getDocs(collection(db, "colaboradores")),
        getDocs(collection(db, "assiduidade")),
      ]);
      const colabs = colabSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Colaborador)).filter((c) => c.ativo);
      const assids = assidSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Assiduidade));

      const regs: Record<string, Partial<Assiduidade>> = {};
      colabs.forEach((c) => {
        const existing = assids.find((a) => a.colaboradorId === c.id && a.mes === mesAtual);
        regs[c.id] = existing || { diasUteis: 22, diasTrabalhados: 22, faltas: 0, atrasos: 0, percentualPresenca: 100 };
      });

      setColaboradores(colabs.sort((a, b) => a.nome.localeCompare(b.nome)));
      setRegistros(regs);
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateRegistro = (colabId: string, field: string, value: number) => {
    setRegistros((prev) => {
      const reg = { ...prev[colabId], [field]: value };
      // Recalculate
      const dias = reg.diasUteis || 22;
      const faltas = reg.faltas || 0;
      reg.diasTrabalhados = dias - faltas;
      reg.percentualPresenca = dias > 0 ? Math.round(((dias - faltas) / dias) * 100) : 0;
      return { ...prev, [colabId]: reg };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const batch = Object.entries(registros).map(([colabId, reg]) =>
        addDoc(collection(db, "assiduidade"), {
          colaboradorId: colabId,
          mes: mesAtual,
          diasUteis: reg.diasUteis || 22,
          diasTrabalhados: reg.diasTrabalhados || 22,
          faltas: reg.faltas || 0,
          atrasos: reg.atrasos || 0,
          percentualPresenca: reg.percentualPresenca || 100,
        })
      );
      await Promise.all(batch);
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

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Controle de Assiduidade</h2>
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

      <div className="glass-card rounded-2xl p-5 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-slate-400 uppercase tracking-wider">
              <th className="text-left py-3 px-3">Colaborador</th>
              <th className="text-center py-3 px-2 w-20">Dias Úteis</th>
              <th className="text-center py-3 px-2 w-20">Faltas</th>
              <th className="text-center py-3 px-2 w-20">Atrasos</th>
              <th className="text-center py-3 px-2 w-20">Trabalhados</th>
              <th className="text-center py-3 px-2 w-24">Presença</th>
            </tr>
          </thead>
          <tbody>
            {colaboradores.map((colab) => {
              const reg = registros[colab.id] || {};
              const pct = reg.percentualPresenca || 0;
              const statusColor = pct >= 95 ? "text-green-400" : pct >= 85 ? "text-yellow-300" : "text-red-400";
              const statusIcon = pct >= 95 ? <CheckCircle size={14} /> : <AlertCircle size={14} />;

              return (
                <tr key={colab.id} className="border-t border-slate-700/20 hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center text-[10px] font-bold text-blue-400">
                        {colab.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <p className="text-sm text-white">{colab.nome.split(" ").slice(0, 2).join(" ")}</p>
                        <p className="text-[10px] text-slate-500">{CARGO_LABELS[colab.cargo]}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <input
                      type="number"
                      min={0}
                      max={31}
                      value={reg.diasUteis ?? 22}
                      onChange={(e) => updateRegistro(colab.id, "diasUteis", Number(e.target.value))}
                      className="w-14 px-1 py-1 rounded-lg bg-slate-800 border border-slate-600/50 text-center text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-3 px-2 text-center">
                    <input
                      type="number"
                      min={0}
                      max={31}
                      value={reg.faltas ?? 0}
                      onChange={(e) => updateRegistro(colab.id, "faltas", Number(e.target.value))}
                      className="w-14 px-1 py-1 rounded-lg bg-slate-800 border border-slate-600/50 text-center text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-3 px-2 text-center">
                    <input
                      type="number"
                      min={0}
                      max={31}
                      value={reg.atrasos ?? 0}
                      onChange={(e) => updateRegistro(colab.id, "atrasos", Number(e.target.value))}
                      className="w-14 px-1 py-1 rounded-lg bg-slate-800 border border-slate-600/50 text-center text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-3 px-2 text-center text-sm text-slate-300">{reg.diasTrabalhados ?? 22}</td>
                  <td className="py-3 px-2">
                    <div className={`flex items-center justify-center gap-1.5 text-sm font-bold ${statusColor}`}>
                      {statusIcon}
                      {pct}%
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? "Salvando..." : "Salvar Registros"}
        </button>
      </div>
    </div>
  );
}
