# Reformulação Visual do Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repintar a área autenticada do Faturio (`app/dashboard/**`) com a paleta índigo +
esmeralda, sombra "soft" e tipografia Plus Jakarta Sans validadas com o usuário, sem afetar
landing/auth/checkout/pagamento nem mudar nenhum comportamento.

**Architecture:** Os tokens de cor e sombra hoje vivem só em `:root` de `app/globals.css` e são
compartilhados por todo o app (landing, auth, checkout usam os mesmos `components/ui/*`). A
solução é escopar os valores novos numa classe `.dashboard-theme`, aplicada só na raiz de
`app/dashboard/layout.tsx` — igual ao mecanismo que o próprio `@theme inline` já usa hoje pro
dark mode (`@media (prefers-color-scheme: dark) { :root { --primary: ... } }`): variáveis CSS
com `var()` se resolvem dinamicamente por elemento, então redeclarar `--primary` (e as demais)
dentro de `.dashboard-theme` faz `bg-primary`, `border-border` etc. mudarem de valor só dentro
dessa subárvore, sem tocar em `components/ui/*` para cor. Raio de borda já bate com o alvo
"soft" hoje (`rounded-2xl` / `rounded-[10px]`), então não muda. Sombra é nova — vira CSS
variable com default neutro em `:root` (equivalente ao `shadow-sm` de hoje) e valor índigo só
dentro de `.dashboard-theme`, para não vazar pra fora do escopo.

**Tech Stack:** Next.js 16 (App Router) + Tailwind CSS 4 (`@theme inline`) + `next/font/google`
+ framer-motion (já instalado).

**Spec:** `docs/superpowers/specs/2026-08-14-dashboard-redesign-design.md`

## Global Constraints

- Escopo: só `app/dashboard/**`, `components/dashboard/*` e os componentes de
  `components/ui/*` **na medida em que são usados pelo dashboard** — sem mudar o visual de
  landing/auth/checkout/pagamento.
- Dark mode fora de escopo — o bloco `@media (prefers-color-scheme: dark)` de
  `app/globals.css` não é tocado.
- Nenhuma mudança de comportamento/lógica — reformulação puramente visual.
- Sem Playwright automatizado nesta sessão (`chrome-headless-shell` falha por
  `libnspr4.so` faltando, sem `sudo` disponível) — verificação visual final é manual, abrindo
  `next dev` num browser normal.

---

### Task 1: Tokens de cor e sombra escopados ao dashboard

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Produces: classe CSS `.dashboard-theme` (aplicada em `app/dashboard/layout.tsx` na Task 2)
  redefinindo `--background`, `--foreground`, `--card-foreground`, `--primary`,
  `--primary-hover`, `--primary-light`, `--secondary`, `--secondary-foreground`, `--muted`,
  `--muted-foreground`, `--accent`, `--accent-foreground`, `--success`, `--border`, `--input`,
  `--ring`. Produces variáveis `--shadow-card` e `--shadow-button-primary` (default em `:root`,
  override em `.dashboard-theme`) consumidas por `components/ui/card.tsx` e
  `components/ui/button.tsx` na Task 3.

- [ ] **Step 1: Adicionar defaults neutros de sombra em `:root`**

Em `app/globals.css`, dentro do bloco `:root` existente (depois de `--ring: #0E7C5D;`),
adicionar:

```css
  --shadow-card: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-button-primary: none;
```

- [ ] **Step 2: Adicionar o bloco `.dashboard-theme` com os tokens novos**

Logo depois do bloco `@media (prefers-color-scheme: dark) { ... }` existente (antes de
`body { ... }`), adicionar:

```css
.dashboard-theme {
  --background: #FAFAFC;
  --foreground: #1E1B4B;
  --card-foreground: #1E1B4B;
  --primary: #6366F1;
  --primary-hover: #4F46E5;
  --primary-light: #A5B4FC;
  --secondary: #F1F0FB;
  --secondary-foreground: #1E1B4B;
  --muted: #F5F4FC;
  --muted-foreground: #64748B;
  --accent: #10B981;
  --accent-foreground: #FFFFFF;
  --success: #10B981;
  --border: #E9E9F2;
  --input: #E9E9F2;
  --ring: #6366F1;
  --shadow-card: 0 4px 16px rgb(99 102 241 / 0.08);
  --shadow-button-primary: 0 4px 12px rgb(99 102 241 / 0.20);
}
```

