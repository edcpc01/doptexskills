import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { COLABORADORES_SEED, COMPETENCIAS_SEED, NOTAS_INICIAIS, EFICIENCIA_INICIAL } from "@/lib/seed-data";

export const dynamic = "force-dynamic";

type MonthlyRecord = { mes: string; desempenho: number; assiduidade: number; diasUteis: number; faltas: number };

function generateMonthlyData(eficiencia: number | undefined, baseMonth: Date, months: number): MonthlyRecord[] {
  const results: MonthlyRecord[] = [];
  const baseEf = eficiencia ?? 50;

  for (let i = 0; i < months; i++) {
    const d = new Date(baseMonth);
    d.setMonth(d.getMonth() - (months - 1 - i));
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    const variation = (Math.random() - 0.5) * 20;
    const desempenho = Math.max(0, Math.min(100, Math.round(baseEf + variation)));

    const diasUteis = 22;
    const faltasProbabilidade = baseEf < 50 ? 0.3 : baseEf < 70 ? 0.15 : 0.05;
    const faltas = Math.random() < faltasProbabilidade ? Math.floor(Math.random() * 3) + 1 : 0;
    const assiduidade = Math.round(((diasUteis - faltas) / diasUteis) * 100);

    results.push({ mes, desempenho, assiduidade, diasUteis, faltas });
  }
  return results;
}

async function clearCollection(db: FirebaseFirestore.Firestore, name: string) {
  const snap = await db.collection(name).get();
  const batchSize = 400;
  for (let i = 0; i < snap.docs.length; i += batchSize) {
    const batch = db.batch();
    snap.docs.slice(i, i + batchSize).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function runSeed(reset: boolean = false) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return NextResponse.json({
      error: "Missing env vars",
      has_project_id: !!projectId,
      has_client_email: !!clientEmail,
      has_private_key: !!privateKey,
    }, { status: 500 });
  }

  try {
    const adminDb = getAdminDb();

    if (reset) {
      await clearCollection(adminDb, "colaboradores");
      await clearCollection(adminDb, "competencias");
      await clearCollection(adminDb, "avaliacoes_competencia");
      await clearCollection(adminDb, "avaliacao_desempenho");
      await clearCollection(adminDb, "assiduidade");
      await clearCollection(adminDb, "eficiencia");
    }

    // Firestore batch limit is 500 — we'll use multiple batches
    const writes: { ref: FirebaseFirestore.DocumentReference; data: any }[] = [];

    // 1. Seed colaboradores
    const colabIds: Record<string, string> = {};
    for (const colab of COLABORADORES_SEED) {
      const ref = adminDb.collection("colaboradores").doc();
      colabIds[colab.nome] = ref.id;
      writes.push({ ref, data: colab });
    }

    // 2. Seed competencias
    const operacaoComps = COMPETENCIAS_SEED.filter((c) =>
      c.cargos.some((cargo) => ["TECELAO", "AJUDANTE_PRODUCAO", "EXPEDIDOR", "AUX_MANUT_MECANICA"].includes(cargo))
    );
    const compIds: string[] = [];
    operacaoComps.forEach((comp, i) => {
      const ref = adminDb.collection("competencias").doc();
      compIds.push(ref.id);
      writes.push({
        ref,
        data: { nome: comp.nome, grupo: comp.grupo, cargosAplicaveis: comp.cargos, ordem: i },
      });
    });
    const otherComps = COMPETENCIAS_SEED.filter((c) =>
      !c.cargos.some((cargo) => ["TECELAO", "AJUDANTE_PRODUCAO", "EXPEDIDOR", "AUX_MANUT_MECANICA"].includes(cargo))
    );
    otherComps.forEach((comp, i) => {
      const ref = adminDb.collection("competencias").doc();
      writes.push({
        ref,
        data: { nome: comp.nome, grupo: comp.grupo, cargosAplicaveis: comp.cargos, ordem: operacaoComps.length + i },
      });
    });

    // 3. Seed evaluations
    for (const [nome, notas] of Object.entries(NOTAS_INICIAIS)) {
      const colabId = colabIds[nome];
      if (!colabId) continue;
      notas.forEach((nivel, idx) => {
        if (idx < compIds.length) {
          const ref = adminDb.collection("avaliacoes_competencia").doc();
          writes.push({
            ref,
            data: {
              colaboradorId: colabId,
              competenciaId: compIds[idx],
              nivelAtual: nivel,
              nivelProposto: nivel,
              avaliadorId: "seed",
              dataAvaliacao: "2026-03-01T00:00:00.000Z",
              periodoReferencia: "2026-Q1",
              status: "confirmado",
              provaEnviada: false,
            },
          });
        }
      });
    }

    // 4. Seed eficiência
    for (const [nome, ef] of Object.entries(EFICIENCIA_INICIAL)) {
      const colabId = colabIds[nome];
      if (!colabId) continue;
      const ref = adminDb.collection("eficiencia").doc();
      writes.push({
        ref,
        data: { colaboradorId: colabId, mes: "2026-03", valor: ef, observacao: "Importado da planilha Março-2026" },
      });
    }

    // 5. Monthly data
    const baseMonth = new Date("2026-04-01");
    for (const [nome, colabId] of Object.entries(colabIds)) {
      const ef = EFICIENCIA_INICIAL[nome];
      const monthly = generateMonthlyData(ef, baseMonth, 6);
      for (const m of monthly) {
        const desRef = adminDb.collection("avaliacao_desempenho").doc();
        writes.push({
          ref: desRef,
          data: { colaboradorId: colabId, mes: m.mes, nota: m.desempenho, observacoes: "", avaliadorId: "seed" },
        });
        const assidRef = adminDb.collection("assiduidade").doc();
        writes.push({
          ref: assidRef,
          data: {
            colaboradorId: colabId,
            mes: m.mes,
            diasUteis: m.diasUteis,
            diasTrabalhados: m.diasUteis - m.faltas,
            faltas: m.faltas,
            atrasos: 0,
            percentualPresenca: m.assiduidade,
          },
        });
      }
    }

    // 6. Config
    writes.push({
      ref: adminDb.collection("config").doc("pesos_idc"),
      data: { competencias: 0.35, eficiencia: 0.25, desempenho: 0.25, assiduidade: 0.15 },
    });

    // Commit in batches of 400
    const BATCH_SIZE = 400;
    for (let i = 0; i < writes.length; i += BATCH_SIZE) {
      const batch = adminDb.batch();
      writes.slice(i, i + BATCH_SIZE).forEach(({ ref, data }) => batch.set(ref, data));
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      reset,
      colaboradores: COLABORADORES_SEED.length,
      competencias: COMPETENCIAS_SEED.length,
      avaliacoes: Object.keys(NOTAS_INICIAIS).length * 21,
      eficiencia_records: Object.keys(EFICIENCIA_INICIAL).length,
      monthly_records: COLABORADORES_SEED.length * 6 * 2,
      total_writes: writes.length,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || String(error),
      code: error.code || "unknown",
      stack: error.stack?.split("\n").slice(0, 3),
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const reset = url.searchParams.get("reset") === "true";
  return runSeed(reset);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reset = url.searchParams.get("reset") === "true";
  return runSeed(reset);
}
