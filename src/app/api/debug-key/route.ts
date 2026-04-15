import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || "";
  
  // Clean key same way as firebase-admin.ts
  let cleaned = privateKey.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
  
  const hasBegin = cleaned.includes("-----BEGIN PRIVATE KEY-----");
  const hasEnd = cleaned.includes("-----END PRIVATE KEY-----");
  const lineCount = cleaned.split("\n").length;
  const firstChars = privateKey.substring(0, 50);
  const lastChars = privateKey.substring(privateKey.length - 50);
  
  return NextResponse.json({
    key_length: privateKey.length,
    cleaned_length: cleaned.length,
    has_begin_marker: hasBegin,
    has_end_marker: hasEnd,
    line_count_after_clean: lineCount,
    first_50_chars: firstChars,
    last_50_chars: lastChars,
    starts_with_quote: privateKey.startsWith('"') || privateKey.startsWith("'"),
    contains_literal_backslash_n: privateKey.includes("\\n"),
    contains_real_newline: privateKey.includes("\n"),
  });
}
