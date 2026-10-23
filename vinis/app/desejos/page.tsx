"use client";

import Link from "next/link";
import { IconPlus } from "@/components/Icons";
import Shelf from "@/components/Shelf";
import { useRecords } from "@/lib/db";

export default function WishlistPage() {
  const { data, ready } = useRecords();
  const records = data.filter((r) => r.status === "wishlist");

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="display page-title">Desejos</h1>
          <p className="page-sub">Discos que você quer ter. Quando comprar, mova para a coleção.</p>
        </div>
        {records.length > 0 && (
          <Link href="/adicionar?para=desejos" className="btn">
            <IconPlus size={18} /> Adicionar desejo
          </Link>
        )}
      </header>

      {ready && (
        <Shelf
          records={records}
          searchLabel="Procurar nos desejos"
          emptyState={
            <div className="empty">
              <h2 className="display">Nenhum desejo ainda.</h2>
              <p>Viu um disco numa loja ou na casa de alguém? Fotografe a capa e guarde aqui para lembrar.</p>
              <div className="empty-actions">
                <Link href="/adicionar?para=desejos" className="btn btn-primary">
                  <IconPlus size={18} /> Adicionar desejo
                </Link>
              </div>
            </div>
          }
        />
      )}
    </div>
  );
}
