# Faturio — Reformulação visual do dashboard

Data: 2026-08-14
Status: Aprovado para planejamento de implementação

## 1. Motivação

O dashboard funciona (Plano 4 já entregue), mas o usuário avalia que a UI atual — shadcn/ui
com tokens de cor customizados, mas sem trabalho de acabamento em cima — passa a impressão de
"feito por IA": layout genérico, pouco polish (espaçamento, sombra, borda padrão do shadcn) e
uma paleta verde que não tem personalidade própria. Este spec cobre só a reformulação visual;
nenhuma funcionalidade nova.

Decisões de direção validadas com o usuário via mockups comparativos (companion visual da
skill de brainstorming, sessão registrada em `.superpowers/brainstorm/`): paleta índigo +
esmeralda, acabamento "soft" (cantos grandes, sombra suave), tipografia Plus Jakarta Sans,
animações sutis, sem dark mode nesta leva.

## 2. Escopo

**Dentro do escopo** — área autenticada e o que a sustenta:
- `app/dashboard/**` (layout, visão geral, produtos, estoque, vendas, metas, configurações)
- `app/dashboard/layout.tsx` (sidebar/topbar) e `components/dashboard/*`
- `components/ui/*` (primitivas shadcn: button, card, input, table, dialog, tabs,
  dropdown-menu, tooltip, progress, accordion, badge, alert, select) — são a base visual de
  tudo dentro do dashboard, então precisam mudar junto
- `components/produtos/*`, `components/estoque/*`, `components/vendas/*`, `components/metas/*`,
  `components/settings/*` — telas que consomem essas primitivas
- Tokens de cor em `app/globals.css` (bloco `:root`, light mode)

**Fora do escopo:**
- Landing page (`app/page.tsx`, `components/landing/*`), auth (`/login`, `/definir-senha`,
  `/esqueci-senha`, `/onboarding`), checkout e páginas de pagamento — mantêm o visual atual
  (verde) até uma leva futura
- Dark mode — bloco `@media (prefers-color-scheme: dark)` de `app/globals.css` fica como está
  (ainda existe e funciona, só não recebe os novos tokens índigo/esmeralda agora — ver seção 6)
- Qualquer mudança de comportamento/funcionalidade — é reformulação puramente visual

## 3. Paleta (light mode, `app/globals.css`)

Substitui os tokens atuais no bloco `:root` (mantém os mesmos nomes de variável, só troca
valores, para não quebrar nenhum consumidor):

| Token | Valor atual | Novo valor |
|---|---|---|
| `--background` | `#FAFAF9` | `#FAFAFC` |
| `--foreground` | `#1C1917` | `#1E1B4B` |
| `--card` | `#FFFFFF` | `#FFFFFF` (mantém) |
| `--card-foreground` | `#1C1917` | `#1E1B4B` |
| `--primary` | `#0E7C5D` | `#6366F1` |
| `--primary-hover` | `#095940` | `#4F46E5` |
| `--primary-light` | `#3FAE85` | `#A5B4FC` |
| `--primary-foreground` | `#FFFFFF` | `#FFFFFF` (mantém) |
| `--secondary` | `#F0EFED` | `#F1F0FB` |
| `--secondary-foreground` | `#1C1917` | `#1E1B4B` |
| `--muted` | `#F5F4F2` | `#F5F4FC` |
| `--muted-foreground` | `#6B6560` | `#64748B` |
| `--accent` | `#3FAE85` | `#10B981` |
| `--accent-foreground` | `#1C1917` | `#FFFFFF` |
| `--destructive` | `#DC2626` | `#DC2626` (mantém) |
| `--destructive-foreground` | `#FFFFFF` | `#FFFFFF` (mantém) |
| `--success` | `#16A34A` | `#10B981` (alinha com accent) |
| `--warning` | `#D97706` | `#D97706` (mantém) |
| `--info` | `#2563EB` | `#2563EB` (mantém — precisa diferir do primary índigo) |
| `--border` | `#E7E5E4` | `#E9E9F2` |
| `--input` | `#E7E5E4` | `#E9E9F2` |
| `--ring` | `#0E7C5D` | `#6366F1` |

Cores semânticas de negócio (lucro/prejuízo em produtos e vendas — verde/vermelho) continuam
usando `--success`/`--destructive` diretamente, não o `--primary`, então não ficam
"confundidas" com a cor de marca índigo.

## 4. Acabamento de componentes

Novos tokens de raio e sombra, adicionados ao bloco `:root` / `@theme inline`:

- `--radius-card: 16px` — usado em `Card` e containers de página
- `--radius-control: 10px` — usado em `Button`, `Input`, `Select`, `Badge`
- Sombra de card: `0 4px 16px rgb(99 102 241 / 0.08)`, aplicada como `shadow-sm`
  customizado (não sombra do Tailwind padrão, que é cinza neutra)
- Sombra de botão primário: `0 4px 12px rgb(99 102 241 / 0.20)`, só no `variant="default"`
- Borda: `1px solid var(--border)` em cards e inputs — mantém o traço fino já usado hoje, só
  muda a cor do token

Cada componente em `components/ui/*` é ajustado individualmente (radius + sombra), não uma
sobrescrita global via CSS — mantém o padrão shadcn de componente autocontido que o projeto já
segue.

## 5. Tipografia

Troca de Geist para **Plus Jakarta Sans** (fonte única, pesos 400–700), mas **só dentro do
dashboard** — a landing/auth continuam com Geist até entrarem no escopo de reformulação.

Como `app/layout.tsx` é o root layout (afeta toda a árvore), a fonte não pode trocar ali. A
implementação carrega `Plus_Jakarta_Sans` via `next/font/google` em `app/dashboard/layout.tsx`
como uma segunda variável CSS (ex.: `--font-dashboard`) aplicada na `className` do elemento
raiz desse layout; `components/ui/*` usados dentro do dashboard referenciam essa variável (ou
o `@theme` é redefinido dentro do escopo `.dashboard` via seletor CSS) — **verificar em
`node_modules/next/dist/docs/` a forma correta de compor fontes por layout aninhado no Next 16
antes de implementar**, por causa da regra do AGENTS.md sobre a versão não-padrão do Next.

## 6. Animação

Usa o `framer-motion` já instalado, nível "sutil":
- Transições de hover em cards/botões (150–250ms, opacity/transform, sem mudar layout)
- Estado de loading em botões async (já existe como padrão do projeto — mantém)
- Transição leve de entrada ao trocar de rota dentro do dashboard (fade/slide curto)

Fora do escopo: contadores animados de número, gráficos entrando com animação, qualquer
coisa que chame mais atenção para si do que para o dado.

## 7. Dark mode

Não faz parte desta leva. O bloco `@media (prefers-color-scheme: dark)` de `app/globals.css`
permanece com os tokens verdes atuais — ou seja, usuários em dark mode não veem a mudança até
uma leva futura decidir se/como estender índigo+esmeralda pro dark mode. Não é removido nem
quebrado, só não é tocado.

## 8. Testes

Reformulação puramente visual, sem mudança de lógica — não há novo comportamento para testar
com Vitest. Verificação é manual: rodar `next dev` e navegar pelas telas do dashboard listadas
na seção 2 (visão geral, produtos, estoque, vendas, metas, configurações) num browser real,
conforme a diretriz do projeto de testar mudanças de UI antes de considerar concluído. O
Playwright headless deste ambiente está com uma dependência de sistema faltando (`libnspr4.so`,
sem acesso a `sudo` para instalar) — se ainda estiver bloqueado no momento da implementação, a
verificação visual é feita abrindo o browser normal e navegando manualmente, não via screenshot
automatizado.
