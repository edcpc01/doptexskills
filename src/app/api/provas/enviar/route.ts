import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

interface ProvaTemplateDoc {
  competenciaId: string;
  nivelDe: number;
  nivelPara: number;
  formBaseUrl: string;
  entryEmailId: string;
  titulo: string;
  totalQuestoes: number;
  ativo: boolean;
}

function buildPrefilledUrl(formBaseUrl: string, entryEmailId: string, email: string) {
  return `${formBaseUrl}?usp=pp_url&${entryEmailId}=${encodeURIComponent(email)}`;
}

function buildEmailHtml(params: {
  nomeColaborador: string;
  competenciaNome: string;
  nivelDe: number;
  nivelPara: number;
  totalQuestoes: number;
  provaUrl: string;
}) {
  const { nomeColaborador, competenciaNome, nivelDe, nivelPara, totalQuestoes, provaUrl } = params;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#f5f7fa; margin:0; padding:24px;">
  <div style="max-width:560px; margin:0 auto; background:white; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #2563EB 0%, #06B6D4 100%); padding:32px 28px; color:white;">
      <h1 style="margin:0; font-size:22px; font-weight:700;">Nova prova disponível</h1>
      <p style="margin:8px 0 0; opacity:0.9; font-size:14px;">Doptex Skills — Gestão de Competências</p>
    </div>
    <div style="padding:28px;">
      <p style="font-size:15px; color:#1e293b; margin:0 0 16px;">Olá, <strong>${nomeColaborador}</strong>!</p>
      <p style="font-size:14px; color:#475569; line-height:1.6; margin:0 0 20px;">
        Você foi indicado(a) para realizar uma prova de promoção de nível na competência abaixo.
        Para ser aprovado(a), é necessário acertar pelo menos <strong>80%</strong> das questões.
      </p>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:18px; margin:20px 0;">
        <p style="margin:0 0 6px; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#64748b;">Competência</p>
        <p style="margin:0 0 14px; font-size:16px; font-weight:600; color:#0f172a;">${competenciaNome}</p>
        <div style="display:flex; gap:24px; align-items:center;">
          <div>
            <p style="margin:0 0 4px; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#64748b;">Promoção</p>
            <p style="margin:0; font-size:14px; font-weight:600; color:#0f172a;">Nível ${nivelDe} → ${nivelPara}</p>
          </div>
          <div>
            <p style="margin:0 0 4px; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#64748b;">Questões</p>
            <p style="margin:0; font-size:14px; font-weight:600; color:#0f172a;">${totalQuestoes}</p>
          </div>
        </div>
      </div>
      <div style="text-align:center; margin:28px 0;">
        <a href="${provaUrl}" style="display:inline-block; background:#2563EB; color:white; text-decoration:none; padding:14px 36px; border-radius:12px; font-weight:600; font-size:15px;">
          Fazer prova agora
        </a>
      </div>
      <p style="font-size:12px; color:#94a3b8; text-align:center; margin:0;">
        Se o botão não funcionar, copie e cole este link:<br>
        <span style="color:#2563EB; word-break:break-all;">${provaUrl}</span>
      </p>
    </div>
    <div style="background:#f8fafc; padding:16px 28px; text-align:center; border-top:1px solid #e2e8f0;">
      <p style="margin:0; font-size:11px; color:#94a3b8;">Este é um email automático. Em caso de dúvidas, fale com seu gestor.</p>
    </div>
  </div>
</body>
</html>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Doptex Skills <onboarding@resend.dev>";

  if (!apiKey) {
    throw new Error("RESEND_API_KEY não configurada nas variáveis de ambiente");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Resend API error (${res.status}): ${errBody}`);
  }

  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    // Auth: verifica token do Firebase
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const decoded = await getAdminAuth().verifyIdToken(token);

    const adminDb = getAdminDb();

    // Verifica role do usuário
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    const userRole = userDoc.exists ? userDoc.data()?.role : null;
    if (userRole !== "admin" && userRole !== "gestor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { avaliacaoId } = await request.json();
    if (!avaliacaoId) {
      return NextResponse.json({ error: "avaliacaoId é obrigatório" }, { status: 400 });
    }

    // Carrega avaliação
    const avalDoc = await adminDb.collection("avaliacoes_competencia").doc(avaliacaoId).get();
    if (!avalDoc.exists) {
      return NextResponse.json({ error: "Avaliação não encontrada" }, { status: 404 });
    }
    const aval = avalDoc.data()!;

    // Carrega colaborador
    const colabDoc = await adminDb.collection("colaboradores").doc(aval.colaboradorId).get();
    if (!colabDoc.exists) {
      return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 });
    }
    const colab = colabDoc.data()!;
    if (!colab.email) {
      return NextResponse.json({ error: "Colaborador sem email cadastrado" }, { status: 400 });
    }

    // Carrega competência
    const compDoc = await adminDb.collection("competencias").doc(aval.competenciaId).get();
    const competenciaNome = compDoc.exists ? compDoc.data()!.nome : "Competência";

    // Busca template correspondente
    const templatesSnap = await adminDb
      .collection("provas_templates")
      .where("competenciaId", "==", aval.competenciaId)
      .where("nivelDe", "==", aval.nivelAtual)
      .where("nivelPara", "==", aval.nivelProposto)
      .where("ativo", "==", true)
      .limit(1)
      .get();

    if (templatesSnap.empty) {
      return NextResponse.json(
        {
          error: `Nenhum template ativo encontrado para esta competência no nível ${aval.nivelAtual} → ${aval.nivelProposto}. Cadastre o template em Admin → Templates de Provas.`,
        },
        { status: 404 }
      );
    }

    const template = templatesSnap.docs[0].data() as ProvaTemplateDoc;
    const provaUrl = buildPrefilledUrl(template.formBaseUrl, template.entryEmailId, colab.email);

    // Atualiza a avaliação com a URL e marca como enviada
    await avalDoc.ref.update({
      provaUrl,
      provaEnviada: true,
      dataEnvioProva: new Date().toISOString(),
    });

    // Envia email
    const html = buildEmailHtml({
      nomeColaborador: colab.nome,
      competenciaNome,
      nivelDe: template.nivelDe,
      nivelPara: template.nivelPara,
      totalQuestoes: template.totalQuestoes,
      provaUrl,
    });

    await sendEmail(
      colab.email,
      `Nova prova: ${competenciaNome} (Nível ${template.nivelDe} → ${template.nivelPara})`,
      html
    );

    return NextResponse.json({
      success: true,
      provaUrl,
      email: colab.email,
      message: `Prova enviada para ${colab.email}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro ao enviar prova:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
