# Faturio — Plano 3: Identidade de Marca, Design System e Landing Page

Data: 2026-08-10
Status: Aprovado para planejamento de implementação

## 1. Escopo

Este plano cobre **identidade visual, design system e a apresentação pública do Faturio** — não
o conteúdo funcional do dashboard (produtos, estoque, vendas, financeiro, insights), que fica
para um plano futuro ("Plano 4"), construído junto com os dados reais para evitar retrabalho
visual quando o formato dos dados reais divergir do mock.

**Dentro do escopo:**
- Identidade de marca (cor, tipografia, ícones, motion) e design system de componentes base.
- Landing page completa (`/`), hoje ocupada pelo placeholder padrão do `create-next-app`.
- Redesenho visual das telas já funcionais: `/login`, `/checkout`, `/definir-senha`,
  `/pagamento/sucesso`, `/pagamento/pendente`, `/pagamento/recusado`. A lógica (Server Actions,
  validação Zod, chamadas Supabase) não muda — só a camada visual.

**Fora do escopo (Plano 4):** Dashboard, Produtos, Estoque, Vendas, Financeiro, Relatórios,
Insights, Onboarding, sidebar/topbar do app logado, toggle de tema.

Origem do conteúdo: brief de design fornecido pelo cliente (identidade de marca completa +
copy da landing), colado na íntegra na conversa de brainstorming deste plano.

## 2. Identidade de marca

### 2.1 Cor

Verde profundo e sofisticado ("Jade") — não o verde-financeiro genérico. Ele carrega o
significado de crescimento/lucro do produto, mas com saturação e tom mais contidos.

| Token | Hex (light) | Hex (dark) | Uso |
|---|---|---|---|
| Primary | `#0E7C5D` | `#3FAE85` | Botões primários, links, logo, elementos de destaque |
| Primary Dark | `#095940` | `#5FC79E` | Hover/active de botões primários (dark mode clareia no hover, não escurece) |
| Primary Light | `#3FAE85` | `#163C2D` | Tints, fundos suaves, ícones secundários |
| Background | `#FAFAF9` | `#0C0E0D` | Fundo da página — quase branco/preto, tom quente |
| Surface | `#FFFFFF` | `#161917` | Cards, superfícies elevadas |
| Border | `#E7E5E4` | `#262B28` | Bordas discretas |
| Text Primary | `#1C1917` | `#F5F5F4` | Texto principal |
| Text Secondary | `#6B6560` | `#A8A29E` | Texto secundário/legendas |
| Success | `#16A34A` | `#22C55E` | Deltas positivos (+12,4%) |
| Warning | `#D97706` | `#F59E0B` | Estoque baixo, alertas |
| Error | `#DC2626` | `#EF4444` | Erros de formulário/validação |
| Info | `#2563EB` | `#3B82F6` | Avisos neutros |

Light mode é o modo principal (conforme o brief). Dark mode existe nos tokens desde já, mas
sem toggle visível nesta entrega — o seletor de tema é uma feature da topbar do dashboard
(Plano 4). Ambos os modos respeitam `prefers-color-scheme` por padrão.

Nota sobre `Primary Dark`/`Primary Light` em dark mode: os nomes descrevem o **papel** do token
(hover/tint), não a luminosidade relativa dentro de cada modo — em fundo escuro, "hover" tende a
clarear (não escurecer) e um "fundo suave" tende a ser um verde escuro dessaturado (não um verde
claro, que ficaria berrante). Por isso os hex de dark mode não seguem a mesma ordem de
luminosidade que os de light mode; isso é intencional.

### 2.2 Tipografia

**Geist** — combina com o ecossistema Next.js/Vercel já usado no projeto, e tem números
tabulares de alta qualidade, importante dado o peso visual que os valores financeiros têm no
produto (`R$ 42.850,90`).

