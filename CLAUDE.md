# CLAUDE.md — Projecto Natação Rodrigo Murta

> Instruções operacionais persistentes. Lê isto sempre ao arrancar uma sessão.

## O que é

Sistema local (alojado em GitHub privado) para registar e visualizar a evolução desportiva do **Rodrigo Rodrigues Murta** (n. 2014, Bombeiros de Ponta Delgada, Açores, federação FPN). Audiência única: o pai (Gonçalo). Sem partilha pública, sem multi-utilizador.

## Workflow Auditor ↔ Builder

Projecto opera em modo **Builder + Auditor** (ver `.claude/project-type` = `BUILDER_AUDITOR_PROJECT=true`). Em cada sessão começa-se por escolher papel.

| Papel | Lê | Escreve | Não escreve |
|---|---|---|---|
| **Auditor** | tudo | `plan.md`, `comments.md` | código (`scripts/`, `viewer/`) |
| **Builder** | `plan.md`, `comments.md`, `data/`, `scripts/` | código + `comments.md §🟡 Em revisão` e §🟢 Em aberto | `plan.md` (nunca toca) |

- Decisões fechadas → entrada nova em `plan.md §0` com novo D-número.
- Tasks/perguntas → bullets em `comments.md §🟢 Em aberto` (datados ISO).
- Entregas → bullets em `comments.md §🟡 Em revisão`.
- `comments.md` máx 200–300 linhas. Conteúdo morto vai para `plan.md` ou `📌 Resumo histórico`.

Slash commands em `.claude/commands/{auditor,builder}.md`. Builder é **model-agnostic** (default Sonnet; Mistral foi teste pontual e atingiu limite tokens free em iterações de fix-and-validate — Sonnet é a aposta segura).

## Estrutura do repo

```
data/                  # Fonte de verdade (Claude lê isto)
  athlete.json
  competitions.json    # Lista cronológica, 16 competições (Out 2023 – Mar 2026)
  benchmarks.json      # (a criar)
  derived/             # Regenerado por compute.py — no .gitignore
scripts/               # Python stdlib only
  ingest.py            # Adicionar competição
  compute.py           # Regenera derived/ + viewer/data.js
viewer/                # HTML + JS vanilla, sem build, sem framework
  index.html, charts.js, styles.css, data.js (gerado), ingest.html
  hoje.js              # Startlist da competição activa — substituir a cada prova nova
archive/               # PDFs originais
Mds/                   # Histórico antigo (referência só de leitura)
plan.md                # Auditor curate
comments.md            # Auditor ↔ Builder
.claude/commands/      # Slash commands
```

## Comandos importantes

```bash
# Regenerar derived/ + viewer/data.js (idempotente)
python3 scripts/compute.py

# Abrir viewer (sem servidor — duplo-clique também funciona)
open viewer/index.html
```

`compute.py` imprime avisos quando `0.05 < |sum(splits) − time_s| < time_s * 0.1` (cobertura suspeita; parciais legítimos com `sum < time_s * 0.5` são ignorados).

## Convenções de dados (inegociáveis)

- **Tempos em segundos (float)**, nunca strings `mm:ss.cc`. Conversão é responsabilidade da apresentação.
- **Splits incrementais** no campo `splits_s` (D9 revista). Validação: `sum(splits_s) ≈ time_s ± 0.05s`. PDFs vêm em acumulado — `ingest.py` converte na entrada.
- **`pool`**: `SC25` (curta) ou `LC50` (longa).
- **`estimated: true`** quando o tempo vem de Mds antigos sem PDF oficial.
- **`is_relay_leg: true`** marca parciais de estafeta inseridas como evento isolado.
- **Integridade cronológica**: `competitions.json` sempre ordenado por data ascendente. Nunca inserir fora de ordem.
- **UTF-8 sem BOM**, caracteres portugueses preservados (`bruços`, não `brucos`).

## Princípios de análise

- **pt-PT**, terso, pragmático.
- **Realismo factual** — sem inflação ("elite", "líder", etc.). Referências objectivas (SwimRankings, FPN, USA Swimming).
- **Sem narrativa longa** — gráficos, tabelas e métricas. Mds antigos são arquivo de referência só.

## Visual (D23 — Strava-like)

Cards big-number + sparklines SVG inline (sem Chart.js para mini-gráficos) + tabelas enxutas com setas ▲▼ e ⭐ para PBs. Paleta sand `#f5f2ed` / charcoal `#2c2c2c` / gold `#d4a017`. Fontes Barlow Condensed + Barlow via Google Fonts CDN. Mobile-first, max-width 760px centrado em desktop.

## Workflow "Hoje" (D25)

1. Extrair PDF da competição: `pdftotext -layout <ficheiro>.pdf <ficheiro>_layout.txt`
2. Localizar provas do Rodrigo no txt (`grep -n "MURTA"`)
3. Actualizar `viewer/hoje.js` com os dados da startlist
4. Abrir o separador **Hoje** no viewer — cards mostram estilo, hora, série/raia, entrada e Δ vs PB
5. Ao clicar "Registar resultado", `ingest.html` abre com data/nome/local/técnica/distância pré-preenchidos

## Pitfalls aprendidos

- **`file://` + `fetch()` falha por CORS.** D24 — `compute.py` baka `viewer/data.js` com `window.SWIM_DATA` para uso sem servidor.
- **Chart.js v4+ requer date adapter** se usares `type: 'time'`. URLs corretos:
  - `https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js`
  - `https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js`
- **Mismatch slugs HTML vs chaves JSON** — HTML usa `brucos`, dados têm `bruços`. Sempre mapear (ex: `TAB_TO_DISCIPLINE`).
- **Mistral free tier** chega para uma entrega inicial, falha em iterações de fix-and-validate. Reserva-o para tarefas de uma só rajada.

## Caveats em aberto (a ler em `comments.md §🟢`)

- **C2** — anomalia mariposa 100m, 2025-12-13: `time_s=125.98` vs `sum(splits)=125.24`, Δ=0.74s. Pedir confirmação ao Gonçalo.
- **C3** — Speed Reserve % compara contra PB actual, não contra PB à data da prova. Aceite para V1; tooltip a documentar.

## Ciclo de vida (D10)

Builder + Auditor durante construção. Quando Fase 4 (polimento) estiver concluída, projecto passa a **Simples** — escrever `SIMPLE_PROJECT=true` em `.claude/project-type`.

## Segurança

Antes de instalar/correr código externo (incluindo do Mistral, browser MCPs, etc.), correr `sb audit <path>` (SecurityBench). Hook `~/.claude/security_bench.py` aplica isto automaticamente em Read/Bash sobre código não-trusted.
