# Faturio — Plano 3: Identidade de Marca, Design System e Landing Page — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a identidade de marca e o design system do Faturio (shadcn/ui temizado), a landing page completa, e redesenhar visualmente as telas já funcionais de login/checkout/pagamento — sem alterar nenhuma lógica de negócio existente.

**Architecture:** Tokens de cor/tipografia via CSS variables no Tailwind 4 (`@theme`), componentes base shadcn/ui (Radix onde acessibilidade importa: Accordion, Progress), landing page 100% Server Component exceto os pedaços interativos, Framer Motion para microinterações.

**Tech Stack:** Next.js 16, TypeScript, React 19, Tailwind CSS 4, shadcn/ui (Radix), class-variance-authority, Lucide (ícones), Framer Motion, Playwright (QA visual manual).

## Global Constraints

- Cor primária "Jade": light `#0E7C5D` / dark `#3FAE85` — nunca usar verde genérico do Tailwind (`green-500`/`emerald-500`).
- Tipografia: Geist (já configurada no projeto via `next/font/google`, `app/layout.tsx`).
- Radius: cards `16px` (classe `rounded-2xl`), inputs/botões `10px`.
- Ícones: exclusivamente Lucide (`lucide-react`), nunca misturar com outro conjunto.
- Motion: Framer Motion, sutil — fade-in/slide-up, hover scale ~1.02. Sem parallax pesado, sem glassmorphism, sem sombras pesadas.
- Nenhuma Server Action, validação Zod ou chamada Supabase muda de comportamento nas telas redesenhadas — só a camada visual.
- Landing page e componentes de showcase usam dados de exemplo fixos (não consultam o banco).
- Light mode é o padrão. Dark mode existe nos tokens via `prefers-color-scheme`; sem toggle manual nesta entrega (fica para o Plano 4, na topbar do dashboard).
- O token "Error" da spec de design corresponde a `destructive` no código — é a convenção shadcn/ui, mantida para compatibilidade com componentes shadcn futuros (Plano 4).
- Este plano é de UI/apresentação, sem lógica de negócio nova — não há TDD de unidade aplicável. Verificação por task é `npx tsc --noEmit` sempre, mais `npm run build` e captura de screenshot (Playwright) nas tasks que produzem uma página navegável.
- Gerenciador de pacotes: npm.

---

## Task 1: Dependências, tokens de design e fontes

**Files:**
- Modify: `package.json` (dependências)
- Modify: `app/globals.css`
- Create: `lib/utils.ts`

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string` em `lib/utils.ts` — usado por todos os componentes de UI das tasks seguintes. Tokens de cor Tailwind (`bg-primary`, `text-foreground`, `bg-card`, `text-destructive`, `bg-success/10`, etc.) disponíveis globalmente a partir desta task.

- [ ] **Step 1: Instalar dependências**

```bash
npm install class-variance-authority clsx tailwind-merge @radix-ui/react-slot @radix-ui/react-accordion @radix-ui/react-progress lucide-react framer-motion
```

- [ ] **Step 2: Criar `lib/utils.ts`**

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Substituir `app/globals.css` pelos tokens de marca**

```css
@import "tailwindcss";

:root {
  --background: #FAFAF9;
  --foreground: #1C1917;
  --card: #FFFFFF;
  --card-foreground: #1C1917;
  --primary: #0E7C5D;
  --primary-hover: #095940;
  --primary-light: #3FAE85;
  --primary-foreground: #FFFFFF;
  --secondary: #F0EFED;
  --secondary-foreground: #1C1917;
  --muted: #F5F4F2;
  --muted-foreground: #6B6560;
  --accent: #3FAE85;
  --accent-foreground: #1C1917;
  --destructive: #DC2626;
  --destructive-foreground: #FFFFFF;
  --success: #16A34A;
  --warning: #D97706;
  --info: #2563EB;
  --border: #E7E5E4;
  --input: #E7E5E4;
  --ring: #0E7C5D;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-light: var(--primary-light);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-info: var(--info);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0C0E0D;
    --foreground: #F5F5F4;
    --card: #161917;
    --card-foreground: #F5F5F4;
    --primary: #3FAE85;
    --primary-hover: #5FC79E;
    --primary-light: #163C2D;
    --primary-foreground: #0C0E0D;
    --secondary: #1F2321;
    --secondary-foreground: #F5F5F4;
    --muted: #171B19;
    --muted-foreground: #A8A29E;
    --accent: #163C2D;
    --accent-foreground: #F5F5F4;
    --destructive: #EF4444;
    --destructive-foreground: #0C0E0D;
    --success: #22C55E;
    --warning: #F59E0B;
    --info: #3B82F6;
    --border: #262B28;
    --input: #262B28;
    --ring: #3FAE85;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
}

