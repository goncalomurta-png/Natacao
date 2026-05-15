# Plano — Projeto Natação Rodrigo Murta

> **Estado:** Em iteração (Auditor↔Builder). Algumas decisões fechadas (ver §0).
> **Atleta:** Rodrigo Rodrigues Murta (n. 2014, Bombeiros de Ponta Delgada)
> **Objetivo:** Sistema local (alojado em GitHub) para registar e visualizar a evolução desportiva por disciplina. **Token-efficient na operação diária** (construção/migração pode consumir mais).

---

## 0. Decisões fechadas

| # | Data | Decisão | Notas |
|---|------|---------|-------|
| D1 | 2026-05-01 | Projeto alojado no GitHub | Repo a confirmar (existe? público/privado?) |
| D2 | 2026-05-01 | Migrar **toda** a informação dos `Mds/` para `data/competitions.json` | Cronologicamente, com integridade UTF-8 |
| D3 | 2026-05-01 | Renomear `Mds/` → `legacy/` **após** migração validada | Evita confusão sobre fonte de verdade |
| D4 | 2026-05-01 | **Piscina SC25** (25m) — splits podem ocorrer em qualquer múltiplo de 25 | Modelo flexível: array de tempos por segmento |
| D5 | 2026-05-01 | **Ingestão híbrida:** PDFs descarregados de [anara.pt](https://anara.pt/categoria-calendario/competicoes/) → txt → JSON; SwimRankings.net para benchmarks | Distinguir "startlist" (tempos de inscrição) vs "results list" (oficiais) |
| D6 | 2026-05-01 | `data/derived/` no `.gitignore` | Regenerável; evita ruído de diff |
| D7 | 2026-05-01 | Validação de schema ON em `compute.py` | Enums fixos para disciplinas |
| D8 | 2026-05-01 (~~revogada 2026-05-02~~) | ~~Sem `render.py` — `index.html` faz `fetch()` direto aos JSON~~ | Substituída por D24 — `compute.py` escreve `viewer/data.js` para suportar abertura `file://` sem servidor |
| D9 | 2026-05-01 (rev. 2026-05-02) | Splits armazenados como **tempos incrementais por segmento** no campo `splits_s` | Revisão: a implementação seguiu incremental, não acumulado. Validação: `sum(splits_s) ≈ time_s ± 0.05s`. PDFs (que vêm em acumulado) são convertidos em `ingest.py` |
| D10 | 2026-05-01 | **Ciclo de vida:** Builder+Auditor durante construção; após estabilização, projecto passa a Simples | Marca o switch quando Fase 4 estiver concluída |
| D11 | 2026-05-01 | Repo GitHub **privado** já existe | URL a confirmar — não bloqueador desta fase |
| D12 | 2026-05-01 | Fonte de competições inclui **ANARA + outras federações regionais** (ex.: A Natação da Madeira) | Independente do site; o que importa é o PDF de resultados |
| D13 | 2026-05-01 | Scripts são **CLI normais** — corríveis manualmente OU pelo Claude via Bash | Sem framework de tasks; cada script tem `--help` |
| D14 | 2026-05-01 | **Mobile responsive obrigatório** (mobile-first, max-width centrado para desktop) | Inspiração no `surf-log` |
| D15 | 2026-05-01 | Dashboard com **tabs**: uma por estilo (Livre, Costas, Bruços, Mariposa, Estilos) + aba "Geral" | Reduz ruído visual; alinha com como o atleta pensa |
| D16 | 2026-05-01 | **Estética**: inspirada no `surf-log` (sand/charcoal, Barlow Condensed, sticky top-nav, sem ornamentação); cores acentuadas pela paleta do clube CAFBPD | Funcional pragmático, "quase B2B" |
| D17 | 2026-05-01 | **Sem narrativa longa** — gráficos + tabelas + métricas-chave | Os Mds antigos são referência só |
| D18 | 2026-05-01 | Audiência única: **só o Gonçalo** | Não há gestão de utilizadores nem partilha pública |
| D19 | 2026-05-01 | Tempos com asterisco/itálico nos Mds antigos (estimados/sem PDF oficial) marcam-se com `"estimated": true` no JSON | Aplica-se a tempos totais e a splits parciais |
| D20 | 2026-05-02 | **G5 promovido a V1** — gráfico multi-distância sobreposto, eixo Y = Δ % vs PB, eixo X = data. Permanente em cada aba estilo, abaixo do G1 | Responde "em que distâncias evoluí mais?". Variante B (% delta) escolhida por escala comparável entre 50/100/200 |
| D21 | 2026-05-02 | **Speed Reserve** entra como **coluna na tabela G2** (não gráfico novo) — só nas abas com distâncias ≥100m | Coluna mostra `split_inicial_da_distância / PB_da_distância_imediatamente_inferior` (ex: 1º split de 50 do 100m ÷ PB 50m). Mantém número de gráficos em 5 |
| D22 | 2026-05-02 | `.claude/commands/builder.md` escrito **model-agnostic** | Próxima sessão de Builder será **teste pontual com a vibe da Mistral** (não permanente — regresso ao Sonnet depois). Linguagem neutra evita re-escrita; vale como princípio geral |
| D23 | 2026-05-02 | **Estilo visual: Strava-like** (big-number cards + sparklines + tabela enxuta com setas/badges) | Substitui a aproximação Chart.js genérica. Foco em "vejo num minuto" passivo. Cores: verde melhora, vermelho piora, ⭐ PB. Sparklines em SVG inline (sem Chart.js para mini-gráficos) |
| D24 | 2026-05-02 | **D8 revogada** — `compute.py` agora também escreve `viewer/data.js` com `window.SWIM_DATA` para abrir via `file://` sem servidor | Razão: `fetch()` não funciona em `file://` por CORS. Trade-off: perde-se desacoplamento total entre dados e viewer (precisa correr `compute.py` antes de refresh), mas ganha-se uso "duplo-clique" |
| D25 | 2026-05-15 | **Separador "Hoje"** — `viewer/hoje.js` contém startlist da competição activa; substituído a cada prova nova. Tab renderiza cards por prova (estilo, hora, série/raia, entrada, Δ vs PB) com botão "Registar resultado" que abre `ingest.html` com query params pré-preenchidos (data, nome, local, técnica, distância) | Extracção via `pdftotext -layout`. `ingest.html` lê `URLSearchParams` e preenche os campos no `DOMContentLoaded`. |

---

## 1. Princípios de design

1. **Separação de camadas estrita.** Dados, cálculo e apresentação vivem em ficheiros distintos. Claude lê apenas o estritamente necessário.
2. **Eficiência em tokens.** Os ficheiros que Claude consulta de forma recorrente (dados estruturados, métricas derivadas) devem ser compactos e auto-explicativos. HTML, JS e CSS são "write-once" — só são re-lidos quando há mudança visual.
3. **Fonte única de verdade.** Todas as competições registadas num único ficheiro estruturado. Tudo o resto é derivado.
4. **Reprodutibilidade.** As métricas e análises são geradas por scripts determinísticos a partir dos dados brutos. Nunca calculados ad-hoc no chat.
5. **Realismo nas análises.** Sem inflação de classificações ("elite", "líder") — usar nível regional/nacional com referência factual (SwimRankings, FPN, USA Swimming).
6. **Integridade cronológica.** Resultados sempre inseridos por ordem cronológica.
7. **Codificação UTF-8 limpa.** Ficheiros em UTF-8 sem BOM. Caracteres portugueses preservados.

---

## 2. Arquitetura proposta

```
Natacao/
├── data/                          # Camada de dados (Claude lê isto)
│   ├── athlete.json              # Perfil do atleta (estático)
│   ├── competitions.json         # Fonte única de verdade — todas as competições
│   ├── benchmarks.json           # Standards (USA Swimming, FPN, regionais)
│   └── derived/                  # Métricas computadas (regeneradas via script)
│       ├── personal_bests.json   # Melhores tempos por disciplina/distância
│       ├── progression.json      # Evolução temporal por prova
│       └── splits_analysis.json  # Análise de parciais (descelerações, etc.)
│
├── scripts/                       # Camada de cálculo (Claude lê quando muda lógica)
│   ├── ingest.py                 # Adiciona competição (PDF/manual) → competitions.json
│   ├── compute.py                # Regenera tudo em data/derived/
│   └── render.py                 # Gera viewer/data.js a partir dos JSON
│
├── viewer/                        # Camada de apresentação (Claude raramente lê)
│   ├── index.html                # Dashboard com gráficos
│   ├── charts.js                 # Lógica de gráficos (Chart.js ou similar)
│   ├── data.js                   # Snapshot de dados injetado (gerado)
│   └── styles.css
│
├── archive/                       # PDFs originais das competições
│   └── YYYY-MM-DD_<nome>.pdf
│
├── Mds/                           # Documentos antigos (referência só de leitura)
│
├── reports/                       # Análises pontuais geradas (markdown)
│
├── plan.md                        # Este ficheiro
├── comments.md                    # Comunicação Auditor ↔ Builder
└── CLAUDE.md                      # Instruções persistentes para Claude
```

---

## 3. Modelo de dados (proposta)

### `data/athlete.json`
```json
{
  "name": "Rodrigo Rodrigues Murta",
  "birth_year": 2014,
  "club": "Bombeiros de Ponta Delgada",
  "federation": "FPN",
  "region": "Açores"
}
```

### `data/competitions.json`
Lista ordenada cronologicamente. Cada competição tem identificação + lista de provas. Cada prova tem tempo total, parciais (se conhecidas), classificação, e contexto.

```json
[
  {
    "id": "2026-02-28_torregri_smg",
    "date": "2026-02-28",
    "name": "Torregri 2_26_SMG",
    "location": "Ponta Delgada",
    "pool": "SC25",
    "events": [
      {
        "discipline": "estilos",
        "distance_m": 200,
        "time_s": 230.82,
        "splits_s": [],
        "rank": 1,
        "notes": ""
      },
      {
        "discipline": "livre",
        "distance_m": 100,
        "time_s": 90.14,
        "splits_s": [43.04, 47.10],
        "rank": 2,
        "estimated": false,
        "is_relay_leg": false,
        "notes": "Tempo de inscrição 1:27.37 era erro — 1:30.14 é o oficial."
      }
    ]
  }
]
```

**Notas de design:**
- Tempos em segundos (float) — facilita cálculos. Conversão para `mm:ss.cc` é responsabilidade da camada de apresentação.
- `pool`: `SC25` (curta) ou `LC50` (longa). Standards diferem.
- `splits_s` opcional — array de **tempos incrementais por segmento** (D9). Múltiplos de 25m. Validação: `sum(splits_s) ≈ time_s ± 0.05s`. Vazio `[]` quando não há parciais disponíveis.
- `rank` — campo simples (int|null). Origem (geral vs. categoria) regista-se em `notes` quando relevante.
- `estimated` (default `false`) — `true` quando o tempo não tem PDF oficial e foi inferido de Mds antigos (D19).
- `is_relay_leg` (default `false`) — marca parciais de estafeta inseridas como evento isolado para análise.
- `notes` — observações livres por prova (contexto, anomalias, correcções).

### `data/benchmarks.json`
Standards externos para contextualização (USA Swimming AAAA/AAA/.../B, recordes nacionais por idade, etc.).

### `data/derived/personal_bests.json`
```json
{
  "livre": {
    "50": { "time_s": 38.26, "date": "2026-03-14", "competition_id": "..." },
    "100": { "time_s": 88.06, "date": "2025-10-25", "competition_id": "..." }
  }
}
```

### `data/derived/progression.json`
Série temporal por (disciplina, distância) — todas as performances ordenadas, prontas a passar para gráficos.

---

## 4. Camada de cálculo

**`scripts/ingest.py`** — Acrescenta competição a `competitions.json`. Aceita JSON já formatado (manual) ou tenta extrair de PDF (futuro).

**`scripts/compute.py`** — Regenera tudo em `data/derived/` a partir de `competitions.json`. Idempotente. Output determinístico.

**`scripts/render.py`** — Lê `data/` e `data/derived/`, escreve `viewer/data.js` (um único `window.SWIM_DATA = {...}`).

**Linguagem:** Python (stdlib apenas — sem dependências externas para minimizar atrito).

---

## 5. Camada de visualização

**`viewer/index.html`** — Página única, abre direto no browser (`file://`).

Componentes do dashboard:
- **Resumo:** perfil + recordes pessoais.
- **Gráfico de progressão por disciplina.** Tempos no eixo Y (invertido — menos é melhor), datas no eixo X. Toggle por distância.
- **Tabela de competições recente.**
- **Comparação com benchmarks.** Linhas horizontais USA Swimming AAAA/AAA/AA/A/BB/B + standards FPN.
- **Análise de parciais.** Para provas com splits — desaceleração entre primeira e segunda metade.

**Stack:** HTML + Chart.js (CDN) + JS vanilla. Sem build step. Sem framework.

**Princípio:** se a visualização precisar de mudar, edita-se o HTML/JS uma vez. Os dados refrescam-se via `compute.py` + `render.py` — sem tocar no HTML.

---

## 6. Workflow operacional

**Ingestão de nova competição:**
1. Utilizador coloca PDF em `archive/` e fornece os dados (manual ou estruturados).
2. Claude (Builder) atualiza `competitions.json` por ordem cronológica.
3. Corre `scripts/compute.py` → regenera derived.
4. Corre `scripts/render.py` → atualiza `viewer/data.js`.
5. Utilizador abre `viewer/index.html` no browser.

**Análise pontual:**
- Pedido específico (e.g., "como evoluiu nos 100m Bruços?") → Claude lê `data/derived/progression.json` apenas (~poucos KB), não os ficheiros em `Mds/`.

---

## 7. Tarefas de construção (ordem proposta)

### Fase 1 — Fundação
- [x] Definir formato definitivo de `competitions.json`. ⚠️ Splits: acumulados vs incrementais — ver comments.md.
- [x] Criar `data/athlete.json`.
- [x] Migrar dados históricos dos `Mds/` para `competitions.json` (16 competições, Out 2023 – Mar 2026).
- [ ] Validar integridade cronológica e codificação UTF-8 (executar `compute.py` + inspecionar saídas).

### Fase 2 — Cálculo
- [x] Implementar `scripts/compute.py` (PBs, progressão, splits).
- [x] Implementar `scripts/ingest.py` (entrada manual estruturada).
- [ ] Definir `data/benchmarks.json` (USA Swimming + FPN).

### Fase 3 — Visualização
- [ ] Esqueleto `viewer/index.html` + Chart.js.
- [ ] **G1** — Gráfico de progressão absoluta por disciplina.
- [ ] **G5** — Gráfico de progressão relativa multi-distância (Δ % vs PB) — D20.
- [ ] **G2** — Tabela cronológica com Δ vs PB, Δ vs anterior e Speed Reserve % — D21.
- [ ] **G3/G4** — Análise de parciais (desaceleração e pacing por quarto).
- [ ] Tabela de recordes pessoais (aba Geral).
- [ ] Linhas de benchmark sobre G1.
- [ ] Estender `compute.py` com `delta_pct_vs_pb` e `speed_reserve_pct`.

### Fase 4 — Polimento
- [ ] CLAUDE.md com instruções operacionais (workflow, princípios).
- [ ] README curto.
- [ ] Testar fluxo completo com uma competição nova.

---

## 8. Questões em aberto

### A. Confirmações práticas (curtas)
- **Q1.** Repo GitHub: já existe? URL? Privado ou público?
- **Q2.** Todas as provas do Rodrigo são SC25? (Assumido em D4.)
- **Q3.** Link directo para a página do Rodrigo na anara.pt e SwimRankings (poupa busca).
- **Q4.** Parciais estimadas (não oficiais): manter campo `estimated: true`?
- **Q5.** `rank` distingue género vs. categoria de idade?

### B. Descoberta de uso (definem UI/UX)
- **Q6.** **Uso típico:** quando o projeto estiver pronto, descreve "abro X, vejo Y, faço Z" num momento real.
- **Q7.** **Quem usa:** só Gonçalo? Rodrigo também? Treinador? Vais querer partilhar?
- **Q8.** **Perguntas a responder rapidamente:** lista 5–10 perguntas concretas que queres conseguir responder em segundos (ex.: "como evoluiu nos 100m Livres?", "gap para standard A nos 400m?").
- **Q9.** **Frequência de novos dados:** quantas competições por mês/trimestre? Duração da época?
- **Q10.** **Dados não-competitivos:** treinos com tempos, marcos técnicos qualitativos ("corrigiu mergulho")? Ou só competições oficiais?
- **Q11.** **Gráficos específicos:** linha temporal, comparação com benchmarks, análise de parciais, heatmap, outros?
- **Q12.** **Mobile:** relevante ou só desktop?
- **Q13.** **Estética:** cores do clube, foto, design? Ou funcional puro?
- **Q14.** **Análises narrativas (markdown longo) atuais:** tens saudades delas ou gráficos+tabelas chegam?
- **Q15.** **Quem corre scripts:** Gonçalo manual / Claude via Bash / automático?
- **Q16.** **Outras integrações:** SwimRankings export, Excel existente, Notion, calendário?

### C. Defaults Auditor (se não for objetado)
- Linguagem de scripts: **Python stdlib only** (sem deps externas se possível). Se PDF parsing exigir, `pdftotext` (poppler) > `pdfplumber`/`PyMuPDF` para evitar deps Python.
- Gráficos: **Chart.js via CDN**.
- Mobile: dashboard responsivo básico, mas otimizado para desktop.

---

## 10. Dashboard — IA (information architecture) e gráficos

### Estrutura de tabs (D15)

```
[ Hoje ] [ Geral ] [ Livre ] [ Costas ] [ Bruços ] [ Mariposa ] [ Estilos ]
```

**Aba "Geral"** — visão de cima:
1. **Card-resumo do atleta** (foto opcional, nome, idade actual, clube, época em curso).
2. **Tabela de recordes pessoais** (uma linha por disciplina×distância: PB, data, dias desde PB).
3. **Linha do tempo das competições** (lista compacta cronológica, descendente: data, nome, número de provas, link para PDF se disponível).
4. **Gráfico "Heatmap de actividade"** (mês × ano, intensidade = nº de provas) — opcional, V2.

**Abas por estilo** (uma estrutura repetida):
1. **Mini-resumo** — PBs por distância (50, 100, 200, 400 conforme aplicável) com data.
2. **G1 — Gráfico de progressão absoluta** (linha) — tempo (Y, invertido) × data (X), uma série por distância. Toggle on/off por distância.
3. **G5 — Gráfico de progressão relativa multi-distância** (linha) — Δ % vs PB (Y) × data (X), uma série por distância. Permite comparar evolução entre 50/100/200 na mesma escala.
4. **G2 — Tabela de evolução cronológica** — uma linha por prova, com Δ vs. PB, Δ vs. anterior e (em distâncias ≥100m) **Speed Reserve %**.
5. **G3/G4 — Gráficos de splits / desaceleração** (apenas distâncias com parciais) — barras de desaceleração 1ª↔2ª metade, ou pacing por quartos.

### Gráficos propostos (Q11) — 5 no total, distribuídos pelas tabs (não 5 por tab)

Numa aba estilo típica vês **1 gráfico principal + 1 tabela + 1 gráfico de splits** (quando aplicável). Sem sobreposição.

| # | Tipo | Onde aparece | Quando aparece | Pergunta que responde |
|---|------|--------------|---------------|----------------------|
| G1 | Linha temporal absoluta (tempo × data) | Cada aba estilo | Sempre | "Estou a melhorar nos 100m Livres?" |
| G5 | Linha temporal multi-distância sobreposta (Δ % vs PB) | Cada aba estilo | Sempre (V1, decisão D20) | "Em que distâncias evoluí mais?" |
| G2 | Tabela cronológica com Δ vs PB, Δ vs anterior, Speed Reserve % | Cada aba estilo | Sempre (Speed Reserve só ≥100m, decisão D21) | "Quanto melhorei? E saio bem na primeira metade?" |
| G3 | Barras de desaceleração 1ª/2ª metade | Aba estilo | Só distâncias ≥ 100m com splits | "Estou a aguentar a segunda metade?" |
| G4 | Barras de pacing por quarto (parciais 50m) | Aba estilo | Só distâncias ≥ 200m com splits | "Onde colapso no 200m/400m?" |

**Nota sobre Speed Reserve (D21):** rácio entre o split inicial de uma distância e o PB da distância imediatamente inferior. Exemplos:
- 100m → primeiro split de 50m ÷ PB de 50m. Valores ~1.05–1.10 = ritmo gerido; ~1.00 = saiu a sprint (vai fundir); >1.15 = saiu lento, sobra-lhe gás.
- 200m → primeiros 100m ÷ PB de 100m. Mesma lógica.
- Coluna fica vazia se faltar PB de referência ou splits.

**Geral** não tem gráficos — só tabelas (PBs por disciplina/distância) e lista cronológica de competições. Se mais tarde fizer falta, acrescenta-se um gráfico-resumo de todos os PBs.

**Recusados nesta fase** (V2 ou nunca): heatmap, radar/spider chart, comparações com outros atletas (não há dados), animações.

**Implicações de cálculo (para `compute.py`):**
- `data/derived/progression.json` precisa de campo `delta_pct_vs_pb` por entrada (para G5).
- `data/derived/splits_analysis.json` precisa de campo `speed_reserve_pct` quando aplicável (split inicial ÷ PB da distância inferior). Cálculo idempotente, ignora entradas sem dados suficientes.

### Filtros globais (V1 mínima)

- Toggle "incluir estafetas" (default off) — separa parciais de estafeta dos eventos individuais.
- Toggle "esconder estimados" (default off) — esconde linhas com `estimated: true`.

---

## 11. Estética e implementação visual

**Referência:** `surf-log/surf_log.html` (estrutura sticky-nav + tabs + max-width 760px) e `cafbpd.pt` (paleta do clube — Auditor inspeciona quando o Builder chegar à camada visual).

**Paleta provisória** (Builder pode ajustar):
- Background: sand `#f5f2ed`
- Header/nav: charcoal `#2c2c2c`
- Acentos: definir pela paleta CAFBPD (provável azul/vermelho)
- Tempos / PBs: gold `#d4a017`

**Fontes:** Barlow Condensed (títulos/tabelas) + Barlow (corpo) — via Google Fonts CDN.

**Stack:** HTML + Chart.js (CDN) + JS vanilla. Sem build step. Sem framework. Mobile-first.

**Layout:** sticky top-nav com tabs (uma por estilo + Geral); conteúdo da aba activa em max-width centrado; cards/tabelas empilhadas em mobile, em grelha 2-col em desktop ≥ 720px.

---

## 12. Backlog de provas a integrar (descoberto)

| Data | Nome | Fonte | Ficheiro |
|------|------|-------|----------|
| 30 Abr 2026 | CNF FC (Madeira) | anatacaodamadeira.pt | `ResultList_10.pdf`, `ResultList_6.pdf` |

**Acção do Builder:** baixar para `archive/2026-04-30_cnf-fc-madeira_*.pdf` e extrair eventos do Rodrigo (filtrar por nome).

---

## 13. Pontos a NÃO fazer

- Não duplicar análise nos `Mds/` antigos — passam a ser arquivo de referência só.
- Não gerar markdown narrativo em loop (a "narrativa" vem do gráfico, não de prosa).
- Não inflacionar classificações ("elite") — usar dados objetivos.
- Não introduzir frameworks pesados (React, Vue, build steps) para algo que abre por `file://`.
