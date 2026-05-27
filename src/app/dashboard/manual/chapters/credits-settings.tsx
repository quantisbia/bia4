/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · Manual — Capítulo 14: Créditos & Configurações
 *  ───────────────────────────────────────────────────────────────────────
 *  Como funcionam os créditos, planos, billing e configurações da conta.
 * ═══════════════════════════════════════════════════════════════════════
 */

"use client"

import React from "react"
import {
  CreditCard, Settings, User, Bell, Lock, Globe, Palette,
  Receipt, TrendingUp, ChevronRight, Sparkles, Coins,
} from "lucide-react"
import { Box2, StepCard, MiniCard, ChapterCover, ProTip, Pitfall, FaqItem, ScreenSpot } from "./_components"

export function CreditsSettings() {
  return (
    <div className="space-y-8">
      <ChapterCover
        number={14}
        badge="ACCOUNT"
        title="Créditos & Configurações"
        icon={CreditCard}
        gradient="from-emerald-500/15 to-teal-500/15 border-emerald-500/20"
        lead={<>
          Aqui você gerencia o <strong className="text-white">consumo de créditos</strong>,
          assinatura, faturas, segurança da conta, notificações e preferências de interface.
          Tudo num só lugar. Os créditos são a "moeda" da plataforma — cada operação de IA
          consome uma quantia específica.
        </>}
        readMin={6}
        cost="Configurações: gratuitas · Recargas a partir de R$ 49"
      />

      {/* ─── Como funcionam os créditos ──────────────────────────── */}
      <Box2 icon={Coins} title="Como os créditos funcionam" tone="emerald">
        <p className="mb-3">
          Cada ação que usa IA, geração de documento, simulação ou impressão custa créditos.
          Ações de visualização e configuração são gratuitas. O saldo aparece no topo do
          dashboard em todas as páginas.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <MiniCard title="Bioimpressão" items={[
            "Modelo paramétrico: 2 créd",
            "Biotinta nova: 5 créd",
            "G-code: 6 créd",
            "Análise de impressão: 4 créd",
          ]} />
          <MiniCard title="Análise & Conhecimento" items={[
            "Busca PubMed: 2 créd",
            "Dossiê 30 papers: 15 créd",
            "Análise imagem: 3-12 créd",
            "Estatística: 2 créd",
          ]} />
          <MiniCard title="Organoides & Protocolos" items={[
            "Organoide: 8 créd",
            "Protocolo GLP: 10 créd",
            "Protocolo GMP: 25 créd",
            "Protocolo Total: 50 créd",
          ]} />
          <MiniCard title="IA Conversacional" items={[
            "Chat (texto): 1 créd/msg",
            "Chat (imagem): 3 créd/msg",
            "Chat com PDF: 2 créd/msg",
            "Resumo de paper: 2 créd",
          ]} />
        </div>
        <ProTip>
          Quase tudo tem versão "preview" gratuita. Antes de pagar pelo G-code completo,
          veja o preview do fatiamento (grátis). Antes do dossiê de 30 papers, faça a busca (2 créd).
        </ProTip>
      </Box2>

      {/* ─── Planos ──────────────────────────────────────────────── */}
      <Box2 icon={TrendingUp} title="Planos disponíveis" tone="info">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="text-base font-bold text-white mb-1">Free</div>
            <div className="text-2xl font-bold text-emerald-300 mb-2">R$ 0/mês</div>
            <ul className="text-xs space-y-1 text-gray-400">
              <li>• 50 créditos/mês</li>
              <li>• Acesso a todos os módulos</li>
              <li>• Notebook ilimitado</li>
              <li>• Sem suporte prioritário</li>
            </ul>
          </div>
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/[0.05] p-4 ring-1 ring-blue-500/20">
            <div className="text-base font-bold text-blue-200 mb-1">Pro</div>
            <div className="text-2xl font-bold text-blue-300 mb-2">R$ 199/mês</div>
            <ul className="text-xs space-y-1 text-gray-300">
              <li>• 1.000 créditos/mês</li>
              <li>• Suporte por chat</li>
              <li>• Exportação ilimitada</li>
              <li>• Times de até 5 pessoas</li>
            </ul>
          </div>
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/[0.05] p-4 ring-1 ring-purple-500/20">
            <div className="text-base font-bold text-purple-200 mb-1">Enterprise</div>
            <div className="text-2xl font-bold text-purple-300 mb-2">Custom</div>
            <ul className="text-xs space-y-1 text-gray-300">
              <li>• Créditos ilimitados</li>
              <li>• Suporte 24/7</li>
              <li>• SLA garantido</li>
              <li>• On-premise opcional</li>
            </ul>
          </div>
        </div>
        <ProTip>
          Créditos não usados <strong>acumulam</strong> até 3× o seu plano mensal. Acima disso, expiram.
        </ProTip>
      </Box2>

      {/* ─── Como recarregar ─────────────────────────────────────── */}
      <h3 className="text-xl font-bold text-white pt-2">Recarregar créditos</h3>
      <div className="grid grid-cols-1 gap-4">
        <StepCard n={1} title="Acesse Billing" icon={CreditCard} accent="emerald">
          <p>
            Menu inferior esquerdo → <strong>Billing</strong>. Você vê o saldo atual, histórico
            de consumo e opções de recarga.
          </p>
          <ScreenSpot>
            URL direta: <code>/dashboard/billing</code>
          </ScreenSpot>
        </StepCard>

        <StepCard n={2} title="Escolha o pacote" icon={Coins} accent="blue">
          <p>Pacotes avulsos (não-assinantes pagam):</p>
          <ul className="space-y-1 mt-2 ml-2 text-xs">
            <li>• <strong>100 créditos</strong> — R$ 49</li>
            <li>• <strong>500 créditos</strong> — R$ 199 (15% desconto)</li>
            <li>• <strong>2.000 créditos</strong> — R$ 699 (25% desconto)</li>
            <li>• <strong>10.000 créditos</strong> — R$ 2.499 (37% desconto)</li>
          </ul>
        </StepCard>

        <StepCard n={3} title="Pagamento" icon={Receipt} accent="purple">
          <p>Métodos aceitos:</p>
          <ul className="space-y-1 mt-2 ml-2 text-xs">
            <li>• Cartão de crédito (Visa, Master, Amex, Elo)</li>
            <li>• Pix (libera em até 5 min)</li>
            <li>• Boleto (libera em 1–2 dias úteis)</li>
            <li>• PIX recorrente (assinaturas Pro)</li>
          </ul>
          <Pitfall>
            Boletos vencem em 3 dias. Se não pagar no prazo, o pedido cancela e você precisa refazer.
          </Pitfall>
        </StepCard>

        <StepCard n={4} title="Nota fiscal" icon={Receipt} accent="amber">
          <p>
            Toda recarga gera NF-e automaticamente em até 24h, enviada por email.
            Para emissão em CNPJ, configure os dados em <strong>Configurações → Empresa</strong>
            <em> antes</em> da compra.
          </p>
        </StepCard>
      </div>

      {/* ─── Configurações ───────────────────────────────────────── */}
      <Box2 icon={Settings} title="Configurações da conta" tone="default">
        <p className="mb-3">Em <code className="text-cyan-300">/dashboard/settings</code> você ajusta:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <MiniCard title="Perfil" items={[
            "Nome, foto, ORCID",
            "Instituição / laboratório",
            "Área de pesquisa",
            "Bio pública (opcional)",
          ]} />
          <MiniCard title="Segurança" items={[
            "Senha (mínimo 12 chars)",
            "2FA (Authy / Google Auth)",
            "Sessões ativas",
            "Logs de login",
          ]} />
          <MiniCard title="Notificações" items={[
            "Email (impressão pronta, créditos baixos)",
            "Push (navegador)",
            "Webhooks (avançado)",
            "Resumo semanal",
          ]} />
          <MiniCard title="Aparência" items={[
            "Tema (dark / light)",
            "Idioma (PT/EN/ES)",
            "Unidades (SI / Imperial)",
            "Densidade da UI",
          ]} />
          <MiniCard title="Time" items={[
            "Convidar membros",
            "Permissões (admin/edit/view)",
            "Transferir projetos",
            "Auditoria",
          ]} />
          <MiniCard title="Privacidade" items={[
            "Visibilidade do perfil",
            "Compartilhamento de dados",
            "LGPD — direito ao esquecimento",
            "Exportar todos os dados",
          ]} />
        </div>
      </Box2>

      {/* ─── 2FA ─────────────────────────────────────────────────── */}
      <Box2 icon={Lock} title="Ativar autenticação em 2 fatores (2FA)" tone="warn">
        <ol className="space-y-1.5 list-decimal list-inside ml-2 text-sm">
          <li>Configurações → Segurança → "Ativar 2FA"</li>
          <li>Escaneie o QR code com Google Authenticator, Authy ou 1Password</li>
          <li>Digite o código de 6 dígitos para confirmar</li>
          <li>Salve os <strong className="text-amber-200">códigos de recuperação</strong> em local seguro</li>
        </ol>
        <Pitfall>
          Se perder o celular E os códigos de recuperação, a única opção é abrir ticket de
          suporte com documento de identidade. Pode demorar dias. <strong>Guarde os códigos.</strong>
        </Pitfall>
      </Box2>

      {/* ─── FAQ ─────────────────────────────────────────────────── */}
      <Box2 icon={Sparkles} title="Perguntas frequentes" tone="info">
        <div className="grid grid-cols-1 gap-2">
          <FaqItem q="Posso cancelar a assinatura a qualquer momento?">
            Sim — sem multa. O acesso fica ativo até o fim do ciclo já pago.
          </FaqItem>
          <FaqItem q="Existe desconto para estudantes ou pesquisadores?">
            Sim — 50% no plano Pro com comprovação de matrícula ou vínculo institucional. Solicite em "Billing → Programa Acadêmico".
          </FaqItem>
          <FaqItem q="Como excluir minha conta permanentemente?">
            Configurações → Privacidade → "Excluir conta". Você tem 30 dias para reverter; após isso os dados são deletados em conformidade com a LGPD.
          </FaqItem>
          <FaqItem q="Posso transferir créditos para outra pessoa?">
            Só dentro do mesmo time/laboratório (planos Pro e Enterprise). Entre contas separadas, não.
          </FaqItem>
          <FaqItem q="O que acontece quando os créditos acabam no meio de uma operação?">
            A operação cancela e te avisa antes de cobrar. Nenhum crédito é debitado em operação interrompida.
          </FaqItem>
        </div>
      </Box2>
    </div>
  )
}