@keyframes accordion-down {
  from { height: 0; }
  to { height: var(--radix-accordion-content-height); }
}
@keyframes accordion-up {
  from { height: var(--radix-accordion-content-height); }
  to { height: 0; }
}
.animate-accordion-down { animation: accordion-down 0.2s ease-out; }
.animate-accordion-up { animation: accordion-up 0.2s ease-out; }
```

- [ ] **Step 4: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app/globals.css lib/utils.ts
git commit -m "feat(design): tokens de marca, fontes e utilitário cn"
```

---

## Task 2: Componentes base (Button, Input, Card, Badge, Alert)

**Files:**
- Create: `components/ui/button.tsx`
- Create: `components/ui/input.tsx`
- Create: `components/ui/card.tsx`
- Create: `components/ui/badge.tsx`
- Create: `components/ui/alert.tsx`

**Interfaces:**
- Consumes: `cn` de `lib/utils.ts` (Task 1)
- Produces: `Button`, `buttonVariants`, `Input`, `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`, `Badge`, `Alert` — usados por todas as tasks de landing (5-11) e de redesenho de telas (13-15).

- [ ] **Step 1: Criar `components/ui/button.tsx`**

```typescript
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-4",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

- [ ] **Step 2: Criar `components/ui/input.tsx`**

```typescript
import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <input
        className={cn(
          "flex h-11 w-full rounded-[10px] border bg-card px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          invalid ? "border-destructive focus-visible:ring-destructive" : "border-input",
          className
        )}
        aria-invalid={invalid || undefined}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
```

- [ ] **Step 3: Criar `components/ui/card.tsx`**

```typescript
import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-border bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-lg font-semibold leading-none", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
```

- [ ] **Step 4: Criar `components/ui/badge.tsx`**

```typescript
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
```

- [ ] **Step 5: Criar `components/ui/alert.tsx`**

```typescript
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative w-full rounded-[10px] border px-4 py-3 text-sm", {
  variants: {
    variant: {
      destructive: "border-destructive/30 bg-destructive/5 text-destructive",
      default: "border-border bg-muted text-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
  )
);
Alert.displayName = "Alert";

export { Alert, alertVariants };
```

- [ ] **Step 6: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add components/ui/button.tsx components/ui/input.tsx components/ui/card.tsx components/ui/badge.tsx components/ui/alert.tsx
git commit -m "feat(design): componentes base do design system (Button, Input, Card, Badge, Alert)"
```

---

## Task 3: Accordion e Progress (Radix)

**Files:**
- Create: `components/ui/accordion.tsx`
- Create: `components/ui/progress.tsx`

**Interfaces:**
- Consumes: `cn` de `lib/utils.ts` (Task 1), animações `.animate-accordion-down`/`.animate-accordion-up` de `app/globals.css` (Task 1)
- Produces: `Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent` — usado pela Task 11 (FAQ). `Progress` — usado pelas Tasks 6 e 10 (hero visual, meta).

- [ ] **Step 1: Criar `components/ui/accordion.tsx`**

```typescript
"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b border-border", className)}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-5 text-left text-base font-medium transition-all [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-5 text-muted-foreground", className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
```

- [ ] **Step 2: Criar `components/ui/progress.tsx`**

```typescript
"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-muted", className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-transform duration-500 ease-out"
      style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = "Progress";

export { Progress };
```

- [ ] **Step 3: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add components/ui/accordion.tsx components/ui/progress.tsx
git commit -m "feat(design): componentes Accordion e Progress (Radix)"
```

---

## Task 4: Playwright para QA visual

**Files:**
- Modify: `package.json` (dependência dev + script)
- Create: `scripts/screenshot.mjs`

**Interfaces:**
- Produces: `node scripts/screenshot.mjs <url> <arquivo-saida.png> [light|dark]` — usado pelas Tasks 12-16 para verificação visual de cada página.

- [ ] **Step 1: Instalar Playwright**

```bash
npm install -D playwright
npx playwright install chromium
```

Se o download/instalação do Chromium falhar por falta de bibliotecas do sistema (comum em
containers Linux mínimos), tente `npx playwright install --with-deps chromium` (exige
`apt-get`/sudo). Se nenhuma das duas funcionar neste ambiente, pule a captura de screenshot
nas tasks seguintes e substitua por verificação manual: rode `npm run dev`, abra a URL você
mesmo, e confirme visualmente antes de marcar a task como concluída.

- [ ] **Step 2: Criar `scripts/screenshot.mjs`**

```javascript
import { chromium } from "playwright";
import fs from "node:fs";

const url = process.argv[2];
const outPath = process.argv[3];
const colorScheme = process.argv[4] === "dark" ? "dark" : "light";
const width = Number(process.argv[5]) || 1280;

