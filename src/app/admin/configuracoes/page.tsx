"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PESOS_DEFAULT, type PesosIDC } from "@/lib/types";
import { Save, Settings, Sliders } from "lucide-react";

export default function ConfiguracoesPage() {
  const [pesos, setPesos] = useState<PesosIDC>(PESOS_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const snap = await getDoc(doc(db, "config", "pesos_idc"));
      if (snap.exists()) setPesos(snap.data() as PesosIDC);
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  const total = Math.round((pesos.competencias + pesos.eficiencia + pesos.desempenho + pesos.assiduidade) * 100);

  const handleSave = async () => {
    if (total !== 100) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "config", "pesos_idc"), pesos);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setSaving(false);
    }
  };

  const updatePeso = (key: keyof PesosIDC, value: number) => {
    setPesos((prev) => ({ ...prev, [key]: value / 100 }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="text-sm text-slate-400 mt-1">Ajuste os parâmetros do sistema</p>
      </div>

      <div className="glass-card rounded-2xl p-6 max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <Sliders size={20} className="text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Pesos do IDC</h2>
        </div>

        <p className="text-sm text-slate-400 mb-6">
          Configure os pesos de cada pilar no cálculo do Índice de Desenvolvimento do Colaborador. A soma deve totalizar 100%.
        </p>

        <div className="space-y-5">
          <WeightSlider label="Competências" value={Math.round(pesos.competencias * 100)} color="#2563EB"
            onChange={(v) => updatePeso("competencias", v)} />
          <WeightSlider label="Eficiência" value={Math.round(pesos.eficiencia * 100)} color="#06B6D4"
            onChange={(v) => updatePeso("eficiencia", v)} />
          <WeightSlider label="Desempenho" value={Math.round(pesos.desempenho * 100)} color="#8B5CF6"
            onChange={(v) => updatePeso("desempenho", v)} />
          <WeightSlider label="Assiduidade" value={Math.round(pesos.assiduidade * 100)} color="#10B981"
            onChange={(v) => updatePeso("assiduidade", v)} />
        </div>

        <div className={`mt-6 p-3 rounded-xl text-center text-sm font-bold ${
          total === 100 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
        }`}>
          Total: {total}% {total !== 100 && "(deve ser 100%)"}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || total !== 100}
          className="mt-4 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saved ? (
            <>✓ Salvo com sucesso</>
          ) : (
            <><Save size={16} />{saving ? "Salvando..." : "Salvar Pesos"}</>
          )}
        </button>
      </div>
    </div>
  );
}

function WeightSlider({
  label, value, color, onChange,
}: {
  label: string; value: number; color: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="text-sm font-bold text-white">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} ${value}%, #334155 ${value}%)`,
        }}
      />
    </div>
  );
}
