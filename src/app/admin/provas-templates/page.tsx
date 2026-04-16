"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ProvaTemplate, Competencia, NivelCompetencia } from "@/lib/types";
import { NIVEL_LABELS } from "@/lib/types";
import { Plus, Edit2, Trash2, X, Save, ExternalLink, Info, CheckCircle, AlertCircle } from "lucide-react";

const NIVEL_OPTIONS: NivelCompetencia[] = [0, 1, 2, 3, 4];

function extractFormId(input: string): string {
  // Accepts full URL or raw ID
  const match = input.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : input.trim();
}

function buildFormBaseUrl(formId: string): string {
  return `https://docs.google.com/forms/d/${formId}/viewform`;
}

function buildPrefilledUrl(template: ProvaTemplate, email: string): string {
  return `${template.formBaseUrl}?usp=pp_url&${template.entryEmailId}=${encodeURIComponent(email)}`;
}

const emptyForm = {
  competenciaId: "",
  nivelDe: 0 as NivelCompetencia,
  nivelPara: 1 as NivelCompetencia,
  titulo: "",
  formInput: "",   // raw input (URL or ID)
  entryEmailId: "",
  totalQuestoes: 10,
  ativo: true,
};

export default function ProvasTemplatesPage() {
  const [templates, setTemplates] = useState<ProvaTemplate[]>([]);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ProvaTemplate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showGuide, setShowGuide] = useState(false);
  const [previewEmail, setPreviewEmail] = useState("colaborador@empresa.com");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tSnap, cSnap] = await Promise.all([
        getDocs(collection(db, "provas_templates")),
        getDocs(collection(db, "competencias")),
      ]);
      setTemplates(tSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ProvaTemplate)));
      setCompetencias(cSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Competencia)).sort((a, b) => a.ordem - b.ordem));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (t: ProvaTemplate) => {
    setEditing(t);
    setForm({
      competenciaId: t.competenciaId,
      nivelDe: t.nivelDe,
      nivelPara: t.nivelPara,
      titulo: t.titulo,
      formInput: t.formBaseUrl,
      entryEmailId: t.entryEmailId,
      totalQuestoes: t.totalQuestoes,
      ativo: t.ativo,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.competenciaId || !form.formInput || !form.entryEmailId || !form.titulo) return;
    setSaving(true);
    try {
      const formId = extractFormId(form.formInput);
      const formBaseUrl = buildFormBaseUrl(formId);
      const payload = {
        competenciaId: form.competenciaId,
        nivelDe: form.nivelDe,
        nivelPara: form.nivelPara,
        titulo: form.titulo,
        formId,
        formBaseUrl,
        entryEmailId: form.entryEmailId.startsWith("entry.") ? form.entryEmailId : `entry.${form.entryEmailId}`,
        totalQuestoes: form.totalQuestoes,
        ativo: form.ativo,
        criadoEm: editing?.criadoEm ?? new Date().toISOString(),
      };

      if (editing) {
        await updateDoc(doc(db, "provas_templates", editing.id), payload);
      } else {
        await addDoc(collection(db, "provas_templates"), payload);
      }
      setShowModal(false);
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este template?")) return;
    await deleteDoc(doc(db, "provas_templates", id));
    await loadData();
  };

  const getCompetenciaNome = (id: string) =>
    competencias.find((c) => c.id === id)?.nome ?? id;

  // Auto-generate title when competencia or nivel changes
  const autoTitle = () => {
    const comp = competencias.find((c) => c.id === form.competenciaId);
    if (!comp) return "";
    return `${comp.nome} — Nível ${form.nivelDe} → ${form.nivelPara}`;
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Templates de Provas</h1>
          <p className="text-sm text-slate-400 mt-1">{templates.length} template{templates.length !== 1 ? "s" : ""} cadastrado{templates.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 text-sm transition-all"
          >
            <Info size={16} /> Como criar o Form
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all"
          >
            <Plus size={16} /> Novo Template
          </button>
        </div>
      </div>

      {/* Guia Google Forms */}
      {showGuide && (
        <div className="glass-card rounded-2xl p-6 border border-blue-500/20">
          <h3 className="text-sm font-semibold text-blue-400 mb-4 flex items-center gap-2">
            <Info size={16} /> Guia: Como criar e configurar o Google Forms
          </h3>
          <ol className="space-y-3 text-sm text-slate-300">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <span>Acesse <span className="text-blue-400">forms.google.com</span> e crie um novo formulário. Ative o <strong>Modo Quiz</strong> (Configurações → Questionários → Ativar).</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <span>Adicione como <strong>primeira pergunta</strong>: "Email" (Resposta curta, obrigatória). Esta pergunta capturará o email do colaborador.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <span>Adicione as perguntas de múltipla escolha da prova e marque as <strong>respostas corretas</strong> em cada questão (chave do quiz).</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <span>
                Para obter o <strong>Entry ID do email</strong>: clique nos 3 pontinhos → <em>Obter link de preenchimento prévio</em> → preencha um email de teste → clique em <em>Obter link</em>.
                Na URL gerada, copie a parte <code className="bg-slate-800 px-1 rounded text-blue-300">entry.XXXXXXXXX</code> que corresponde ao campo de email.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">5</span>
              <span>
                Configure o <strong>Google Apps Script</strong> para enviar as respostas ao webhook:
                <br />No formulário, clique nos 3 pontinhos → <em>Editor de script</em> → cole o código abaixo e salve.
              </span>
            </li>
          </ol>
          <div className="mt-4 bg-slate-900 rounded-xl p-4 text-xs font-mono text-green-300 overflow-x-auto">
            <pre>{`function onFormSubmit(e) {
  var form = FormApp.getActiveForm();
  var responses = e.response.getItemResponses();
  var email = "";
  var respostas = [];

  responses.forEach(function(r) {
    var title = r.getItem().getTitle();
    var answer = r.getResponse();
    var score = r.getScore();
    var maxScore = r.getItem().asScaleItem ? 0 : 1;

    if (title.toLowerCase() === "email") {
      email = answer;
    } else {
      respostas.push({
        pergunta: title,
        resposta: answer,
        correct: score > 0
      });
    }
  });

  UrlFetchApp.fetch("${typeof window !== "undefined" ? window.location.origin : "https://SEU-DOMINIO.vercel.app"}/api/provas/webhook", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      email: email,
      respostas: respostas,
      timestamp: new Date().toISOString()
    })
  });
}`}</pre>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Após salvar o script, clique em <strong>Executar → Adicionar gatilho</strong> → evento: <em>Ao enviar formulário</em>.
          </p>
        </div>
      )}

      {/* Lista de templates */}
      {templates.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 flex flex-col items-center gap-3 text-slate-500">
          <AlertCircle size={36} className="text-slate-600" />
          <p className="text-sm">Nenhum template cadastrado ainda.</p>
          <button onClick={openCreate} className="text-sm text-blue-400 hover:underline">Criar o primeiro template</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {templates.map((t) => {
            const comp = competencias.find((c) => c.id === t.competenciaId);
            return (
              <div key={t.id} className="glass-card rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`w-2 h-2 rounded-full ${t.ativo ? "bg-emerald-400" : "bg-slate-600"}`} />
                      <h3 className="text-sm font-semibold text-white truncate">{t.titulo}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.ativo ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>
                        {t.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-400">
                      <span><span className="text-slate-500">Competência:</span> {comp?.nome ?? t.competenciaId}</span>
                      <span><span className="text-slate-500">Nível:</span> {t.nivelDe} → {t.nivelPara}</span>
                      <span><span className="text-slate-500">Questões:</span> {t.totalQuestoes}</span>
                      <span><span className="text-slate-500">Entry ID:</span> <code className="text-blue-300">{t.entryEmailId}</code></span>
                    </div>
                    {/* Preview URL */}
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        value={previewEmail}
                        onChange={(e) => setPreviewEmail(e.target.value)}
                        placeholder="Email de preview"
                        className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-300 w-52 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <a
                        href={buildPrefilledUrl(t, previewEmail)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-400 hover:underline"
                      >
                        <ExternalLink size={12} /> Testar link prefilled
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(t)}
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal criar/editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-white mb-5">
              {editing ? "Editar Template" : "Novo Template de Prova"}
            </h3>

            <div className="space-y-4">
              {/* Competência */}
              <div>
                <label className="block text-sm text-slate-300 mb-1">Competência</label>
                <select
                  value={form.competenciaId}
                  onChange={(e) => setForm({ ...form, competenciaId: e.target.value, titulo: "" })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Selecione...</option>
                  {competencias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              {/* Nível de / para */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Nível De</label>
                  <select
                    value={form.nivelDe}
                    onChange={(e) => setForm({ ...form, nivelDe: Number(e.target.value) as NivelCompetencia })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {NIVEL_OPTIONS.filter((n) => n < 4).map((n) => (
                      <option key={n} value={n}>{n} — {NIVEL_LABELS[n].split(" / ")[0]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Nível Para</label>
                  <select
                    value={form.nivelPara}
                    onChange={(e) => setForm({ ...form, nivelPara: Number(e.target.value) as NivelCompetencia })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {NIVEL_OPTIONS.filter((n) => n > form.nivelDe).map((n) => (
                      <option key={n} value={n}>{n} — {NIVEL_LABELS[n].split(" / ")[0]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Título
                  {form.competenciaId && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, titulo: autoTitle() })}
                      className="ml-2 text-[10px] text-blue-400 hover:underline"
                    >
                      auto-preencher
                    </button>
                  )}
                </label>
                <input
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex: Operação de Tear — Nível 1 → 2"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500"
                />
              </div>

              {/* Form URL */}
              <div>
                <label className="block text-sm text-slate-300 mb-1">URL ou ID do Google Form</label>
                <input
                  value={form.formInput}
                  onChange={(e) => setForm({ ...form, formInput: e.target.value })}
                  placeholder="Cole a URL completa ou só o ID do formulário"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500"
                />
                {form.formInput && (
                  <p className="mt-1 text-[10px] text-slate-500">
                    Form ID detectado: <code className="text-blue-300">{extractFormId(form.formInput) || "—"}</code>
                  </p>
                )}
              </div>

              {/* Entry ID do email */}
              <div>
                <label className="block text-sm text-slate-300 mb-1">Entry ID do campo Email</label>
                <input
                  value={form.entryEmailId}
                  onChange={(e) => setForm({ ...form, entryEmailId: e.target.value })}
                  placeholder="entry.123456789"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Obtenha via: 3 pontinhos do Form → <em>Obter link de preenchimento prévio</em>
                </p>
              </div>

              {/* Total questões */}
              <div>
                <label className="block text-sm text-slate-300 mb-1">Total de questões</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={form.totalQuestoes}
                  onChange={(e) => setForm({ ...form, totalQuestoes: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Ativo */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm({ ...form, ativo: !form.ativo })}
                  className={`w-10 h-6 rounded-full transition-colors relative ${form.ativo ? "bg-blue-600" : "bg-slate-700"}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${form.ativo ? "left-5" : "left-1"}`} />
                </div>
                <span className="text-sm text-slate-300">{form.ativo ? "Template ativo" : "Template inativo"}</span>
              </label>
            </div>

            {/* Validação visual */}
            {form.competenciaId && form.formInput && form.entryEmailId && (
              <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle size={14} />
                Link prefilled será: <code className="text-blue-300 truncate max-w-xs">{buildPrefilledUrl({ formBaseUrl: buildFormBaseUrl(extractFormId(form.formInput)), entryEmailId: form.entryEmailId.startsWith("entry.") ? form.entryEmailId : `entry.${form.entryEmailId}` } as ProvaTemplate, "email@teste.com")}</code>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.competenciaId || !form.formInput || !form.entryEmailId || !form.titulo}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save size={16} />
                {saving ? "Salvando..." : "Salvar Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