if (!url || !outPath) {
  console.error(
    "Uso: node scripts/screenshot.mjs <url> <arquivo-saida.png> [light|dark] [largura-px]"
  );
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ colorScheme, viewport: { width, height: 900 } });
await page.goto(url, { waitUntil: "networkidle" });
fs.mkdirSync("screenshots", { recursive: true });
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();
console.log(`Screenshot salvo em ${outPath}`);
```

- [ ] **Step 3: Adicionar `.gitignore` para a pasta de screenshots**

Adicione a linha `/screenshots` ao `.gitignore` (screenshots são artefato de QA local, não
devem ser versionados).

- [ ] **Step 4: Testar o script contra a página atual**

Run:
```bash
npm run dev -- --port 3100 &
timeout 30 bash -c 'until curl -sf http://localhost:3100 >/dev/null; do sleep 1; done'
node scripts/screenshot.mjs http://localhost:3100 screenshots/smoke-test.png light
lsof -ti:3100 -sTCP:LISTEN | xargs -r kill
```
Expected: arquivo `screenshots/smoke-test.png` criado, mensagem "Screenshot salvo em...".

O 5º argumento (largura em px) é opcional, usado pela Task 16 para verificar o menu mobile da
Navbar (Task 5) em uma viewport estreita.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json scripts/screenshot.mjs .gitignore
git commit -m "chore(qa): adiciona Playwright e script de screenshot para QA visual"
```

---

## Task 5: Navbar

**Files:**
- Create: `components/landing/navbar.tsx`

**Interfaces:**
- Consumes: `Button` (Task 2)
- Produces: `Navbar` — usado pela Task 12 (montagem da landing page).

- [ ] **Step 1: Criar `components/landing/navbar.tsx`**

