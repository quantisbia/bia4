/**
 * BIA · Manual · Capítulo 0 — Primeiros Passos
 * Login, dashboard, navegação, créditos. Para usuário 100% novo.
 */

"use client"

import {
  Rocket, KeyRound, LayoutDashboard, Coins, Compass,
  Sparkles, Map, Smartphone, Settings as SettingsIcon, ShieldCheck,
  CheckCircle2, AlertTriangle, GitBranch,
} from "lucide-react"
import { Box2, StepCard, MiniCard, ProTip, Pitfall, ChapterCover, WhereIs, FaqItem } from "./_components"

export function ChapterGettingStarted() {
  return (
    <article className="space-y-6">
      <ChapterCover
        number={0}
        badge="COMECE AQUI"
        title="Primeiros Passos"
        icon={Rocket}
        gradient="from-cyan-500/15 to-blue-500/15 border-cyan-500/20"
        lead={
          <>
            Bem-vindo à <strong className="text-white">BIA Biofabrication</strong>. Em 5 minutos você
            aprende a entrar na plataforma, entender o painel, navegar entre módulos e gastar
            seus créditos sem desperdício. <em>Sem jargão científico</em> — só o essencial para começar.
          </>
        }
        readMin={5}
      />

      <Box2 icon={KeyRound} title="1. Entrando na plataforma" tone="info">
        <p className="mb-2">
          Acesse <code className="text-cyan-300 bg-black/40 px-1.5 py-0.5 rounded">https://bia.quantis.bio</code> e
          clique em <strong className="text-white">Entrar</strong>. Você pode usar:
        </p>
        <ul className="space-y-1 list-disc list-inside text-[13px]">
          <li><strong>Google</strong> — login com 1 clique (mais rápido)</li>
          <li><strong>E-mail + senha</strong> — cadastre na tela de registro</li>
        </ul>
        <ProTip>
          Esqueceu a senha? Na tela de login → <em>Esqueci minha senha</em>. Um link de redefinição
          chega no seu e-mail em até 2 minutos. Confira a caixa de spam.
        </ProTip>
      </Box2>

      <Box2 icon={LayoutDashboard} title="2. Conhecendo o painel principal" tone="default">
        <p className="mb-3">
          Após o login você cai na <strong className="text-white">Visão Geral</strong> (Dashboard).
          Ela mostra três coisas que importam todo dia:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
          <MiniCard
            title="Cabeçalho"
            items={[
              "Seu nome + plano (FREE, PRO, ACADEMY…)",
              "Saldo de créditos disponível",
              "Botão Comprar créditos",
            ]}
          />
          <MiniCard
            title="Ações rápidas"
            items={[
              "8 cards para os módulos mais usados",
              "Pipeline, Bioimpressão, Organoide",
              "Protocolos, Chat IA, Conhecimento",
            ]}
          />
          <MiniCard
            title="Atividade recente"
            items={[
              "Últimas formulações geradas",
              "Histórico de gastos de crédito",
              "Status dos projetos abertos",
            ]}
          />
        </div>
        <ScreenSpotInline>
          O <strong>menu lateral esquerdo</strong> tem todos os 15 módulos da plataforma. No celular,
          ele vira uma barra inferior fixa com os 5 principais.
        </ScreenSpotInline>
      </Box2>

      <Box2 icon={Compass} title="3. O menu lateral — sua bússola" tone="cyan">
        <p className="mb-3">
          A barra à esquerda agrupa os módulos por <strong className="text-white">fase do trabalho</strong>:
        </p>
        <div className="space-y-1.5 text-[12px]">
          <NavRow label="Visão Geral"          path="/dashboard"                  what="Resumo + atalhos" />
          <NavRow label="Roteiro Profissional" path="/dashboard/roadmap"          what="Planejamento de 10 fases" />
          <NavRow label="Pipeline"             path="/dashboard/pipeline"         what="Seus projetos científicos" />
          <NavRow label="Formulador Pro"       path="/dashboard/formulator-pro"   what="Combinar biomateriais (IA)" />
          <NavRow label="Bioimpressão"         path="/dashboard/bioprint"         what="Modelo → Tinta → Fatiar → Imprimir" />
          <NavRow label="Organoid Builder"     path="/dashboard/organoids"        what="Desenhar organoides 3D" />
          <NavRow label="Protocolos GLP/GMP"   path="/dashboard/protocols"        what="Protocolos validados" />
          <NavRow label="Protocolo Total"      path="/dashboard/protocol-total"   what="Documento integrado do projeto" />
          <NavRow label="Manual do Usuário"    path="/dashboard/manual"           what="Você está aqui ✨" />
          <NavRow label="Motor de Conhecimento" path="/dashboard/knowledge"       what="120 artigos + 100 patentes" />
          <NavRow label="Chat IA"              path="/dashboard/chat"             what="Dúvidas em linguagem natural" />
          <NavRow label="Notebook"             path="/dashboard/notebook"         what="Caderno eletrônico de laboratório" />
          <NavRow label="Ferramentas"          path="/dashboard/tools"            what="Comparador, custos, exportar PDF" />
          <NavRow label="Créditos"             path="/dashboard/billing"          what="Histórico e compra" />
          <NavRow label="Configurações"        path="/dashboard/settings"         what="Perfil, senha, preferências" />
        </div>
      </Box2>

      <Box2 icon={Coins} title="4. Como funcionam os créditos" tone="amber">
        <p className="mb-3">
          A BIA usa um sistema de <strong className="text-white">créditos pré-pagos</strong>: cada análise
          via IA, geração de G-code ou criação de dossiê consome um número fixo de créditos. Você sempre
          vê <em>quanto vai gastar</em> antes de confirmar.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          <div className="rounded-lg bg-black/30 border border-white/10 p-3 text-[11px]">
            <div className="text-[10px] font-bold text-amber-300 mb-1.5 uppercase">Operações típicas</div>
            <ul className="space-y-1">
              <li className="flex justify-between"><span>Formulador Bio (clássico)</span><span className="text-amber-200 font-mono">2 créditos</span></li>
              <li className="flex justify-between"><span>Formulador Pro (básico)</span><span className="text-amber-200 font-mono">10 créditos</span></li>
              <li className="flex justify-between"><span>Formulador Pro (com alternativas)</span><span className="text-amber-200 font-mono">15 créditos</span></li>
              <li className="flex justify-between"><span>Geração de G-code</span><span className="text-amber-200 font-mono">6 créditos</span></li>
              <li className="flex justify-between"><span>Modelo 3D (STL paramétrico)</span><span className="text-amber-200 font-mono">3 créditos</span></li>
              <li className="flex justify-between"><span>Chat IA (por mensagem)</span><span className="text-amber-200 font-mono">1 crédito</span></li>
              <li className="flex justify-between"><span>Protocolo GLP/GMP</span><span className="text-amber-200 font-mono">8 créditos</span></li>
              <li className="flex justify-between"><span>Análise / Dossiê regulatório</span><span className="text-amber-200 font-mono">12 créditos</span></li>
            </ul>
          </div>
          <div className="rounded-lg bg-black/30 border border-white/10 p-3 text-[11px]">
            <div className="text-[10px] font-bold text-emerald-300 mb-1.5 uppercase">O que NÃO gasta crédito</div>
            <ul className="space-y-1">
              <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" /> Navegar o catálogo de biomateriais</li>
              <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" /> Ler artigos do Motor de Conhecimento</li>
              <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" /> Visualizar G-code em 3D</li>
              <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" /> Controlar a bioimpressora (USB)</li>
              <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" /> Salvar protocolos no Notebook</li>
              <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" /> Exportar PDF, JSON, Markdown</li>
              <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" /> Manual do Usuário (você está aqui)</li>
            </ul>
          </div>
        </div>

        <ProTip>
          O plano <strong className="text-amber-200">ACADEMY</strong> dá créditos mensais grátis para
          estudantes/pesquisadores com e-mail institucional. Veja em{" "}
          <WhereIs path="/dashboard/billing" />.
        </ProTip>
      </Box2>

      <Box2 icon={Map} title="5. Um fluxo típico de trabalho" tone="emerald">
        <p className="mb-3">
          A maior parte dos usuários da BIA segue este caminho lógico:
        </p>
        <div className="space-y-3">
          <StepCard n={1} title="Plano (Roteiro)" icon={Map} accent="cyan">
            Abra o <strong>Roteiro Profissional</strong> e use o template da sua aplicação
            (osso, gengiva, vaso, organoide…). Ele divide o projeto em 10 fases com
            entregáveis claros.
          </StepCard>
          <StepCard n={2} title="Formule a biotinta" icon={Sparkles} accent="blue">
            Vá ao <strong>Formulador Pro</strong>, escolha 2-8 biomateriais, defina o objetivo
            clínico, gere a formulação. Exporte como JSON para o próximo passo.
          </StepCard>
          <StepCard n={3} title="Desenhe o modelo 3D" icon={GitBranch} accent="purple">
            Em <strong>Bioimpressão → Modelo</strong>, escolha uma geometria paramétrica
            (membrana, scaffold, vaso…) <em>ou</em> faça upload do seu STL.
          </StepCard>
          <StepCard n={4} title="Fatie e imprima" icon={Rocket} accent="amber">
            <strong>Bioimpressão → Fatiar</strong> gera o G-code. <strong>→ Executar</strong> conecta
            via USB e imprime. Tudo isso sem sair da plataforma.
          </StepCard>
          <StepCard n={5} title="Documente" icon={ShieldCheck} accent="emerald">
            <strong>Notebook</strong> registra o experimento. <strong>Protocolo Total</strong> gera
            o documento integrado para apresentação ou regulatório.
          </StepCard>
        </div>
      </Box2>

      <Box2 icon={Smartphone} title="6. Usando no celular" tone="default">
        <p className="mb-2">
          A BIA é <strong className="text-white">100% responsiva</strong>. No celular você tem:
        </p>
        <ul className="space-y-1 list-disc list-inside text-[13px]">
          <li>Barra inferior com 5 atalhos principais (Visão, Bioimpressão, Pipeline, Chat, Manual)</li>
          <li>Sidebar completa via botão de menu (☰ no topo esquerdo)</li>
          <li>Joystick 3D otimizado para toque (botões grandes, anti-toque-duplo)</li>
        </ul>
        <Pitfall>
          A conexão USB com bioimpressora <strong>não funciona no celular</strong> (limitação do
          Web Serial API). Use um Chromebook, notebook ou desktop com Chrome 89+ ou Edge 89+ para
          imprimir de verdade. No celular, use o modo <em>MOCK</em> para simular.
        </Pitfall>
      </Box2>

      <Box2 icon={SettingsIcon} title="7. Configurando seu perfil" tone="purple">
        <p className="mb-2">
          Antes de mergulhar no trabalho, ajuste em <WhereIs path="/dashboard/settings" />:
        </p>
        <ul className="space-y-1 list-disc list-inside text-[13px]">
          <li><strong className="text-white">Nome e e-mail</strong> — aparecem nos protocolos exportados</li>
          <li><strong className="text-white">Idioma</strong> — Português (BR) ou Inglês</li>
          <li><strong className="text-white">Tema</strong> — Escuro (padrão) ou Claro</li>
          <li><strong className="text-white">Notificações por e-mail</strong> — Resumos semanais e alertas de crédito baixo</li>
          <li><strong className="text-white">Senha</strong> — Recomendamos trocar a cada 90 dias</li>
        </ul>
      </Box2>

      <Box2 icon={AlertTriangle} title="Perguntas frequentes (FAQ)" tone="warn">
        <div className="space-y-2.5">
          <FaqItem q="Meu crédito sumiu — para onde foi?">
            Toda movimentação é registrada em <WhereIs path="/dashboard/billing" /> →{" "}
            <em>Histórico</em>. Filtros por feature e data ajudam a rastrear. Em caso de erro
            de cobrança (raríssimo), nosso suporte estorna em até 24h.
          </FaqItem>
          <FaqItem q="Posso usar a BIA offline?">
            Não — a maior parte das análises usa modelos de IA na nuvem. O que <em>funciona offline</em>{" "}
            depois de carregada: visualização 3D do G-code, controle USB da bioimpressora, leitura
            de protocolos já salvos.
          </FaqItem>
          <FaqItem q="Esqueci o que cada módulo faz. Tem atalho?">
            Sim — passe o mouse em cima do nome no menu lateral; aparece uma tooltip com a
            descrição de 1 linha. E você sempre pode voltar aqui ao Manual.
          </FaqItem>
          <FaqItem q="Os dados são privados?">
            Suas formulações, protocolos e G-code são privados ao seu usuário. Não treinamos
            modelos de IA com o seu conteúdo. Em planos ENTERPRISE há também workspaces
            multi-usuário com permissões granulares.
          </FaqItem>
        </div>
      </Box2>
    </article>
  )
}

// ─── helpers locais ────────────────────────────────────────────────────
function NavRow({ label, path, what }: { label: string; path: string; what: string }) {
  return (
    <div className="grid grid-cols-[1.1fr,1.3fr,1fr] gap-2 items-center px-2 py-1 rounded hover:bg-white/[0.03] transition-colors">
      <span className="text-white font-semibold">{label}</span>
      <code className="text-[10px] text-cyan-300 font-mono">{path}</code>
      <span className="text-[11px] text-gray-400">{what}</span>
    </div>
  )
}

function ScreenSpotInline({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 text-[12px] text-cyan-100/90 leading-relaxed border-l-2 border-cyan-500/40 pl-3 italic">
      {children}
    </div>
  )
}