| Estilo | Tamanho/peso | Uso |
|---|---|---|
| Display | 56–64px, bold | Headline do hero |
| H1 | 40px, bold | Título de seção |
| H2 | 32px, semibold | Subtítulo de seção |
| H3 | 24px, semibold | Título de card |
| H4 | 18px, semibold | Subtítulo de card |
| Body Large | 18px, regular | Subheadline, texto de destaque |
| Body | 16px, regular | Texto padrão |
| Body Small | 14px, regular | Legendas, texto auxiliar |
| Caption | 12px, medium | Labels, badges |
| Financial Numbers | peso bold, `font-variant-numeric: tabular-nums` | Valores em R$ (hero visual, showcases) |

### 2.3 Iconografia e motion

**Lucide** (já é o padrão do shadcn/ui — zero dependência extra). Ícones finos, consistentes,
nunca misturados com outro estilo.

**Framer Motion**, sutil: fade-in + slide-up nas seções ao rolar a página, hover scale ~1.02 em
cards/botões, contadores animados nos números de destaque do hero visual, sem exageros — nada
de parallax pesado ou transições de página chamativas.

### 2.4 Radius e sombras

Cards: `16px`. Inputs/botões: `10px`. Sombras extremamente sutis (`shadow-sm`/`shadow-md` do
Tailwind no máximo, nunca sombras pesadas ou glassmorphism).

## 3. Sistema de componentes

Base: **shadcn/ui** (Radix), temizado via CSS variables (Tailwind) mapeadas para os tokens da
seção 2 — nunca cor hardcoded dentro de um componente. Componentes gerados e depois ajustados
manualmente (sombra reduzida, radius, focus ring trocado de azul-padrão para verde da marca).

Inventário necessário para este plano:

- **Button** (primary, secondary, ghost)
- **Input** (com estado de erro — borda `Error`)
- **Card**
- **Badge** (selo "Pagamento único")
- **Alert** (substitui o texto de erro solto atual nos formulários)
- **Accordion** (FAQ da landing)
- **Progress** (barra de meta no hero visual)

Tabs, Modal, Tooltip, Dropdown, Table também entram no design system agora (o brief pede para o
produto inteiro), mas sem uso concreto nesta entrega — ficam prontos para o Plano 4.

## 4. Estrutura de páginas e componentes

```
app/
  page.tsx                    — landing page (Server Component)
  layout.tsx                  — fonte Geist + CSS variables dos tokens
  globals.css                 — tokens (light + dark) via CSS variables
  login/page.tsx               — redesenhado, mesma lógica
  checkout/page.tsx            — redesenhado, mesma lógica
  definir-senha/page.tsx       — redesenhado, mesma lógica
  pagamento/{sucesso,pendente,recusado}/page.tsx  — redesenhados, mesma lógica
components/
  ui/*                        — shadcn/ui temizado
  landing/
    navbar.tsx
    hero.tsx
    hero-visual.tsx           — composição de cards flutuantes (dados de exemplo)
    control-section.tsx       — "antes/depois"
    features-section.tsx
    pricing-showcase.tsx
    stock-showcase.tsx
    sales-showcase.tsx
    goal-showcase.tsx
    pricing-cta.tsx
    faq-section.tsx
    footer.tsx
```

A landing page é Server Component por padrão; só os pedaços interativos (accordion do FAQ,
contadores animados, motion) viram Client Components.

## 5. Landing page — conteúdo por seção

### Navbar
Logo "Faturio" (wordmark, Geist bold). Links: Produto, Funcionalidades, Como funciona, Preço,
FAQ. CTA primário "Começar agora" (→ `/checkout`). Link secundário "Entrar" (→ `/login`).

### Hero
- Headline: "Saiba quanto vender, quanto lucrar e quanto falta para atingir sua meta."
- Subheadline: "Controle preços, produtos, estoque, vendas, custos e resultados em um único
  lugar."
- CTA: "Começar agora" + badge "R$ 129,90 — Pagamento único".
- **Hero visual:** composição de cards flutuantes com profundidade (offset + sombra sutil),
  dados de exemplo (não reais): card de Faturamento (`R$ 42.850,90`, ↑12,4%), card de Lucro
  (`R$ 11.420,40`, ↑8,2%), card de Meta (barra de progresso, 85,7%), um mini gráfico de linha.
  Minimalista — não é literalmente um screenshot do dashboard.

