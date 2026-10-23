import { NextResponse } from "next/server";
import type { WikiStory } from "@/lib/types";

const UA = "VinisColecao/1.0 (colecao pessoal de discos)";

// Seções que já aparecem em outro lugar do app ou não contam a história.
const STOP = /^(faixas|lista de faixas|alinhamento|ficha t[eé]cnica|cr[eé]ditos|pessoal|m[uú]sicos|refer[eê]ncias|notas|liga[cç][oõ]es externas|ver tamb[eé]m|paradas|tabelas|certifica|track ?listing|personnel|credits|references|notes|external links|see also|charts|certifications|release history|bibliography|sources)/i;

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function wiki<T>(lang: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  for (const [k, v] of Object.entries({ format: "json", formatversion: "2", origin: "*", ...params })) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate: 60 * 60 * 24 * 7 } });
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  return res.json() as Promise<T>;
}

/** Junta a introdução e as seções de história até chegar em faixas/créditos. */
function story(extract: string) {
  const parts = extract.split(/\n(?===+ )/);
  const kept: string[] = [];
  for (const part of parts) {
    const heading = part.match(/^==+\s*(.+?)\s*==+/);
    if (heading && STOP.test(heading[1])) {
      if (heading[0].startsWith("===")) continue;
      break;
    }
    const body = part.replace(/^==+.*==+\s*/, "").trim();
    if (body) kept.push(body);
  }
  let text = kept.join("\n\n").replace(/\n{3,}/g, "\n\n");
  if (text.length > 3200) {
    const cut = text.lastIndexOf("\n\n", 3200);
    text = text.slice(0, cut > 1200 ? cut : 3200).trim();
  }
  return text;
}

async function find(lang: "pt" | "en", artist: string, album: string): Promise<WikiStory | null> {
  const word = lang === "pt" ? "álbum" : "album";
  const search = await wiki<{ query: { search: { title: string }[] } }>(lang, {
    action: "query",
    list: "search",
    srsearch: `${album} ${artist} ${word}`,
    srlimit: "6",
  });

  const wanted = norm(album);
  const candidate = search.query.search.find((r) => {
    const t = norm(r.title);
    return t === wanted || t.startsWith(wanted);
  });
  if (!candidate) return null;

  const page = await wiki<{
    query: { pages: { title: string; extract?: string; pageprops?: { disambiguation?: string } }[] };
  }>(lang, {
    action: "query",
    prop: "extracts|pageprops",
    titles: candidate.title,
    explaintext: "1",
    exsectionformat: "wiki",
    redirects: "1",
  });

  const p = page.query.pages[0];
  if (!p?.extract || p.pageprops?.disambiguation !== undefined) return null;
  // Confere que a página fala do artista certo.
  if (!norm(p.extract.slice(0, 1500)).includes(norm(artist).split(" ")[0])) return null;

  const text = story(p.extract);
  if (text.length < 80) return null;
  return {
    title: p.title,
    text,
    url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`,
    lang,
  };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const artist = params.get("artist")?.trim() ?? "";
  const album = params.get("album")?.trim() ?? "";
  if (!artist || !album) return NextResponse.json({ error: "Faltou artista ou álbum." }, { status: 400 });

  try {
    const result = (await find("pt", artist, album)) ?? (await find("en", artist, album));
    return NextResponse.json({ story: result });
  } catch {
    return NextResponse.json({ error: "A Wikipedia não respondeu." }, { status: 502 });
  }
}
