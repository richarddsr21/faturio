import Link from "next/link";
import { Alert } from "@/components/ui/alert";

export const metadata = {
  title: "Política de Privacidade — Faturio",
};

export default function PoliticaDePrivacidadePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16">
      <div>
        <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
          Faturio
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
          Política de Privacidade
        </h1>
      </div>

      <Alert>
        Este texto é um modelo inicial e não constitui aconselhamento jurídico. Requer revisão
        profissional antes de publicação.
      </Alert>

      <div className="flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">1. Dados coletados</h2>
          <p>
            Coletamos nome, e-mail e dados de pagamento no momento da compra, e os dados que você
            cadastra ao usar a plataforma: produtos, preços, custos, estoque, vendas, metas e
            configurações financeiras do seu negócio.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">2. Finalidade do tratamento</h2>
          <p>
            Usamos seus dados para viabilizar o funcionamento da plataforma (autenticação,
            cálculos de precificação, estoque, vendas e metas), processar o pagamento, enviar
            comunicações essenciais (confirmação de acesso, recuperação de senha) e dar suporte
            quando solicitado.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">3. Isolamento entre clientes</h2>
          <p>
            Cada conta tem acesso exclusivamente aos seus próprios dados. O isolamento é garantido
            tanto na aplicação quanto no banco de dados (Row Level Security), impedindo que um
            cliente acesse, leia ou modifique dados de outro.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">4. Compartilhamento com terceiros</h2>
          <p>
            Compartilhamos dados estritamente necessários com processadores de pagamento e
            provedores de infraestrutura (banco de dados, autenticação, e-mail transacional) que
            operam em nosso nome, sob obrigações de confidencialidade.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">5. Direitos do titular</h2>
          <p>
            Você pode solicitar a qualquer momento a confirmação, o acesso, a correção ou a
            exclusão dos seus dados pessoais, nos termos da Lei Geral de Proteção de Dados
            (LGPD).
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">6. Exclusão de conta</h2>
          <p>
            Para solicitar a exclusão da sua conta e dos seus dados, entre em contato com nosso
            suporte por e-mail. Um fluxo de exclusão self-service poderá ser disponibilizado
            futuramente.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">7. Alterações desta política</h2>
          <p>
            Podemos atualizar esta Política de Privacidade periodicamente. Alterações relevantes
            serão comunicadas por e-mail ou dentro da plataforma.
          </p>
        </section>
      </div>
    </main>
  );
}