Não redeclara `--card`, `--primary-foreground`, `--destructive*`, `--warning`, `--info` —
mantêm o valor de `:root` (já corretos pro dashboard, ver seção 3 do spec).

- [ ] **Step 3: Verificar que o CSS compila**

Run: `npm run build`
Expected: build completo sem erro (Tailwind aceita CSS custom properties livremente; isso só
falharia por erro de sintaxe).

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat(dashboard): adiciona tokens de cor e sombra escopados ao dashboard"
```

---

### Task 2: Aplicar o tema e a tipografia Plus Jakarta Sans no layout do dashboard

**Files:**
- Modify: `app/dashboard/layout.tsx`

**Interfaces:**
- Consumes: classe `.dashboard-theme` (Task 1).
- Produces: toda a árvore renderizada dentro de `app/dashboard/layout.tsx` passa a herdar os
  tokens índigo/esmeralda e a fonte Plus Jakarta Sans — nenhuma outra task depende de símbolo
  novo aqui, só do resultado visual.

- [ ] **Step 1: Ler o arquivo atual**

`app/dashboard/layout.tsx` hoje:

```tsx
import type { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 px-6 py-8 md:px-10 md:py-10">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Adicionar a fonte e aplicar a classe de tema**

Substituir o conteúdo por:

```tsx
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Sidebar } from "@/components/dashboard/sidebar";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${plusJakartaSans.variable} dashboard-theme font-sans flex min-h-screen flex-col md:flex-row`}
    >
      <Sidebar />
      <main className="flex-1 px-6 py-8 md:px-10 md:py-10">{children}</main>
    </div>
  );
}
```

A classe utilitária `font-sans` (Tailwind, resolve pra `var(--font-sans)`) precisa estar
**nesse mesmo elemento** — `font-family` é uma propriedade normal (não substitui `var()` de
novo em cada descendente), então só re-aplicando a classe aqui é que a árvore inteira herda a
fonte nova a partir daqui pra baixo.

- [ ] **Step 3: Registrar `--font-sans` da Plus Jakarta Sans dentro de `.dashboard-theme`**

Em `app/globals.css`, dentro do bloco `.dashboard-theme` criado na Task 1, adicionar:

```css
  --font-sans: var(--font-plus-jakarta);
```

- [ ] **Step 4: Rodar typecheck e build**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros de tipo (import de `next/font/google` já é padrão no projeto, ver
`app/layout.tsx`) e build completo.

- [ ] **Step 5: Verificação visual manual**

Run: `npm run dev`, abrir `http://localhost:3000/dashboard` (logado) num browser e
`http://localhost:3000/login` numa outra aba.
Expected: `/dashboard` aparece com fundo `#FAFAFC`, sidebar com item ativo em índigo, texto em
`#1E1B4B`, fonte visivelmente diferente (Plus Jakarta Sans); `/login` continua verde e com a
fonte Geist de sempre — nenhuma diferença visual lá.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/layout.tsx app/globals.css
git commit -m "feat(dashboard): aplica tema índigo/esmeralda e tipografia Plus Jakarta Sans"
```

---

### Task 3: Sombra soft em Card e no botão primário

**Files:**
- Modify: `components/ui/card.tsx`
- Modify: `components/ui/button.tsx`

**Interfaces:**
- Consumes: `--shadow-card` e `--shadow-button-primary` (Task 1).
- Produces: nenhuma interface nova — muda só a classe CSS aplicada nos componentes já
  exportados (`Card`, `Button`), assinaturas inalteradas.

- [ ] **Step 1: Trocar a sombra do `Card`**

Em `components/ui/card.tsx:9`, trocar:

```tsx
"rounded-2xl border border-border bg-card text-card-foreground shadow-sm",
```

por:

```tsx
"rounded-2xl border border-border bg-card text-card-foreground shadow-[var(--shadow-card)]",
```

- [ ] **Step 2: Adicionar a sombra ao variant `primary` do `Button`**

Em `components/ui/button.tsx:11`, trocar:

```tsx
primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
```

por:

```tsx
primary:
  "bg-primary text-primary-foreground shadow-[var(--shadow-button-primary)] hover:bg-primary-hover",
