import { NextResponse } from "next/server";
import { MissingConfigError, discogsDetails } from "@/lib/discogs";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const type = params.get("type");
  const id = Number(params.get("id"));

  if ((type !== "master" && type !== "release") || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Disco inválido." }, { status: 400 });
  }

  try {
    return NextResponse.json(await discogsDetails(type, id));
  } catch (err) {
    if (err instanceof MissingConfigError) {
      return NextResponse.json({ error: "Falta o DISCOGS_TOKEN na Vercel." }, { status: 503 });
    }
    return NextResponse.json({ error: "Não deu para carregar esse disco no Discogs." }, { status: 502 });
  }
}
