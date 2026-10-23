import { NextResponse } from "next/server";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function token() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Spotify token ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^the /, "")
    .trim();
}

type Album = { id: string; name: string; artists: { name: string }[]; external_urls: { spotify: string } };

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const artist = params.get("artist")?.trim() ?? "";
  const album = params.get("album")?.trim() ?? "";
  if (!artist && !album) return NextResponse.json({ error: "Faltou artista ou álbum." }, { status: 400 });

  const fallback = `https://open.spotify.com/search/${encodeURIComponent(`${artist} ${album}`.trim())}`;

  try {
    const access = await token();
    if (!access) return NextResponse.json({ url: null, id: null, searchUrl: fallback, configured: false });

    const search = async (q: string) => {
      const url = new URL("https://api.spotify.com/v1/search");
      url.searchParams.set("q", q);
      url.searchParams.set("type", "album");
      url.searchParams.set("limit", "10");
      const res = await fetch(url, { headers: { Authorization: `Bearer ${access}` }, cache: "no-store" });
      if (!res.ok) throw new Error(`Spotify search ${res.status}`);
      return ((await res.json()) as { albums: { items: Album[] } }).albums.items;
    };

    let items = await search(`album:${album} artist:${artist}`);
    if (!items.length) items = await search(`${artist} ${album}`);

    const wantAlbum = norm(album);
    const wantArtist = norm(artist);
    const score = (a: Album) => {
      const name = norm(a.name);
      const artists = a.artists.map((x) => norm(x.name));
      let s = 0;
      if (name === wantAlbum) s += 4;
      else if (name.startsWith(wantAlbum) || wantAlbum.startsWith(name)) s += 2;
      if (artists.some((x) => x === wantArtist)) s += 3;
      else if (artists.some((x) => wantArtist.includes(x) || x.includes(wantArtist))) s += 1;
      return s;
    };
    const best = items.map((a) => ({ a, s: score(a) })).sort((x, y) => y.s - x.s)[0];

    if (!best || best.s < 3) return NextResponse.json({ url: null, id: null, searchUrl: fallback, configured: true });
    return NextResponse.json({
      url: best.a.external_urls.spotify,
      id: best.a.id,
      searchUrl: fallback,
      configured: true,
    });
  } catch {
    return NextResponse.json({ url: null, id: null, searchUrl: fallback, configured: true, error: true });
  }
}
