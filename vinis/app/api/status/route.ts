import { NextResponse } from "next/server";

/** Diz quais serviços estão configurados, sem expor as chaves. */
export function GET() {
  return NextResponse.json({
    discogs: Boolean(process.env.DISCOGS_TOKEN),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    spotify: Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
  });
}
