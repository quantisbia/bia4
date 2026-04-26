/**
 * BIA v4 — Política de Privacidade (LGPD)
 */
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export const metadata = {
  title: "Política de Privacidade — BIA v4",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/auth/register" className="inline-flex items-center gap-1 text-violet-400 hover:underline mb-6 text-sm">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </Link>
        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-zinc-500 text-sm mb-8">Conforme Lei Geral de Proteção de Dados (Lei 13.709/2018). Última atualização: abril 2026</p>

        <div className="prose prose-invert max-w-none space-y-4 text-zinc-300">
          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">1. Controlador</h2>
            <p>Quantis Biotechnology — responsável pelo tratamento de dados pessoais coletados pela BIA v4.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">2. Dados Coletados</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Cadastro:</strong> nome, e-mail, senha (hash bcrypt), organização.</li>
              <li><strong>Uso da plataforma:</strong> histórico de chats, protocolos gerados, notebooks, formulações, consumo de créditos.</li>
              <li><strong>Técnicos:</strong> IP, user-agent, logs de auditoria para fins de segurança.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">3. Finalidades</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Prestação do serviço de biofabricação assistida por IA.</li>
              <li>Cobrança e controle de créditos.</li>
              <li>Segurança, prevenção a fraudes e cumprimento de obrigações legais.</li>
              <li>Melhorias na plataforma (dados sempre agregados e anonimizados).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">4. Compartilhamento</h2>
            <p>Os prompts enviados ao chat são processados pelo Google Gemini (Vertex AI), conforme os termos do Google Cloud. Não vendemos dados pessoais a terceiros. Compartilhamos apenas quando exigido por ordem judicial ou autoridade competente.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">5. Direitos do Titular (LGPD art. 18)</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Confirmação e acesso aos seus dados.</li>
              <li>Correção de dados incompletos ou desatualizados.</li>
              <li>Anonimização, bloqueio ou eliminação de dados.</li>
              <li>Portabilidade dos dados.</li>
              <li>Revogação do consentimento.</li>
            </ul>
            <p className="mt-2">Para exercer esses direitos: <a href="mailto:privacidade@quantis.bio" className="text-violet-400 hover:underline">privacidade@quantis.bio</a></p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">6. Retenção</h2>
            <p>Os dados são mantidos enquanto a conta estiver ativa. Após a exclusão, mantemos apenas dados necessários para cumprir obrigações legais (fiscais, contábeis) pelo prazo exigido pela legislação aplicável.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">7. Segurança</h2>
            <p>Utilizamos criptografia em trânsito (HTTPS/TLS 1.3), senhas com bcrypt (12 rounds) e controle de acesso baseado em papéis (RBAC). Logs de auditoria são mantidos para detecção de incidentes.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-2">8. Contato DPO</h2>
            <p><a href="mailto:dpo@quantis.bio" className="text-violet-400 hover:underline">dpo@quantis.bio</a></p>
          </section>
        </div>
      </div>
    </div>
  )
}
