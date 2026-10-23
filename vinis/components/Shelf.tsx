"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { saveRecords, updateRecord } from "@/lib/db";
import { arrangeShelf, matchesQuery } from "@/lib/sort";
import type { VinylRecord } from "@/lib/types";
import Cover from "./Cover";
import { IconMove, IconSearch, IconStar } from "./Icons";

export async function toggleFavorite(record: VinylRecord, all: VinylRecord[]) {
  if (record.favorite) {
    await updateRecord(record.id, { favorite: false });
  } else {
    // Novo favorito entra no fim da fila de favoritos.
    const maxOrder = Math.max(0, ...all.filter((r) => r.favorite).map((r) => r.favOrder));
    await updateRecord(record.id, { favorite: true, favOrder: maxOrder + 1 });
  }
}

function Tile({ record, all }: { record: VinylRecord; all: VinylRecord[] }) {
  return (
    <div className="tile">
      <Link href={`/disco/${record.id}`} className="tile" aria-label={`${record.title}, ${record.artist}`}>
        <div className="tile-cover">
          <Cover record={record} />
        </div>
        <div className="tile-meta">
          <span className="tile-title">{record.title}</span>
          <span className="tile-artist">
            {record.artist}
            {record.year ? `, ${record.year}` : ""}
          </span>
        </div>
      </Link>
      <button
        type="button"
        className="star-btn"
        aria-pressed={record.favorite}
        aria-label={record.favorite ? `Tirar ${record.title} dos favoritos` : `Colocar ${record.title} nos favoritos`}
        onClick={() => toggleFavorite(record, all)}
      >
        <IconStar size={20} filled={record.favorite} />
      </button>
    </div>
  );
}

function SortableTile({ record, index }: { record: VinylRecord; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: record.id });
  return (
    <div
      ref={setNodeRef}
      className="tile sortable-tile"
      data-dragging={isDragging}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-label={`${index + 1}º: ${record.title}, ${record.artist}. Arraste para mudar a posição.`}
    >
      <span className="sort-handle-badge" aria-hidden="true">
        {index + 1}
      </span>
      <div className="tile-cover">
        <Cover record={record} />
      </div>
      <div className="tile-meta">
        <span className="tile-title">{record.title}</span>
        <span className="tile-artist">{record.artist}</span>
      </div>
    </div>
  );
}

function FavoritesSorter({ favorites, onDone }: { favorites: VinylRecord[]; onDone: () => void }) {
  const [items, setItems] = useState(favorites);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((r) => r.id === active.id);
    const to = items.findIndex((r) => r.id === over.id);
    const next = arrayMove(items, from, to);
    setItems(next);
    void saveRecords(next.map((r, i) => ({ ...r, favOrder: i + 1 })));
  };

  return (
    <>
      <p className="muted" style={{ margin: "0 0 18px" }}>
        Arraste as capas para escolher qual aparece primeiro.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((r) => r.id)} strategy={rectSortingStrategy}>
          <div className="shelf-grid">
            {items.map((r, i) => (
              <SortableTile key={r.id} record={r} index={i} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div style={{ marginTop: 24 }}>
        <button type="button" className="btn btn-primary" onClick={onDone}>
          Pronto
        </button>
      </div>
    </>
  );
}

type Props = {
  records: VinylRecord[];
  emptyState: React.ReactNode;
  searchLabel: string;
};

export default function Shelf({ records, emptyState, searchLabel }: Props) {
  const [query, setQuery] = useState("");
  const [sorting, setSorting] = useState(false);

  const visible = useMemo(() => records.filter((r) => matchesQuery(r, query)), [records, query]);
  const shelf = useMemo(() => arrangeShelf(visible), [visible]);

  if (!records.length) return <>{emptyState}</>;

  if (sorting) {
    return (
      <section className="shelf">
        <div className="divider divider-fav">
          <span className="divider-tab">
            <IconStar size={16} filled /> Favoritos
          </span>
        </div>
        <FavoritesSorter favorites={arrangeShelf(records).favorites} onDone={() => setSorting(false)} />
      </section>
    );
  }

  const letters = shelf.sections.map((s) => s.letter);

  return (
    <>
      <div className="toolbar">
        <label className="search-field">
          <span className="visually-hidden">{searchLabel}</span>
          <IconSearch size={18} />
          <input
            className="field"
            type="search"
            placeholder="Artista, álbum, gênero, ano"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {shelf.favorites.length > 1 && !query && (
          <button type="button" className="btn btn-ghost" onClick={() => setSorting(true)}>
            <IconMove size={18} /> Ordenar favoritos
          </button>
        )}
      </div>

      {letters.length > 4 && (
        <nav className="letter-strip" aria-label="Pular para a letra">
          {letters.map((l) => (
            <a key={l} href={`#letra-${l}`}>
              {l}
            </a>
          ))}
        </nav>
      )}

      {!visible.length && (
        <p className="muted" style={{ marginTop: 32 }}>
          Nada encontrado para “{query}”. Tente outro nome ou{" "}
          <Link href={`/adicionar?q=${encodeURIComponent(query)}`} style={{ textDecoration: "underline" }}>
            busque no Discogs
          </Link>
          .
        </p>
      )}

      <div className="shelf">
        {shelf.favorites.length > 0 && (
          <section aria-labelledby="sec-fav">
            <div className="divider divider-fav">
              <span className="divider-tab" id="sec-fav">
                <IconStar size={16} filled /> Favoritos
              </span>
              <span className="divider-count">{shelf.favorites.length}</span>
            </div>
            <div className="shelf-grid">
              {shelf.favorites.map((r) => (
                <Tile key={r.id} record={r} all={records} />
              ))}
            </div>
          </section>
        )}

        {shelf.sections.map((section) => (
          <section key={section.letter} aria-label={`Letra ${section.letter}`}>
            <div className="divider" id={`letra-${section.letter}`}>
              <span className="divider-tab">{section.letter}</span>
              <span className="divider-count">{section.records.length}</span>
            </div>
            <div className="shelf-grid">
              {section.records.map((r) => (
                <Tile key={r.id} record={r} all={records} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {letters.length > 4 && (
        <nav className="letter-rail" aria-label="Pular para a letra">
          {letters.map((l) => (
            <a key={l} href={`#letra-${l}`}>
              {l}
            </a>
          ))}
        </nav>
      )}
    </>
  );
}
