import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

const SCHEMA = {
  type: "object",
  properties: {
    found: { type: "boolean", description: "true se a foto mostra a capa (ou o selo) de um disco reconhecível" },
    artist: { type: "string" },
    album: { type: "string" },
    year: { type: ["integer", "null"] },
    barcode: { type: ["string", "null"], description: "Dígitos do código de barras, se estiver legível na foto" },
    confidence: { type: "string", enum: ["alta", "media", "baixa"] },
    alternatives: {
      type: "array",
      items: {
        type: "object",
        properties: { artist: { type: "string" }, album: { type: "string" } },
        required: ["artist", "album"],
        additionalProperties: false,
      },
    },
  },
  required: ["found", "artist", "album", "year", "barcode", "confidence", "alternatives"],
  additionalProperties: false,
} as const;

export type IdentifyResult = {
  found: boolean;
  artist: string;
  album: string;
  year: number | null;
  barcode: string | null;
  confidence: "alta" | "media" | "baixa";
  alternatives: { artist: string; album: string }[];
};

const PROMPT = `Esta é a foto de um disco de vinil (capa, contracapa ou selo central).
Identifique o artista e o álbum. Use o texto visível, a arte da capa e o seu conhecimento de discografias.
Escreva artista e álbum como aparecem no lançamento original (sem traduzir).
Se houver mais de uma possibilidade razoável, coloque as outras em "alternatives" (no máximo 3).
Se não for um disco ou não houver como saber, devolva found=false com artist e album vazios.`;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "O reconhecimento por foto precisa da ANTHROPIC_API_KEY nas variáveis de ambiente da Vercel." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as { image?: string } | null;
  const match = body?.image?.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!match || !MEDIA_TYPES.includes(match[1] as MediaType)) {
    return NextResponse.json({ error: "Envie uma foto em JPG, PNG ou WebP." }, { status: 400 });
  }

  const client = new Anthropic();

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: match[1] as MediaType, data: match[2] } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "Não consegui analisar essa foto. Tente buscar pelo nome." }, { status: 422 });
    }

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new Error("Resposta sem texto");
    return NextResponse.json(JSON.parse(text.text) as IdentifyResult);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Muitas fotos seguidas. Espere alguns segundos." }, { status: 429 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "A ANTHROPIC_API_KEY configurada é inválida." }, { status: 503 });
    }
    return NextResponse.json({ error: "O reconhecimento falhou. Tente outra foto ou busque pelo nome." }, { status: 502 });
  }
}
