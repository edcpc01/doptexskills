"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Competencia, CargoType, NivelCompetencia, NivelEsperado } from "@/lib/types";
import { CARGO_LABELS, NIVEL_COLORS } from "@/lib/types";
import { Save, Info } from "lucide-react";

// Map: competenciaId → cargo → nivelMinimo | null (null = não aplicável / sem meta)
type NiveisMap = Record<string, Record<CargoType, NivelCompetencia | null>>;

const ALL_CARGOS = Object.keys(CARGO_LABELS) as CargoType[];

export default function NiveisEsperadosPage() {
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [niveisMap, setNiveisMap] = useState<NiveisMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const [compSnap, nivSnap] = await Promise.all([
        getDocs(collection(db, "competencias")),
        getDocs(collection(db, "niveis_esperados")),
      ]);

      const comps = compSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Competencia))
        .sort((a, b) => a.ordem - b.ordem);

      // Build initial map: all null
      const map: NiveisMap = {};
      comps.forEach((c) => {
        map[c.id] = {} as Record<CargoType, NivelCompetencia | null>;
        ALL_CARGOS.forEach((cargo) => { map[c.id][cargo] = null; });
      });

      // Fill from Firestore
      nivSnap.docs.forEach((d) => {
        const n = { id: d.id, ...d.data() } as NivelEsperado;
        if (map[n.competenciaId]) map[n.competenciaId][n.cargo] = n.nivelMinimo;
      });

      setCompetencias(comps);
      setNiveisMap(map);
      setLoading(false);
    })();
  }, []);

  const handleChange = (compId: string, cargo: CargoType, value: string) => {
    setNiveisMap((prev) => ({
      ...prev,
      [compId]: {
        ...prev[compId],
        [cargo]: value === "" ? null : (Number(value) as NivelCompetencia),
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const writes: Promise<void>[] = [];
      competencias.forEach((comp) => {
        ALL_CARGOS.forEach((cargo) => {
          if (!comp.cargosAplicaveis.includes(cargo)) return;
          const docId = `${comp.id}_${cargo}`;
          const nivel = niveisMap[comp.id]?.[cargo];
          if (nivel !== null && nivel !== undefined) {
            writes.push(
              setDoc(doc(db, "niveis_esperados", docId), {
                competenciaId: comp.id,
                cargo,
                nivelMinimo: nivel,
              })
            );
          } else {
            writes.push(deleteDoc(doc(db, "niveis_esperados", docId)).catch(() => {}));
          }
        });
      });
      await Promise.all(writes);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Group competencias by grupo
  const grupos = [...new Set(competencias.map((c) => c.grupo))];

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Níveis Esperados por Cargo</h1>
          <p className="text-sm text-slate-400 mt-1">
            Define o nível mínimo esperado para cada competência por cargo. Usado no Gap Analysis.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm disabled:opacity-50 transition-all"
        >
          <Save size={16} />
          {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar Tudo"}
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
        <Info size={14} className="shrink-0" />
        Deixe em branco (—) para competências sem meta definida para aquele cargo. Apenas cargos aplicáveis à competência são editáveis.
      </div>

      {/* Grid por grupo */}
      {grupos.map((grupo) => {
        const compsGrupo = competencias.filter((c) => c.grupo === grupo);
        return (
          <div key={grupo} className="glass-card rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700/50">
              <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">{grupo}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/30">
                    <th className="px-5 py-3 text-left text-xs text-slate-400 font-medium min-w-[220px]">
                      Competência
                    </th>
                    {ALL_CARGOS.map((cargo) => (
                      <th key={cargo} className="px-3 py-3 text-center text-[10px] text-slate-400 font-medium min-w-[120px]">
                        {CARGO_LABELS[cargo].split(" ").slice(0, 2).join(" ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compsGrupo.map((comp) => (
                    <tr key={comp.id} className="border-b border-slate-700/20 hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-3 text-sm text-slate-200">{comp.nome}</td>
                      {ALL_CARGOS.map((cargo) => {
                        const applicable = comp.cargosAplicaveis.includes(cargo);
                        const nivel = niveisMap[comp.id]?.[cargo];
                        return (
                          <td key={cargo} className="px-3 py-2 text-center">
                            {applicable ? (
                              <div className="flex items-center justify-center">
                                <select
                                  value={nivel !== null && nivel !== undefined ? String(nivel) : ""}
                                  onChange={(e) => handleChange(comp.id, cargo, e.target.value)}
                                  className="w-20 px-2 py-1.5 rounded-lg text-xs font-semibold text-center bg-slate-800 border border-slate-600/50 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                  style={
                                    nivel !== null && nivel !== undefined
                                      ? { borderColor: NIVEL_COLORS[nivel], color: NIVEL_COLORS[nivel] }
                                      : {}
                                  }
                                >
                                  <option value="">—</option>
                                  <option value="0">0</option>
                                  <option value="1">1</option>
                                  <option value="2">2</option>
                                  <option value="3">3</option>
                                  <option value="4">4</option>
                                </select>
                              </div>
                            ) : (
                              <span className="text-slate-700 text-xs">N/A</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
