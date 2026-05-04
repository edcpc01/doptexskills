import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const decoded = await getAdminAuth().verifyIdToken(token);

    const adminDb = getAdminDb();
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    const userRole = userDoc.exists ? userDoc.data()?.role : null;
    if (userRole !== "admin" && userRole !== "gestor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { avaliacaoId } = await request.json();
    if (!avaliacaoId) {
      return NextResponse.json({ error: "avaliacaoId é obrigatório" }, { status: 400 });
    }

    await adminDb.collection("avaliacoes_competencia").doc(avaliacaoId).delete();

    return NextResponse.json({ success: true, message: "Prova excluída" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro ao excluir prova:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
