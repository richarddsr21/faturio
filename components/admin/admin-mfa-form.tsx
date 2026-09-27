"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Setup =
  | { mode: "loading" }
  | { mode: "enroll"; factorId: string; qrCode: string; secret: string }
  | { mode: "verify"; factorId: string }
  | { mode: "error"; message: string };

const FRIENDLY_NAME = "Faturio Admin";

/**
 * 2FA da conta admin via TOTP nativo do Supabase Auth. Primeiro acesso: cadastra o app
 * autenticador (QR code) e confirma com um código. Acessos seguintes: só pede o código.
 * O MFA roda no client da sessão, então o cookie já sai com aal2 e o servidor revalida.
 */
export function AdminMfaForm() {
  const router = useRouter();
  const started = useRef(false);
  const [setup, setSetup] = useState<Setup>({ mode: "loading" });
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Evita dois cadastros simultâneos no double-invoke de efeitos do StrictMode.
    if (started.current) return;
    started.current = true;

    async function prepare() {
      const supabase = createClient();
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) {
        setSetup({ mode: "error", message: "Não foi possível carregar o 2FA. Recarregue a página." });
        return;
      }

      const verified = factors.totp[0];
      if (verified) {
        setSetup({ mode: "verify", factorId: verified.id });
        return;
      }

      // Cadastros abandonados no meio (fator não verificado) bloqueariam um novo com o
      // mesmo nome — remove antes de começar de novo.
      for (const factor of factors.all) {
        if (factor.factor_type === "totp" && factor.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: FRIENDLY_NAME,
      });
      if (enrollError) {
        setSetup({
          mode: "error",
          message:
            "Não foi possível iniciar o cadastro do 2FA. Confirme se o MFA (TOTP) está habilitado no Supabase.",
        });
        return;
      }
      setSetup({
        mode: "enroll",
        factorId: enrolled.id,
        qrCode: enrolled.totp.qr_code,
        secret: enrolled.totp.secret,
      });
    }

    void prepare();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (setup.mode !== "enroll" && setup.mode !== "verify") return;

    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: setup.factorId,
      code: code.trim(),
    });

    if (verifyError) {
      setSubmitting(false);
      setCode("");
      setError("Código inválido ou expirado. Confira o app e tente de novo.");
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <CardTitle>
          {setup.mode === "enroll" ? "Ative a verificação em duas etapas" : "Verificação em duas etapas"}
        </CardTitle>
        <CardDescription>
          {setup.mode === "enroll"
            ? "A área admin exige um código do seu app autenticador (Google Authenticator, Microsoft Authenticator, 1Password, Authy...)."
            : "Digite o código de 6 dígitos do seu app autenticador para entrar na área admin."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {setup.mode === "loading" && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {setup.mode === "error" && <Alert variant="destructive">{setup.message}</Alert>}

        {setup.mode === "enroll" && (
          <div className="flex flex-col items-center gap-3">
            <p className="self-start text-sm text-foreground">
              1. Escaneie o QR code com o app autenticador:
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL SVG gerado pelo Supabase */}
            <img
              src={setup.qrCode}
              alt="QR code para cadastrar o Faturio no app autenticador"
              className="h-48 w-48 rounded-[10px] border border-border bg-white p-2"
            />
            <p className="self-start text-sm text-muted-foreground">
              Sem câmera? Digite esta chave no app:
            </p>
            <code className="w-full break-all rounded-[10px] bg-muted px-3 py-2 text-center text-sm tracking-wider text-foreground">
              {setup.secret}
            </code>
            <p className="self-start text-sm text-foreground">2. Digite o código que aparecer no app:</p>
          </div>
        )}

        {(setup.mode === "enroll" || setup.mode === "verify") && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="000000"
              aria-label="Código de 6 dígitos"
              invalid={error !== null}
              className="text-center text-lg tabular-nums tracking-[0.5em]"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting || code.length !== 6}>
              {submitting ? "Verificando..." : setup.mode === "enroll" ? "Ativar e entrar" : "Entrar"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
