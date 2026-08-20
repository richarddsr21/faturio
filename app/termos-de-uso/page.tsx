import Link from "next/link";
import { Alert } from "@/components/ui/alert";

export const metadata = {
  title: "Termos de Uso — Faturio",
};

export default function TermosDeUsoPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16">
      <div>
        <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
          Faturio
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">Termos de Uso</h1>
      </div>

      <Alert>
        Este texto é um modelo inicial e não constitui aconselhamento jurídico. Requer revisão
        profissional antes de publicação.
      </Alert>

      <div className="flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">1. Aceitação dos termos</h2>
          <p>
            Ao adquirir e utilizar o Faturio, você concorda com estes Termos de Uso. Caso não
            concorde, não utilize a plataforma.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">2. Descrição do serviço</h2>
          <p>
            O Faturio é uma plataforma de precificação, controle de estoque, registro de vendas e
            acompanhamento de metas de faturamento, oferecida mediante pagamento único de acesso
            vitalício.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">3. Conta e acesso</h2>
          <p>
            O acesso é pessoal e intransferível, vinculado ao e-mail informado na compra. Você é
            responsável por manter sua senha em sigilo e por toda atividade realizada na sua
            conta.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">4. Isolamento entre clientes</h2>
          <p>
            Os dados que você cadastra no Faturio (produtos, estoque, vendas, metas e demais
            informações) pertencem exclusivamente à sua conta e são isolados dos dados de outros
            clientes, tanto na aplicação quanto no banco de dados.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">5. Pagamento e vitaliciedade do acesso</h2>
          <p>
            O acesso é concedido mediante pagamento único e não possui cobrança recorrente. O
            acesso pode ser suspenso em caso de uso indevido da plataforma ou violação destes
            termos.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">6. Cancelamento e exclusão de conta</h2>
          <p>
            Para solicitar o cancelamento e a exclusão da sua conta e dos seus dados, entre em
            contato com nosso suporte pelo e-mail{" "}
            <a href="mailto:richarddsr21@gmail.com" className="underline">
              richarddsr21@gmail.com
            </a>
            . O fluxo self-service de exclusão poderá ser disponibilizado futuramente.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">7. Alterações destes termos</h2>
          <p>
            Podemos atualizar estes Termos de Uso periodicamente. Alterações relevantes serão
            comunicadas por e-mail ou dentro da plataforma.
          </p>
        </section>
      </div>
    </main>
  );
}
