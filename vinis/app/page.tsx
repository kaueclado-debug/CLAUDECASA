"use client";

import Link from "next/link";
import { IconCamera, IconSearch } from "@/components/Icons";
import Shelf from "@/components/Shelf";
import { useRecords } from "@/lib/db";

export default function CollectionPage() {
  const { data, ready } = useRecords();
  const records = data.filter((r) => r.status === "collection");

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="display page-title">Coleção</h1>
          {ready && records.length > 0 && (
            <p className="page-sub">
              {records.length} {records.length === 1 ? "disco" : "discos"}
            </p>
          )}
        </div>
      </header>

      {ready && (
        <Shelf
          records={records}
          searchLabel="Procurar na coleção"
          emptyState={
            <div className="empty">
              <h2 className="display">A estante está vazia.</h2>
              <p>Fotografe a capa de um disco e ele entra na coleção com faixas, história e link do Spotify.</p>
              <div className="empty-actions">
                <Link href="/adicionar" className="btn btn-primary">
                  <IconCamera size={18} /> Fotografar um disco
                </Link>
                <Link href="/adicionar?modo=buscar" className="btn">
                  <IconSearch size={18} /> Buscar pelo nome
                </Link>
              </div>
            </div>
          }
        />
      )}
    </div>
  );
}
