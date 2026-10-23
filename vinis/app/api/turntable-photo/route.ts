import { NextResponse } from "next/server";

const UA = "VinisColecao/1.0 (colecao pessoal de discos)";

type Page = {
  title: string;
  imageinfo?: { thumburl?: string; url: string; extmetadata?: { Artist?: { value: string } } }[];
};

/** Procura uma foto de referência do modelo no Wikimedia Commons. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const brand = params.get("brand")?.trim() ?? "";
  const model = params.get("model")?.trim() ?? "";
  if (!brand || !model) return NextResponse.json({ photo: null });

  const url = new URL("https://commons.wikimedia.org/w/api.php");
  const query = {
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: `${brand} ${model} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: "8",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "800",
  };
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);

  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate: 60 * 60 * 24 * 30 } });
    if (!res.ok) throw new Error();
    const data = (await res.json()) as { query?: { pages: Page[] } };
    const modelKey = model.toLowerCase().replace(/[^a-z0-9]/g, "");
    const pages = data.query?.pages ?? [];
    const hit = pages.find((p) => p.title.toLowerCase().replace(/[^a-z0-9]/g, "").includes(modelKey));
    const info = hit?.imageinfo?.[0];
    if (!info) return NextResponse.json({ photo: null });
    const credit = info.extmetadata?.Artist?.value.replace(/<[^>]+>/g, "").trim();
    return NextResponse.json({
      photo: info.thumburl ?? info.url,
      credit: credit ? `Foto: ${credit} / Wikimedia Commons` : "Wikimedia Commons",
    });
  } catch {
    return NextResponse.json({ photo: null });
  }
}
