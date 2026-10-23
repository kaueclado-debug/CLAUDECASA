# Vinis

Catálogo pessoal de discos de vinil. Next.js, feito para a Vercel.

- **Fotografe a capa** e a IA reconhece o disco, que é buscado no Discogs com faixas, ano, gravadora e capa.
- **Código de barras** pela câmera (ou digitado) para achar a edição exata.
- **Busca** por artista ou álbum.
- **Estante** com as capas em ordem alfabética por artista (ignorando "The"), separadas por divisórias A–Z. Os **favoritos** ficam no topo, na ordem que você escolher arrastando.
- **Página do disco** com faixas por lado (A/B), a história do disco tirada da Wikipedia em português (ou em inglês, quando não houver em português), um link direto para o álbum no **Spotify** e o player embutido.
- **Meu exemplar**: estado do vinil e da capa (Mint a Poor), notas e foto própria.
- **Lista de desejos**, **toca-discos** (marca, modelo e foto), **números** da coleção.
- **Dois temas**: *Sala* (escuro) e *Galeria* (claro).
- **Instala no celular** (PWA).

Os dados ficam no próprio aparelho (IndexedDB). Use **Ajustes → Baixar backup** de vez em quando. O backup também serve para passar a coleção para outro aparelho. O login com Supabase pode vir depois: toda a leitura e escrita passa por `lib/db.ts`, então a troca fica concentrada nesse arquivo.

## Publicar na Vercel

1. Em [vercel.com/new](https://vercel.com/new), importe este repositório.
2. Em **Root Directory**, escolha `vinis`. O framework é detectado como Next.js.
3. Em **Environment Variables**, adicione as chaves abaixo e clique em **Deploy**.

| Variável | Para quê | Onde conseguir |
|---|---|---|
| `DISCOGS_TOKEN` | Busca, faixas, capas (obrigatória) | [discogs.com/settings/developers](https://www.discogs.com/settings/developers) → *Generate new token* |
| `ANTHROPIC_API_KEY` | Reconhecer o disco pela foto | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| `SPOTIFY_CLIENT_ID` e `SPOTIFY_CLIENT_SECRET` | Link exato do álbum no Spotify | [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) → *Create app*, marque *Web API*. A *Redirect URI* pode ser `https://localhost` (não é usada) |

Sem a chave do Spotify, o app abre a busca do Spotify no lugar do álbum. Sem a da Anthropic, a foto não funciona, mas código de barras e busca continuam funcionando. A tela **Ajustes** mostra quais serviços estão configurados.

O reconhecimento usa o modelo `claude-opus-5-5` com esforço baixo e custa alguns centavos por foto. A rota também ativa o *fallback* automático da API (`fallbacks: "default"`): se o modelo recusar a imagem, outro modelo tenta antes de o app desistir.

## Rodar localmente

```bash
cd vinis
cp .env.example .env.local   # preencha as chaves
npm install
npm run dev
```

## Estrutura

```
app/
  page.tsx              Coleção (estante)
  desejos/              Lista de desejos
  adicionar/            Foto, código de barras e busca
  disco/[id]/           Página do disco
  toca-discos/          Toca-discos
  estatisticas/         Números
  ajustes/              Tema, backup, status das chaves
  api/identify          Foto → artista/álbum (Claude)
  api/discogs/*         Busca e detalhes no Discogs
  api/spotify           Link do álbum no Spotify
  api/wiki              História na Wikipedia
  api/turntable-photo   Foto de referência no Wikimedia Commons
lib/db.ts               Armazenamento local (IndexedDB)
```
