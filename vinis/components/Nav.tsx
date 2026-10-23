"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconChart, IconDeck, IconDisc, IconGear, IconHeart, IconPlus } from "./Icons";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Coleção", icon: IconDisc },
  { href: "/desejos", label: "Desejos", icon: IconHeart },
  { href: "/toca-discos", label: "Toca-discos", icon: IconDeck },
  { href: "/estatisticas", label: "Números", icon: IconChart },
];

export default function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/disco") : pathname.startsWith(href);

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="wordmark" aria-label="Vinis, ir para a coleção">
            <span className="wordmark-disc" aria-hidden="true" />
            Vinis
          </Link>
          <nav className="nav-links" aria-label="Principal">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} aria-current={isActive(l.href) ? "page" : undefined}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="nav-actions">
            <ThemeToggle compact />
            <Link href="/ajustes" className="icon-btn" aria-label="Ajustes e backup">
              <IconGear />
            </Link>
            <Link href="/adicionar" className="btn btn-primary">
              <IconPlus size={18} />
              Adicionar disco
            </Link>
          </div>
        </div>
      </header>

      <nav className="tabbar" aria-label="Principal">
        {LINKS.slice(0, 2).map((l) => (
          <Link key={l.href} href={l.href} aria-current={isActive(l.href) ? "page" : undefined}>
            <l.icon size={22} />
            <span>{l.label}</span>
          </Link>
        ))}
        <Link href="/adicionar" className="tab-add" aria-current={pathname === "/adicionar" ? "page" : undefined}>
          <span>
            <IconPlus size={24} />
          </span>
          <span>Adicionar</span>
        </Link>
        {LINKS.slice(2).map((l) => (
          <Link key={l.href} href={l.href} aria-current={isActive(l.href) ? "page" : undefined}>
            <l.icon size={22} />
            <span>{l.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