Client Component: abaixo do breakpoint `md`, os links viram um menu hamburguer (a spec, seção
8, é explícita — não pode só sumir sem alternativa de acesso).

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { href: "#produto", label: "Produto" },
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#preco", label: "Preço" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
          Faturio
        </Link>
        <ul className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition-colors hover:text-foreground">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="text-sm font-medium text-foreground">
            Entrar
          </Link>
          <Button asChild size="sm">
            <Link href="/checkout">Começar agora</Link>
          </Button>
        </div>
        <button
          type="button"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] text-foreground md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>
      {open && (
        <div className="border-t border-border px-6 py-4 md:hidden">
          <ul className="flex flex-col gap-4 text-sm text-muted-foreground">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-3">
            <Link href="/login" className="text-sm font-medium text-foreground">
              Entrar
            </Link>
            <Button asChild size="sm" className="w-full">
              <Link href="/checkout">Começar agora</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 2: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add components/landing/navbar.tsx
git commit -m "feat(landing): navbar"
```

---

## Task 6: Hero e HeroVisual

**Files:**
- Create: `components/landing/hero.tsx`
- Create: `components/landing/hero-visual.tsx`

**Interfaces:**
- Consumes: `Button` (Task 2), `Badge` (Task 2), `Card` (Task 2), `Progress` (Task 3)
- Produces: `Hero` — usado pela Task 12. Contém `id="produto"`, âncora do link "Produto" da Navbar.

- [ ] **Step 1: Criar `components/landing/hero-visual.tsx`**

```typescript
"use client";

import { motion } from "framer-motion";
import { TrendingUp, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function HeroVisual() {
  return (
    <div className="relative h-[380px] w-full max-w-md shrink-0 sm:h-[420px]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute left-0 top-4 w-56"
      >
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Faturamento</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">R$ 42.850,90</p>
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-success">
            <TrendingUp className="h-3.5 w-3.5" /> +12,4%
          </p>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="absolute right-0 top-24 w-52 sm:top-28"
      >
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Lucro</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">R$ 11.420,40</p>
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-success">
            <TrendingUp className="h-3.5 w-3.5" /> +8,2%
          </p>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="absolute bottom-0 left-4 w-64 sm:left-8"
      >
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Target className="h-3.5 w-3.5" /> Meta mensal
            </p>
            <p className="text-xs font-semibold text-foreground">85,7%</p>
          </div>
          <Progress value={85.7} />
        </Card>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Criar `components/landing/hero.tsx`**

```typescript
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeroVisual } from "./hero-visual";

export function Hero() {
  return (
    <section
      id="produto"
      className="mx-auto flex max-w-6xl flex-col items-center gap-16 px-6 pb-24 pt-20 lg:flex-row lg:items-center lg:pt-28"
    >
      <div className="flex max-w-xl flex-col items-center gap-6 text-center lg:items-start lg:text-left">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[56px] lg:leading-[1.1]">
          Saiba quanto vender, quanto lucrar e quanto falta para atingir sua meta.
        </h1>
        <p className="text-lg text-muted-foreground">
          Controle preços, produtos, estoque, vendas, custos e resultados em um único lugar.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/checkout">Começar agora</Link>
          </Button>
          <Badge>R$ 129,90 — Pagamento único</Badge>
        </div>
      </div>
      <HeroVisual />
    </section>
  );
}
```

- [ ] **Step 3: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add components/landing/hero.tsx components/landing/hero-visual.tsx
git commit -m "feat(landing): hero e composição visual do dashboard"
```

---

## Task 7: ControlSection e FeaturesSection

**Files:**
- Create: `components/landing/control-section.tsx`
- Create: `components/landing/features-section.tsx`

**Interfaces:**
- Consumes: `Card` (Task 2)
- Produces: `ControlSection`, `FeaturesSection` — usados pela Task 12. `FeaturesSection` contém `id="funcionalidades"`, âncora da Navbar.

- [ ] **Step 1: Criar `components/landing/control-section.tsx`**

```typescript
import { X, Check } from "lucide-react";

const before = ["Confusão", "Planilhas", "Cálculos manuais", "Falta de controle"];
const after = ["Clareza", "Organização", "Controle", "Decisão"];

export function ControlSection() {
  return (
    <section className="border-t border-border bg-muted/40 py-20">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Chega de números espalhados
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 text-left">
            <p className="mb-4 text-sm font-semibold text-muted-foreground">ANTES</p>
            <ul className="flex flex-col gap-3">
              {before.map((item) => (
                <li key={item} className="flex items-center gap-2 text-foreground">
                  <X className="h-4 w-4 shrink-0 text-destructive" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-card p-6 text-left">
            <p className="mb-4 text-sm font-semibold text-primary">DEPOIS</p>
            <ul className="flex flex-col gap-3">
              {after.map((item) => (
                <li key={item} className="flex items-center gap-2 text-foreground">
                  <Check className="h-4 w-4 shrink-0 text-success" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Criar `components/landing/features-section.tsx`**

```typescript
import { Calculator, Package, Boxes, ShoppingCart, Target, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  { icon: Calculator, title: "Precificação", description: "Descubra quanto cobrar." },
  { icon: Package, title: "Produtos", description: "Tenha todos os produtos organizados." },
  { icon: Boxes, title: "Estoque", description: "Saiba quanto ainda possui." },
  { icon: ShoppingCart, title: "Vendas", description: "Registre e acompanhe suas vendas." },
  { icon: Target, title: "Metas", description: "Saiba exatamente quanto falta." },
  { icon: TrendingUp, title: "Lucro", description: "Entenda quanto realmente ganhou." },
];

export function FeaturesSection() {
  return (
    <section id="funcionalidades" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Tudo que o seu negócio precisa
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add components/landing/control-section.tsx components/landing/features-section.tsx
git commit -m "feat(landing): seção de controle (antes/depois) e funcionalidades"
```

---

## Task 8: PricingShowcase

**Files:**
- Create: `components/landing/pricing-showcase.tsx`

**Interfaces:**
- Produces: `PricingShowcase` — usado pela Task 10 (`HowItWorksSection`).

- [ ] **Step 1: Criar `components/landing/pricing-showcase.tsx`**

```typescript
const rows = [
  { label: "Custo", value: "R$ 50,00" },
  { label: "Embalagem", value: "R$ 2,00" },
  { label: "Frete", value: "R$ 5,00" },
  { label: "Taxas", value: "R$ 4,00" },
  { label: "Margem desejada", value: "30%" },
];

export function PricingShowcase() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div>
        <h3 className="text-2xl font-semibold text-foreground">Precificação</h3>
        <p className="mt-2 text-muted-foreground">
          Informe seus custos e a margem desejada — o Faturio calcula o preço de venda ideal.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="mb-4 text-sm font-medium text-muted-foreground">Tênis Premium</p>
        <dl className="flex flex-col gap-2.5 border-b border-border pb-4">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-medium tabular-nums text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Preço recomendado</span>
          <span className="text-2xl font-bold tabular-nums text-primary">R$ 87,14</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add components/landing/pricing-showcase.tsx
git commit -m "feat(landing): showcase de precificação"
```

---

## Task 9: StockShowcase e SalesShowcase

**Files:**
- Create: `components/landing/stock-showcase.tsx`
- Create: `components/landing/sales-showcase.tsx`

**Interfaces:**
- Produces: `StockShowcase`, `SalesShowcase` — usados pela Task 10.

- [ ] **Step 1: Criar `components/landing/stock-showcase.tsx`**

```typescript
import { AlertTriangle } from "lucide-react";

const products = [
  { name: "Tênis Premium", stock: 32, low: false },
  { name: "Camisa Oversized", stock: 12, low: false },
  { name: "Calça Cargo", stock: 4, low: true },
];

export function StockShowcase() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div className="order-2 rounded-2xl border border-border bg-card p-6 lg:order-1">
        <ul className="flex flex-col gap-3">
          {products.map((product) => (
            <li
              key={product.name}
              className="flex items-center justify-between rounded-[10px] border border-border px-4 py-3"
            >
              <span className="text-sm font-medium text-foreground">{product.name}</span>
              <span
                className={
                  product.low
                    ? "flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning"
                    : "text-sm tabular-nums text-muted-foreground"
                }
              >
                {product.low && <AlertTriangle className="h-3.5 w-3.5" />}
                {product.stock} un.
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="order-1 lg:order-2">
        <h3 className="text-2xl font-semibold text-foreground">Estoque</h3>
        <p className="mt-2 text-muted-foreground">
          Saiba exatamente quanto você tem de cada produto — e receba um aviso antes de faltar.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Criar `components/landing/sales-showcase.tsx`**

```typescript
import { ArrowRight } from "lucide-react";

export function SalesShowcase() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div>
        <h3 className="text-2xl font-semibold text-foreground">Vendas</h3>
        <p className="mt-2 text-muted-foreground">
          Registre uma venda e veja o impacto no seu faturamento e lucro na hora.
        </p>
      </div>
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Tênis Premium</p>
          <p className="text-xs text-muted-foreground">2 unidades · 10/08/2026</p>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="tabular-nums text-foreground">R$ 174,28</span>
            <span className="tabular-nums text-success">+R$ 74,28 lucro</span>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-primary" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add components/landing/stock-showcase.tsx components/landing/sales-showcase.tsx
git commit -m "feat(landing): showcases de estoque e vendas"
```

---

## Task 10: GoalShowcase e HowItWorksSection

**Files:**
- Create: `components/landing/goal-showcase.tsx`
- Create: `components/landing/how-it-works-section.tsx`

**Interfaces:**
- Consumes: `Progress` (Task 3), `PricingShowcase` (Task 8), `StockShowcase`/`SalesShowcase` (Task 9)
- Produces: `HowItWorksSection` — usado pela Task 12. Contém `id="como-funciona"`, âncora da Navbar.

- [ ] **Step 1: Criar `components/landing/goal-showcase.tsx`**

```typescript
import { Progress } from "@/components/ui/progress";

export function GoalShowcase() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div className="order-2 rounded-2xl border border-border bg-card p-6 lg:order-1">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium text-muted-foreground">Meta mensal</p>
          <p className="text-sm font-semibold tabular-nums text-foreground">R$ 50.000</p>
        </div>
        <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">R$ 37.400</p>
        <div className="mt-4">
          <Progress value={74.8} />
          <p className="mt-1.5 text-xs font-medium text-muted-foreground">74,8%</p>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Falta <span className="font-semibold tabular-nums text-foreground">R$ 12.600</span> —
          você precisa de aproximadamente{" "}
          <span className="font-semibold text-foreground">101 vendas</span> para alcançar sua
          meta.
        </p>
      </div>
      <div className="order-1 lg:order-2">
        <h3 className="text-2xl font-semibold text-foreground">Metas</h3>
        <p className="mt-2 text-muted-foreground">
          Acompanhe em tempo real o quanto falta para bater sua meta do mês.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Criar `components/landing/how-it-works-section.tsx`**

```typescript
import { PricingShowcase } from "./pricing-showcase";
import { StockShowcase } from "./stock-showcase";
import { SalesShowcase } from "./sales-showcase";
import { GoalShowcase } from "./goal-showcase";

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="border-t border-border bg-muted/40 py-20">
      <div className="mx-auto flex max-w-5xl flex-col gap-20 px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Como funciona
        </h2>
        <PricingShowcase />
        <StockShowcase />
        <SalesShowcase />
        <GoalShowcase />
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add components/landing/goal-showcase.tsx components/landing/how-it-works-section.tsx
git commit -m "feat(landing): showcase de meta e seção 'Como funciona'"
```

---

## Task 11: PricingCTA, FAQSection e Footer

**Files:**
- Create: `components/landing/pricing-cta.tsx`
- Create: `components/landing/faq-section.tsx`
- Create: `components/landing/footer.tsx`

**Interfaces:**
- Consumes: `Button` (Task 2), `Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent` (Task 3)
- Produces: `PricingCTA` (`id="preco"`), `FAQSection` (`id="faq"`), `Footer` — usados pela Task 12.

- [ ] **Step 1: Criar `components/landing/pricing-cta.tsx`**

```typescript
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const included = [
  "Precificação, produtos, estoque e vendas",
  "Metas e acompanhamento de lucro",
  "Acesso vitalício, sem mensalidade",
];

export function PricingCTA() {
  return (
    <section id="preco" className="py-20">
      <div className="mx-auto max-w-lg px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Preço</h2>
        <div className="mt-8 rounded-2xl border border-border bg-card p-8">
          <p className="text-5xl font-bold tabular-nums text-foreground">R$ 129,90</p>
          <p className="mt-1 text-sm text-muted-foreground">Pagamento único — acesso vitalício</p>
          <ul className="mt-6 flex flex-col gap-2.5 text-left">
            {included.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="h-4 w-4 shrink-0 text-success" /> {item}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-8 w-full">
            <Link href="/checkout">Começar agora</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Criar `components/landing/faq-section.tsx`**

```typescript
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "É realmente pagamento único, sem mensalidade?",
    answer: "Sim. Você paga uma vez R$ 129,90 e tem acesso vitalício ao Faturio.",
  },
  {
    question: "Preciso entender de finanças pra usar o Faturio?",
    answer:
      "Não. O Faturio foi pensado para quem nunca trabalhou com planilhas ou controle financeiro — os cálculos são feitos por você.",
  },
  {
    question: "Meus dados ficam isolados dos de outros clientes?",
    answer:
      "Sim. Cada conta tem seus próprios dados, completamente isolados dos demais clientes da plataforma.",
  },
  {
    question: "Funciona pra qualquer tipo de produto ou nicho?",
    answer:
      "Sim. O Faturio funciona para qualquer negócio que venda produtos físicos, seja pelo Instagram, WhatsApp ou uma loja online.",
  },
  {
    question: "Dá pra usar pelo celular?",
    answer: "Sim, o Faturio funciona no navegador do seu celular, sem precisar instalar nada.",
  },
  {
    question: "Como funciona o suporte?",
    answer: "Nosso suporte é feito por e-mail, e responde o mais rápido possível.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-20">
      <div className="mx-auto max-w-2xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Perguntas frequentes
        </h2>
        <Accordion type="single" collapsible className="mt-10">
          {faqs.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Criar `components/landing/footer.tsx`**

```typescript
export function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <p>Faturio</p>
        <p>&copy; {new Date().getFullYear()} Faturio. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add components/landing/pricing-cta.tsx components/landing/faq-section.tsx components/landing/footer.tsx
git commit -m "feat(landing): seção de preço, FAQ e footer"
```

---

## Task 12: Montagem da landing page

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `Navbar` (Task 5), `Hero` (Task 6), `ControlSection`/`FeaturesSection` (Task 7), `HowItWorksSection` (Task 10), `PricingCTA`/`FAQSection`/`Footer` (Task 11)
- Produces: rota `/` funcional, landing page completa — substitui o placeholder do
  `create-next-app`.

- [ ] **Step 1: Substituir `app/page.tsx`**

```typescript
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { ControlSection } from "@/components/landing/control-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { PricingCTA } from "@/components/landing/pricing-cta";
import { FAQSection } from "@/components/landing/faq-section";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ControlSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingCTA />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Atualizar metadata e idioma em `app/layout.tsx`**

Troque `lang="en"` por `lang="pt-BR"`, e o objeto `metadata`:

```typescript
export const metadata: Metadata = {
  title: "Faturio — Precificação, estoque e vendas em um só lugar",
  description:
    "Saiba quanto vender, quanto lucrar e quanto falta para atingir sua meta. Controle preços, produtos, estoque e vendas no Faturio.",
};
```

- [ ] **Step 3: Verificar que o projeto compila e builda**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros, rota `/` listada como estática no output do build.

- [ ] **Step 4: Screenshot de verificação (light e dark)**

```bash
npm run dev -- --port 3100 &
timeout 30 bash -c 'until curl -sf http://localhost:3100 >/dev/null; do sleep 1; done'
node scripts/screenshot.mjs http://localhost:3100 screenshots/landing-light.png light
node scripts/screenshot.mjs http://localhost:3100 screenshots/landing-dark.png dark
lsof -ti:3100 -sTCP:LISTEN | xargs -r kill
```

Expected: as duas imagens mostram a landing completa (navbar, hero com composição visual,
seção de controle, funcionalidades, como funciona, preço, FAQ, footer), com as cores da seção
2 da spec aplicadas — não o placeholder do Next.js. Se o Playwright não estiver disponível
(ver nota da Task 4), abra `http://localhost:3100` manualmente e confirme visualmente.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/layout.tsx
git commit -m "feat(landing): monta a landing page completa em /"
```

---

## Task 13: Redesenho de `/login` e `/definir-senha`

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `app/definir-senha/page.tsx`

**Interfaces:**
- Consumes: `Button`, `Input`, `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`,
  `Alert` (Task 2)
- Produces: nenhuma interface nova — lógica de autenticação (Supabase, Zod, react-hook-form)
  permanece idêntica, só a camada visual muda.

- [ ] **Step 1: Substituir `app/login/page.tsx`**

```typescript
"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

const formSchema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(6, "Senha muito curta"),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setServerError("E-mail ou senha inválidos.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-16">
      <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
        Faturio
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Acesse sua conta do Faturio.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                E-mail
              </label>
              <Input id="email" type="email" invalid={!!errors.email} {...register("email")} />
              {errors.email && (
                <p className="mt-1.5 text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Senha
              </label>
              <Input
                id="password"
                type="password"
                invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1.5 text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            {serverError && <Alert variant="destructive">{serverError}</Alert>}
            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <div className="mt-6 flex justify-between text-sm text-muted-foreground">
            <Link href="/esqueci-senha" className="hover:text-foreground">
              Esqueci minha senha
            </Link>
            <Link href="/checkout" className="hover:text-foreground">
              Comece agora
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 2: Substituir `app/definir-senha/page.tsx`**

```typescript
"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

const formSchema = z.object({
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

type FormValues = z.infer<typeof formSchema>;

export default function DefinirSenhaPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      setServerError("Não foi possível definir sua senha. Tente novamente.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-16">
      <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
        Faturio
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Definir senha</CardTitle>
          <CardDescription>Escolha uma senha para acessar sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Nova senha
              </label>
              <Input
                id="password"
                type="password"
                invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1.5 text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            {serverError && <Alert variant="destructive">{serverError}</Alert>}
            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? "Salvando..." : "Salvar senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 3: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Rodar os testes existentes (garantir que nada de lógica quebrou)**

Run: `npm run test`
Expected: `8 passed` (mesma contagem de antes — este plano não adiciona nem altera lógica
testável).

- [ ] **Step 5: Screenshot de verificação**

```bash
npm run dev -- --port 3100 &
timeout 30 bash -c 'until curl -sf http://localhost:3100 >/dev/null; do sleep 1; done'
node scripts/screenshot.mjs http://localhost:3100/login screenshots/login-light.png light
node scripts/screenshot.mjs http://localhost:3100/definir-senha screenshots/definir-senha-light.png light
lsof -ti:3100 -sTCP:LISTEN | xargs -r kill
```

Expected: cards centralizados com o novo design system, não mais o formulário cru anterior.

- [ ] **Step 6: Commit**

```bash
git add app/login/page.tsx app/definir-senha/page.tsx
git commit -m "feat(design): redesenha login e definir-senha com o design system"
```

---

## Task 14: Redesenho de `/checkout`

**Files:**
- Modify: `app/checkout/page.tsx`

**Interfaces:**
- Consumes: `Button`, `Input`, `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`,
  `Alert`, `Badge` (Task 2)
- Produces: nenhuma interface nova — `startCheckout` (lib/actions/checkout.ts) e sua validação
  Zod permanecem idênticos.

- [ ] **Step 1: Substituir `app/checkout/page.tsx`**

```typescript
"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { startCheckout } from "@/lib/actions/checkout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  name: z.string().min(2, "Informe seu nome completo"),
  email: z.string().email("Informe um e-mail válido"),
});

type FormValues = z.infer<typeof formSchema>;

export default function CheckoutPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await startCheckout(values);
    if (!result.success || !result.redirectUrl) {
      setServerError(result.error ?? "Erro inesperado. Tente novamente.");
      return;
    }
    window.location.href = result.redirectUrl;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-16">
      <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
        Faturio
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Começar agora</CardTitle>
          <CardDescription>Acesso completo ao Faturio.</CardDescription>
          <Badge className="mt-1 w-fit">R$ 129,90 — Pagamento único</Badge>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
                Nome completo
              </label>
              <Input id="name" invalid={!!errors.name} {...register("name")} />
              {errors.name && (
                <p className="mt-1.5 text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                E-mail
              </label>
              <Input id="email" type="email" invalid={!!errors.email} {...register("email")} />
              {errors.email && (
                <p className="mt-1.5 text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            {serverError && <Alert variant="destructive">{serverError}</Alert>}
            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? "Redirecionando..." : "Ir para pagamento — R$ 129,90"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 2: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Screenshot de verificação**

```bash
npm run dev -- --port 3100 &
timeout 30 bash -c 'until curl -sf http://localhost:3100 >/dev/null; do sleep 1; done'
node scripts/screenshot.mjs http://localhost:3100/checkout screenshots/checkout-light.png light
lsof -ti:3100 -sTCP:LISTEN | xargs -r kill
```

Expected: card com badge de preço, campos nome/e-mail com o novo `Input`.

- [ ] **Step 4: Commit**

```bash
git add app/checkout/page.tsx
git commit -m "feat(design): redesenha checkout com o design system"
```

---

## Task 15: Redesenho das páginas de pagamento

**Files:**
- Modify: `app/pagamento/sucesso/page.tsx`
- Modify: `app/pagamento/pendente/page.tsx`
- Modify: `app/pagamento/recusado/page.tsx`

**Interfaces:**
- Consumes: `Button` (Task 2)
- Produces: nenhuma interface nova — estas páginas são só feedback visual (a spec original,
  seção 5, é explícita: nunca fonte de liberação de acesso).

- [ ] **Step 1: Substituir `app/pagamento/sucesso/page.tsx`**

```typescript
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PagamentoSucessoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <div className="max-w-sm">
        <h1 className="text-2xl font-semibold text-foreground">Pagamento confirmado!</h1>
        <p className="mt-2 text-muted-foreground">
          Seu acesso foi liberado. Enviamos um e-mail para você definir sua senha e entrar.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/login">Acessar minha dashboard</Link>
      </Button>
    </main>
  );
}
```

- [ ] **Step 2: Substituir `app/pagamento/pendente/page.tsx`**

```typescript
import { Clock } from "lucide-react";

export default function PagamentoPendentePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning">
        <Clock className="h-7 w-7" />
      </div>
      <div className="max-w-sm">
        <h1 className="text-2xl font-semibold text-foreground">
          Estamos aguardando a confirmação do pagamento.
        </h1>
        <p className="mt-2 text-muted-foreground">
          Assim que o pagamento for confirmado, você receberá um e-mail com o acesso.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Substituir `app/pagamento/recusado/page.tsx`**

```typescript
import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PagamentoRecusadoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <XCircle className="h-7 w-7" />
      </div>
      <h1 className="max-w-sm text-2xl font-semibold text-foreground">
        Não foi possível concluir seu pagamento.
      </h1>
      <Button asChild size="lg">
        <Link href="/checkout">Tentar novamente</Link>
      </Button>
    </main>
  );
}
```

- [ ] **Step 4: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Screenshot de verificação**

```bash
npm run dev -- --port 3100 &
timeout 30 bash -c 'until curl -sf http://localhost:3100 >/dev/null; do sleep 1; done'
node scripts/screenshot.mjs http://localhost:3100/pagamento/sucesso screenshots/pagamento-sucesso.png light
node scripts/screenshot.mjs http://localhost:3100/pagamento/pendente screenshots/pagamento-pendente.png light
node scripts/screenshot.mjs http://localhost:3100/pagamento/recusado screenshots/pagamento-recusado.png light
lsof -ti:3100 -sTCP:LISTEN | xargs -r kill
```

Expected: ícone circular colorido (sucesso=verde, pendente=amarelo, recusado=vermelho) + texto
+ botão do design system em cada página.

- [ ] **Step 6: Commit**

```bash
git add app/pagamento
git commit -m "feat(design): redesenha páginas de status de pagamento"
```

---

## Task 16: Verificação final

**Files:**
- Nenhum arquivo novo — task de verificação.

**Interfaces:**
- Consumes: todas as tasks anteriores.

- [ ] **Step 1: Rodar toda a suíte de testes**

Run: `npm run test`
Expected: `8 passed` — sem regressão na lógica existente (este plano não toca em Server
Actions, Zod, ou chamadas Supabase).

- [ ] **Step 2: Verificar build de produção**

Run: `npx tsc --noEmit && npm run build`
Expected: build concluído sem erros, todas as rotas listadas (`/`, `/login`, `/checkout`,
`/definir-senha`, `/pagamento/sucesso`, `/pagamento/pendente`, `/pagamento/recusado`, além das
rotas de auth/dashboard/webhook já existentes).

- [ ] **Step 3: Sweep completo de screenshots (light e dark)**

```bash
npm run dev -- --port 3100 &
timeout 30 bash -c 'until curl -sf http://localhost:3100 >/dev/null; do sleep 1; done'
for path in "" "/login" "/checkout" "/definir-senha" "/pagamento/sucesso" "/pagamento/pendente" "/pagamento/recusado"; do
  name=$(echo "$path" | tr '/' '-')
  name=${name:-home}
  node scripts/screenshot.mjs "http://localhost:3100$path" "screenshots/final-${name}-light.png" light
  node scripts/screenshot.mjs "http://localhost:3100$path" "screenshots/final-${name}-dark.png" dark
done
lsof -ti:3100 -sTCP:LISTEN | xargs -r kill
```

Expected: 14 screenshots (7 páginas × 2 modos). Revise cada um contra a seção 2 da spec
(`docs/superpowers/specs/2026-08-10-faturio-plano3-design.md`) — cor primária Jade aplicada,
radius correto, sem vestígio do placeholder do Next.js ou do formulário cru original. Se
Playwright não estiver disponível neste ambiente, faça essa revisão manualmente no navegador.

Adicione uma captura em viewport estreita da landing pra confirmar o menu hamburguer da Navbar
(Task 5):

```bash
npm run dev -- --port 3100 &
timeout 30 bash -c 'until curl -sf http://localhost:3100 >/dev/null; do sleep 1; done'
node scripts/screenshot.mjs http://localhost:3100 screenshots/final-mobile-nav.png light 390
lsof -ti:3100 -sTCP:LISTEN | xargs -r kill
```

Expected: nesta largura, os links da navbar somem e o ícone de menu (hamburguer) aparece no
lugar.

- [ ] **Step 4: Conferir a spec seção a seção**

Releia `docs/superpowers/specs/2026-08-10-faturio-plano3-design.md` e confirme visualmente:
seção 5 (todas as seções da landing presentes: Navbar, Hero, Controle, Funcionalidades, Como
funciona com os 4 showcases, Preço, FAQ, Footer), seção 6 (as 6 telas redesenhadas), seção 7
(estados de loading/erro usando os componentes do design system).

- [ ] **Step 5: Commit final (se houver ajustes)**

Se a revisão da Step 4 encontrar algo fora da spec, corrija e commite antes de finalizar. Se
tudo already estiver conforme, esta task não gera commit próprio — é só verificação.