### Seção "Controle" (antes/depois)
Antes: ❌ Confusão · ❌ Planilhas · ❌ Cálculos manuais · ❌ Falta de controle.
Depois: ✓ Clareza · ✓ Organização · ✓ Controle · ✓ Decisão.

### Funcionalidades
6 cards: Precificação ("Descubra quanto cobrar"), Produtos ("Tenha todos os produtos
organizados"), Estoque ("Saiba quanto ainda possui"), Vendas ("Registre e acompanhe suas
vendas"), Metas ("Saiba exatamente quanto falta"), Lucro ("Entenda quanto realmente ganhou").

### Precificação (showcase)
Exemplo visual do cálculo: Produto "Tênis Premium" — Custo R$ 50, Embalagem R$ 2, Frete R$ 5,
Taxas R$ 4, Margem 30% → Preço recomendado **R$ 87,14**. Layout que deixa o cálculo visualmente
claro (linha por linha, resultado em destaque).

### Estoque (showcase)
Lista de exemplo: Tênis Premium (32 un.), Camisa Oversized (12 un.), Calça Cargo (4 un., com
indicador visual de estoque baixo — cor `Warning`, não só o número).

### Vendas (showcase)
Card de exemplo de uma venda registrada (produto, quantidade, valor, lucro, data), com uma seta
indicando "impacta o dashboard".

### Meta (showcase)
Componente "Meta mensal": `R$ 50.000` de meta, atual `R$ 37.400` (74,8%, barra de progresso),
"Falta: `R$ 12.600`", texto: "Você precisa de aproximadamente 101 vendas para alcançar sua
meta."

### Preço
`R$ 129,90` em destaque, "Pagamento único — acesso vitalício", lista curta do que está incluso,
CTA "Começar agora".

### FAQ
O prompt original não define as perguntas (só pede a seção). Copy provisório, a ser revisado
pelo cliente antes de publicar:
- "É realmente pagamento único, sem mensalidade?"
- "Preciso entender de finanças pra usar o Faturio?"
- "Meus dados ficam isolados dos de outros clientes?"
- "Funciona pra qualquer tipo de produto ou nicho?"
- "Dá pra usar pelo celular?"
- "Como funciona o suporte?"

### Footer
Links (Termos de Uso, Política de Privacidade — conteúdo já previsto na spec original seção
13), copyright.

## 6. Redesenho das telas existentes

`/login`, `/checkout`, `/definir-senha`, `/pagamento/{sucesso,pendente,recusado}`: mesma lógica
(Server Actions, Zod, chamadas Supabase inalteradas), nova camada visual — `Card` centralizado,
`Input`/`Button`/`Alert` do design system, logo/wordmark no topo, motion sutil de entrada.

## 7. Estados

- **Loading:** botões usam o estado `isSubmitting` já existente, mas com spinner e visual do
  novo `Button`.
- **Erro:** troca o texto vermelho solto atual pelo componente `Alert`.
- **Vazio:** não se aplica neste plano (landing é estática; empty states de listas são Plano 4).

## 8. Responsividade

Mobile-first. Navbar vira menu hamburguer abaixo do breakpoint `md`. Hero visual empilha abaixo
do texto no mobile. Showcases (precificação/estoque/vendas/meta) em coluna única no mobile,
grid no desktop.

## 9. Verificação

Sem navegador headless disponível neste ambiente de desenvolvimento até este ponto — **Playwright
+ Chromium serão adicionados como dev dependency** neste plano, usados para QA visual manual
(screenshot) durante a implementação, não como suite automatizada de CI. Verificação por task:
`npx tsc --noEmit`, `npm run build`, e screenshot de cada página nova/redesenhada (light e dark
mode) confirmando que os tokens da seção 2 foram aplicados.

## 10. Fora de escopo (fica para o Plano 4)

Dashboard, Produtos, Estoque, Vendas, Financeiro, Relatórios, Insights, Onboarding, sidebar/
topbar do app logado, toggle de tema, notificações, skeleton states de carregamento de dados
reais.
