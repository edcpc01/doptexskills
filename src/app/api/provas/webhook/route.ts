import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const body = await request.json();
    const { email, respostas, timestamp } = body;

    if (!email || !respostas) {
      return NextResponse.json({ error: "Missing email or respostas" }, { status: 400 });
    }

    // Find the pending prova for this email
    const avalSnapshot = await adminDb
      .collection("avaliacoes_competencia")
      .where("status", "==", "pendente_prova")
      .where("provaEnviada", "==", true)
      .get();

    // Match by collaborator email
    const colabSnapshot = await adminDb
      .collection("colaboradores")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (colabSnapshot.empty) {
      return NextResponse.json({ error: "Colaborador not found" }, { status: 404 });
    }

    const colaboradorId = colabSnapshot.docs[0].id;

    // Find pending evaluation for this colaborador
    const pendingAvals = avalSnapshot.docs.filter(
      (doc) => doc.data().colaboradorId === colaboradorId
    );

    if (pendingAvals.length === 0) {
      return NextResponse.json({ error: "No pending evaluation found" }, { status: 404 });
    }

    // Calculate score: count correct answers
    // Assumes respostas is array of { pergunta, resposta }
    // The Google Form should have a scoring mechanism
    const totalQuestions = respostas.length;
    const correctAnswers = respostas.filter((r: any) => r.correct === true).length;
    const nota = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const aprovado = nota >= 80;

    // Update the most recent pending evaluation
    const avalDoc = pendingAvals[0];
    await avalDoc.ref.update({
      status: aprovado ? "aprovado" : "reprovado",
      notaProva: nota,
      provaAprovada: aprovado,
    });

    // If approved, the nivel is already set as nivelProposto in the evaluation
    // The frontend reads the status to determine the current level

    return NextResponse.json({
      success: true,
      colaboradorId,
      nota,
      aprovado,
      message: aprovado
        ? `Aprovado com ${nota}%. Nível atualizado.`
        : `Reprovado com ${nota}%. Nível mantido. Mínimo: 80%.`,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
