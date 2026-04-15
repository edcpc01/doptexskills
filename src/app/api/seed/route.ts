import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { COLABORADORES_SEED, COMPETENCIAS_SEED, NOTAS_INICIAIS } from "@/lib/seed-data";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const adminDb = getAdminDb();
    const batch = adminDb.batch();

    // 1. Seed colaboradores
    const colabIds: Record<string, string> = {};
    for (const colab of COLABORADORES_SEED) {
      const ref = adminDb.collection("colaboradores").doc();
      colabIds[colab.nome] = ref.id;
      batch.set(ref, colab);
    }

    // 2. Seed competencias (only operação group for now, matching NOTAS_INICIAIS order)
    const operacaoComps = COMPETENCIAS_SEED.filter((c) =>
      c.cargos.some((cargo) => ["TECELAO", "AJUDANTE_PRODUCAO", "EXPEDIDOR", "AUX_MANUT_MECANICA"].includes(cargo))
    );

    const compIds: string[] = [];
    operacaoComps.forEach((comp, i) => {
      const ref = adminDb.collection("competencias").doc();
      compIds.push(ref.id);
      batch.set(ref, {
        nome: comp.nome,
        grupo: comp.grupo,
        cargosAplicaveis: comp.cargos,
        ordem: i,
      });
    });

    // Also seed remaining competencias (Líder, Supervisor)
    const otherComps = COMPETENCIAS_SEED.filter((c) =>
      !c.cargos.some((cargo) => ["TECELAO", "AJUDANTE_PRODUCAO", "EXPEDIDOR", "AUX_MANUT_MECANICA"].includes(cargo))
    );
    otherComps.forEach((comp, i) => {
      const ref = adminDb.collection("competencias").doc();
      batch.set(ref, {
        nome: comp.nome,
        grupo: comp.grupo,
        cargosAplicaveis: comp.cargos,
        ordem: operacaoComps.length + i,
      });
    });

    // 3. Seed initial evaluations from NOTAS_INICIAIS
    for (const [nome, notas] of Object.entries(NOTAS_INICIAIS)) {
      const colabId = colabIds[nome];
      if (!colabId) continue;

      notas.forEach((nivel, idx) => {
        if (idx < compIds.length) {
          const ref = adminDb.collection("avaliacoes_competencia").doc();
          batch.set(ref, {
            colaboradorId: colabId,
            competenciaId: compIds[idx],
            nivelAtual: nivel,
            nivelProposto: nivel,
            avaliadorId: "seed",
            dataAvaliacao: "2026-03-01T00:00:00.000Z",
            periodoReferencia: "2026-Q1",
            status: "confirmado",
            provaEnviada: false,
          });
        }
      });
    }

    // 4. Seed default IDC weights
    batch.set(adminDb.collection("config").doc("pesos_idc"), {
      competencias: 0.35,
      eficiencia: 0.25,
      desempenho: 0.25,
      assiduidade: 0.15,
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Seeded ${COLABORADORES_SEED.length} colaboradores, ${COMPETENCIAS_SEED.length} competências, and initial evaluations.`,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
