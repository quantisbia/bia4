/**
 * BIA v4 — Termos de Uso
 */
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export const metadata = {
  title: "Termos de Uso — BIA v4",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/auth/register" className="inline-flex items-center gap-1 text-violet-400 hover:underline mb-6 text-sm">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </Link>
        <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-zinc-500 text-sm mb-8">Última atualização: abril 2026</p>

        <div className="prose prose-invert max-w-none space-y-4 text-zinc-300">
          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">1. Aceitação</h2>
            <p>Ao utilizar a BIA v4 — Biofabrication Intelligence Agent — você concorda com estes termos. Se não concordar, não utilize a plataforma.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">2. Natureza do Serviço</h2>
            <p>A BIA v4 é uma plataforma de inteligência artificial voltada para biofabricação, bioimpressão 3D, formulação de biomateriais e apoio regulatório. Os conteúdos gerados são ferramentas de apoio técnico-científico e <strong>não substituem</strong> julgamento clínico especializado, validação laboratorial ou aprovação regulatória.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">3. Uso Responsável</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Todo protocolo, formulação ou G-code gerado pela BIA deve ser validado por profissional habilitado antes de qualquer uso pré-clínico ou clínico.</li>
              <li>É proibido o uso para fins ilegais, bioterrorismo, produção de armas biológicas ou qualquer atividade que viole leis brasileiras ou internacionais.</li>
              <li>O usuário é responsável pela biossegurança de seus próprios experimentos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">4. Propriedade Intelectual</h2>
            <p>O código-fonte, marcas, logotipos e sistema de créditos pertencem à Quantis Biotechnology. Os conteúdos gerados pelo usuário (protocolos, formulações, notebooks) são propriedade do próprio usuário, respeitando as limitações de responsabilidade.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">5. Créditos e Cobrança</h2>
            <p>A plataforma opera com sistema de créditos. Os planos e valores estão descritos na página de Billing. A Quantis Biotechnology se reserva o direito de ajustar preços mediante aviso prévio de 30 dias.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">6. Limitação de Responsabilidade</h2>
            <p>A BIA v4 é fornecida &quot;como está&quot;. A Quantis Biotechnology não se responsabiliza por danos diretos ou indiretos decorrentes do uso das recomendações geradas pela IA sem validação apropriada.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">7. Contato</h2>
            <p>Dúvidas: <a href="mailto:contato@quantis.bio" className="text-violet-400 hover:underline">contato@quantis.bio</a></p>
          </section>
        </div>
      </div>
    </div>
  )
}