```

- [ ] **Step 3: Rodar typecheck e build**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 4: Verificação visual manual**

Com `npm run dev` rodando, comparar um card e um botão primário em `/dashboard/produtos`
(sombra índigo suave, visível principalmente contra o fundo `#FAFAFC`) com os mesmos
componentes em `/login` (sombra neutra/quase imperceptível de antes — `--shadow-button-primary`
é `none` fora do dashboard, então o botão de login não ganha sombra nova nenhuma).

- [ ] **Step 5: Commit**

```bash
git add components/ui/card.tsx components/ui/button.tsx
git commit -m "feat(dashboard): sombra soft em cards e botão primário, escopada ao dashboard"
```

---

### Task 4: Transição sutil de rota dentro do dashboard

**Files:**
- Create: `components/dashboard/page-transition.tsx`
- Modify: `app/dashboard/layout.tsx`

**Interfaces:**
- Produces: `PageTransition` — Client Component, `{ children: ReactNode }`, envolve o
  conteúdo de cada página do dashboard com um fade+slide curto ao trocar de rota.
- Consumes (Task 2): a estrutura de `app/dashboard/layout.tsx` já com `.dashboard-theme` e a
  fonte aplicadas.

- [ ] **Step 1: Criar o componente de transição**

Criar `components/dashboard/page-transition.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Usar o componente no layout do dashboard**

Em `app/dashboard/layout.tsx`, importar e envolver `{children}`:

```tsx
import { PageTransition } from "@/components/dashboard/page-transition";
```

E trocar `<main className="flex-1 px-6 py-8 md:px-10 md:py-10">{children}</main>` por:

```tsx
<main className="flex-1 px-6 py-8 md:px-10 md:py-10">
  <PageTransition>{children}</PageTransition>
</main>
```

- [ ] **Step 3: Rodar typecheck e build**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 4: Verificação manual**

Com `npm run dev` rodando, navegar entre `/dashboard`, `/dashboard/produtos`,
`/dashboard/estoque` pelo menu — cada troca deve ter um fade curto (150ms) em vez de troca
abrupta, sem flash de conteúdo nem layout pulando.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/page-transition.tsx app/dashboard/layout.tsx
git commit -m "feat(dashboard): transição sutil de rota entre páginas do dashboard"
```

---

### Task 5: QA visual final em todas as telas do dashboard

**Files:** nenhum arquivo novo — task de verificação.

**Interfaces:** nenhuma.

- [ ] **Step 1: Checar se o Playwright headless já funciona nesta máquina**

Run: `node -e "const {chromium}=require('playwright'); (async()=>{try{const b=await chromium.launch();console.log('OK');await b.close();}catch(e){console.log('FAIL');}})()"`

- [ ] **Step 2a (se OK): screenshot automatizado**

Se o passo anterior imprimir `OK`, escrever um script Playwright avulso (não precisa virar
teste permanente) que loga com uma sessão de teste/local e tira screenshot de
`/dashboard`, `/dashboard/produtos`, `/dashboard/estoque`, `/dashboard/vendas`,
`/dashboard/metas`, `/dashboard/configuracoes`, salvando em
`.superpowers/brainstorm/dashboard-redesign-qa/`. Revisar cada imagem: paleta índigo/esmeralda
aplicada, sombra soft nos cards, fonte Plus Jakarta Sans, nenhum elemento com cor do tema
antigo (verde) sobrando, nenhum layout quebrado.

- [ ] **Step 2b (se FAIL): checagem manual**

Se o Playwright continuar bloqueado (erro de `libnspr4.so`), rodar `npm run dev` e pedir para o
usuário (ou navegar via `! <comando>` se aplicável) abrir cada uma das seis rotas acima num
browser normal, conferindo a mesma lista de itens do Step 2a.

- [ ] **Step 3: Conferir que fora do dashboard nada mudou**

Abrir `/`, `/login`, `/checkout` e confirmar visualmente que continuam com a paleta verde
original (nenhum vazamento de índigo/esmeralda ou da fonte nova).

- [ ] **Step 4: Registrar o resultado**

Sem commit de código nesta task — se o QA achar algo quebrado, criar uma correção pontual
como task extra antes de considerar o plano concluído; se tudo estiver certo, a Task 5 encerra
o plano.
