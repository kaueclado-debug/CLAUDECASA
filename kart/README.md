# Turbo Kart Mania 🏁

Jogo de kart 3D no navegador para até **4 jogadores locais** (tela dividida) + bots, sempre com **12 pilotos** na pista.

## Como jogar

- **Offline:** abra `kart/index.html` com duplo-clique (Chrome, Edge ou Firefox).
- **Servidor local (opcional):** `python3 -m http.server` dentro da pasta `kart/` e acesse `http://localhost:8000`.
- **Online:** depois do deploy no Vercel, acesse `/kart/`.

## Conteúdo

- **5 pistas:** Vale Cogumelo, Dunas do Sol, Pico Gelado (gelo escorregadio), Neon Noturno (oito com viaduto) e Praia Coral.
- **3 dificuldades:** Fácil (50cc), Médio (100cc) e Difícil (150cc). Mudam a velocidade, a habilidade dos bots, o drift deles e a frequência com que usam poderes.
- **Modos:** Corrida única ou Grande Prêmio (5 corridas com pontuação).
- **9 poderes:** Turbo, Turbo Triplo, Casco Verde, Casco Vermelho teleguiado, Banana, Estrela, Raio, Bomba e Tinta.
- Drift com mini-turbo (azul → laranja → roxo), largada turbo, faixas de aceleração e vibração nos controles.

## Controles

Controles **Xbox** e **PS5 (DualSense)** por Bluetooth ou USB são detectados automaticamente (aperte qualquer botão se não aparecer — o navegador só libera o controle depois do primeiro toque).

| Ação | Xbox | PS5 | Teclado A + Mouse | Teclado B |
|---|---|---|---|---|
| Acelerar | A / RT | ✕ / R2 | W / botão esquerdo | ↑ |
| Frear / ré | B / LT | ○ / L2 | S | ↓ |
| Virar | Analógico / D-pad | Analógico / D-pad | A / D ou mover o mouse | ← / → |
| Pular / Drift | RB | R1 | Espaço / Shift / botão do meio | Shift direito ou . |
| Poder | LB / X | L1 / □ | E / Q / botão direito | Enter / Ctrl direito |
| Olhar para trás | Y | △ | R | , |
| Pausa | Menu | Options | Esc / P | Esc |

Na tela "Quem vai correr?", cada jogador entra apertando confirmar no próprio dispositivo (A/✕, Espaço ou Enter).
