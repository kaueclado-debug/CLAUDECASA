"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRecords, useTurntables } from "@/lib/db";
import { GRADES } from "@/lib/types";

type Row = { name: string; value: number };

function count<T>(items: T[], key: (item: T) => string | string[] | undefined) {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    for (const name of Array.isArray(k) ? k : k ? [k] : []) map.set(name, (map.get(name) ?? 0) + 1);
  }
  return [...map].map(([name, value]) => ({ name, value }));
}

function Bars({ title, rows, unit = "discos" }: { title: string; rows: Row[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section>
      <h2 className="section-title">{title}</h2>
      {rows.length === 0 ? (
        <p className="muted">Sem dados ainda.</p>
      ) : (
        <ul className="bars">
          {rows.map((r) => (
            <li key={r.name} className="bar" title={`${r.name}: ${r.value} ${r.value === 1 ? unit.replace(/s$/, "") : unit}`}>
              <span className="bar-name">{r.name}</span>
              <span className="bar-track" aria-hidden="true">
                <span className="bar-fill" style={{ display: "block", width: `${(r.value / max) * 100}%` }} />
              </span>
              <span className="bar-value">{r.value}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function StatsPage() {
  const { data, ready } = useRecords();
  const { data: decks } = useTurntables();

  const stats = useMemo(() => {
    const owned = data.filter((r) => r.status === "collection");
    const top = (rows: Row[], n = 8) => rows.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name)).slice(0, n);

    const decadeName = (d: number) => (d >= 1930 && d < 2000 ? `Anos ${String(d).slice(2)}` : `Anos ${d}`);
    const decades = count(
      owned.filter((r) => r.year),
      (r) => String(Math.floor(r.year! / 10) * 10),
    )
      .sort((a, b) => Number(a.name) - Number(b.name))
      .map((row) => ({ ...row, name: decadeName(Number(row.name)) }));

    return {
      owned,
      artists: new Set(owned.map((r) => r.artist)).size,
      favorites: owned.filter((r) => r.favorite).length,
      wishes: data.filter((r) => r.status === "wishlist").length,
      decades,
      genres: top(count(owned, (r) => r.genres)),
      topArtists: top(count(owned, (r) => r.artist)).filter((r) => r.value > 1),
      grades: GRADES.map((g) => ({ name: `${g.value} (${g.label})`, value: owned.filter((r) => r.mediaGrade === g.value).length })).filter(
        (r) => r.value > 0,
      ),
    };
  }, [data]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="display page-title">Números</h1>
          <p className="page-sub">Um retrato da sua coleção.</p>
        </div>
      </header>

      {ready && stats.owned.length === 0 ? (
        <div className="empty">
          <h2 className="display">Ainda não há o que contar.</h2>
          <p>Adicione alguns discos e aqui aparecem décadas, gêneros e os artistas que mais aparecem na estante.</p>
          <Link href="/adicionar" className="btn btn-primary">
            Adicionar disco
          </Link>
        </div>
      ) : (
        ready && (
          <>
            <div className="stat-row">
              <div className="stat">
                <strong>{stats.owned.length}</strong>
                <span>{stats.owned.length === 1 ? "disco" : "discos"}</span>
              </div>
              <div className="stat">
                <strong>{stats.artists}</strong>
                <span>{stats.artists === 1 ? "artista" : "artistas"}</span>
              </div>
              <div className="stat">
                <strong>{stats.favorites}</strong>
                <span>favoritos</span>
              </div>
              <div className="stat">
                <strong>{stats.wishes}</strong>
                <span>na lista de desejos</span>
              </div>
              <div className="stat">
                <strong>{decks.length}</strong>
                <span>toca-discos</span>
              </div>
            </div>

            <div className="stats-grid">
              <Bars title="Por década" rows={stats.decades} />
              <Bars title="Gêneros" rows={stats.genres} />
              {stats.topArtists.length > 0 && <Bars title="Artistas com mais discos" rows={stats.topArtists} />}
              {stats.grades.length > 0 && <Bars title="Estado dos vinis" rows={stats.grades} />}
            </div>
          </>
        )
      )}
    </div>
  );
}
