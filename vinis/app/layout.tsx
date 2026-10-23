import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Newsreader } from "next/font/google";
import Nav from "@/components/Nav";
import ServiceWorker from "@/components/ServiceWorker";
import { themeScript } from "@/components/ThemeToggle";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  axes: ["wdth", "opsz"],
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Vinis", template: "%s · Vinis" },
  description: "Sua coleção de discos de vinil: fotografe a capa, organize a estante e ouça no Spotify.",
  applicationName: "Vinis",
  appleWebApp: { capable: true, title: "Vinis", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#1a1512",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="sala" className={`${bricolage.variable} ${newsreader.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Nav />
        <main>{children}</main>
        <ServiceWorker />
      </body>
    </html>
  );
}
