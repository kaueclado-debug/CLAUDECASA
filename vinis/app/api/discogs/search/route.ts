import { NextResponse } from "next/server";
import { MissingConfigError, searchDiscogs } from "@/lib/discogs";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim() || undefined;
  const barcode = params.get("barcode")?.trim() || undefined;
  const artist = params.get("artist")?.trim() || undefined;
  const album = params.get("album")?.trim() || undefined;

  if (!q && !barcode && !artist && !album) {
    return NextResponse.json({ error: "Digite um artista ou álbum." }, { status: 400 });
  }

  try {
    const results = await searchDiscogs({ q, barcode, artist, album });
    return NextResponse.json({ results });
  } catch (err) {
    if (err instanceof MissingConfigError) {
      return NextResponse.json(
        { error: "A busca precisa do DISCOGS_TOKEN nas variáveis de ambiente da Vercel." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "O Discogs não respondeu. Tente de novo em instantes." }, { status: 502 });
  }
}
