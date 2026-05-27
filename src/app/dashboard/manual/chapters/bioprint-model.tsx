/**
 * BIA · Manual · Capítulo — Bioimpressão · Etapa 1 · Modelo 3D
 */

"use client"

import {
  Box, Upload, Sparkles, Circle, CheckCircle2, AlertTriangle,
  Grid3X3, Bone, Heart, Layers, Atom,
} from "lucide-react"
import { Box2, StepCard, MiniCard, ProTip, Pitfall, ChapterCover, WhereIs } from "./_components"

export function ChapterBioprintModel() {
  return (
    <article className="space-y-6">
      <ChapterCover
        number={3}
        badge="ETAPA 1 DE 4"
        title="Bioimpressão · Modelo 3D"
        icon={Box}
        gradient="from-purple-500/15 to-fuchsia-500/15 border-purple-500/20"
        href="/dashboard/bioprint/model"
        hrefLabel="Abrir Modelo 3D"
        lead={
          <>
            A primeira etapa da bioimpressão é definir <strong className="text-white">a geometria</strong> que
            será impressa. Você tem 3 caminhos: <em>geometria paramétrica</em> (clica e ajusta), <em>upload
            de STL</em> (arquivo seu) ou <em>biblioteca anatômica</em> (osso, fêmur, nariz, orelha…).
          </>
        }
        readMin={7}
      />

      <Box2 icon={Sparkles} title="3 maneiras de criar o modelo" tone="info">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
          <Way
            icon={Grid3X3}
            title="Paramétrico"
            badge="rápido"
            color="purple"
            desc="Escolhe a categoria (membrana, scaffold, vaso, organoide), ajusta dimensões num formulário e gera. Em segundos."
            best="Início rápido, prototipagem, ensino"
          />
          <Way
            icon={Upload}
            title="Upload STL"
            badge="seu modelo"
            color="cyan"
            desc="Você arrasta um arquivo .stl que já desenhou no SolidWorks, Fusion 360, Blender ou recebeu de um colega."
            best="Geometrias customizadas, importação de CAD"
          />
          <Way
            icon={Bone}
            title="Biblioteca anatômica"
            badge="pré-pronto"
            color="amber"
            desc="Modelos validados de fêmur, nariz, orelha, coração, etc. Já dimensionados em escala real."
            best="Aulas, demos, validação de equipamento"
          />
        </div>
      </Box2>

      <Box2 icon={Atom} title="Geometrias paramétricas disponíveis" tone="purple">
        <p className="mb-3 text-[13px]">
          A BIA tem <strong className="text-white">5 categorias × 20+ geometrias</strong>. Cada uma
          aceita ajuste de tamanho, porosidade, densidade e altura:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Category
            icon={Layers}
            title="Membrana"
            items={["Quadrada", "Retangular", "Circular", "Hexagonal", "Com microcanais"]}
            useFor="Pele, gengiva, periósteo"
          />
          <Category
            icon={Bone}
            title="Scaffold"
            items={["Cubo poroso", "Cilindro com gradiente", "Esfera", "TPMS Gyroid", "TPMS Schwarz P", "TPMS Diamond"]}
            useFor="Osso, cartilagem, fixação"
          />
          <Category
            icon={Heart}
            title="Vascular"
            items={["Tubo único", "Tubo com bifurcação", "Y-junction", "Rede sinusoidal"]}
            useFor="Pesquisa em vascularização"
          />
          <Category
            icon={Circle}
            title="Organoide"
            items={["Esferoide simples", "Bowl culture", "Multi-well plate", "Microtubo"]}
            useFor="Cultura 3D, modelos de doença"
          />
          <Category
            icon={Bone}
            title="Anatômico"
            items={["Fêmur (mini)", "Nariz", "Orelha", "Mandíbula", "Disco intervertebral"]}
            useFor="Demos clínicas, treinamento"
          />
          <Category
            icon={Grid3X3}
            title="Teste / calibração"
            items={["Disco fidelidade bioink", "Linha única", "Quadrado contorno", "Cruz", "Cilindro 5×5"]}
            useFor="Calibrar bioimpressora e biotinta"
          />
        </div>
        <ProTip>
          As <strong>TPMS</strong> (Triply Periodic Minimal Surfaces — Gyroid, Schwarz P, Diamond)
          são as melhores para scaffolds ósseos: máxima razão superfície/volume, fluxo isotrópico,
          módulo elástico ajustável por densidade. Comece com Gyroid se estiver em dúvida.
        </ProTip>
      </Box2>

      <Box2 icon={CheckCircle2} title="Validador de mesh — antes de imprimir, valide!" tone="ok">
        <p className="mb-2">
          Todo STL que entra na BIA passa por um <strong className="text-white">validador automático</strong> que
          detecta 8 tipos de problemas:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
          <MeshIssue label="Non-manifold"  desc="Arestas com 3+ faces" />
          <MeshIssue label="Self-intersection" desc="Triângulos se cruzam" />
          <MeshIssue label="Holes"        desc="Buracos na superfície" />
          <MeshIssue label="Flipped normals" desc="Faces viradas ao avesso" />
          <MeshIssue label="Duplicate vertices" desc="Pontos repetidos" />
          <MeshIssue label="Zero-area faces" desc="Triângulos degenerados" />
          <MeshIssue label="Open edges"   desc="Bordas soltas" />
          <MeshIssue label="Disconnected" desc="Múltiplas partes" />
        </div>
        <p className="mt-3 text-[13px]">
          Cada problema vem com <strong className="text-emerald-300">contagem exata</strong> e
          <strong className="text-emerald-300"> severidade</strong> (bloqueia ou só avisa). Você pode
          baixar o relatório em JSON para corrigir no software de origem.
        </p>
        <Pitfall>
          Um STL com <strong>non-manifold severo</strong> pode imprimir errado mesmo se o slicer
          aceitar — buracos, paredes faltando ou linhas em duplicidade. Sempre corrija no Blender
          ou Meshmixer antes de prosseguir para a próxima etapa.
        </Pitfall>
      </Box2>

      <Box2 icon={Upload} title="Como fazer upload do seu STL" tone="cyan">
        <div className="space-y-3">
          <StepCard n={1} title="Arraste o arquivo" icon={Upload} accent="cyan">
            Na aba <strong>Upload STL</strong>, arraste o arquivo direto na área pontilhada ou
            clique para escolher do seu computador. Aceita <code>.stl</code> ASCII e binário.
            Tamanho máximo: 50 MB.
          </StepCard>
          <StepCard n={2} title="Validação automática" icon={CheckCircle2} accent="emerald">
            Em ~2 segundos aparece o relatório do validador. <span className="text-emerald-300">Verde</span> = pode
            seguir. <span className="text-amber-300">Amarelo</span> = aviso, mas funciona. <span className="text-rose-300">Vermelho</span> = corrija
            antes.
          </StepCard>
          <StepCard n={3} title="Pré-visualização 3D" icon={Box} accent="purple">
            O modelo aparece na visualização 3D com órbita por mouse/toque, zoom, exibição de
            bounding box e dimensões reais em mm. Confira se a escala está certa antes de avançar.
          </StepCard>
          <StepCard n={4} title="Confirmar e avançar" icon={CheckCircle2} accent="blue">
            Clique em <strong>Avançar para Biotinta</strong>. O modelo fica vinculado ao processo
            atual de bioimpressão (vê no stepper no topo: 1-Modelo ✓ 2-Biotinta ▶).
          </StepCard>
        </div>
      </Box2>

      <Box2 icon={AlertTriangle} title="Problemas mais comuns" tone="warn">
        <div className="space-y-2 text-[12px]">
          <Problem
            symptom="Modelo aparece minúsculo ou gigante"
            fix="Verifique a unidade de exportação do CAD original (mm vs. cm vs. inch). A BIA assume sempre milímetros."
          />
          <Problem
            symptom="Tudo parece ‘inside-out’ na pré-visualização"
            fix="Normais invertidas. No Blender: Edit Mode → A (selecionar tudo) → Mesh → Normals → Recalculate Outside (Shift+N)."
          />
          <Problem
            symptom="Pré-visualização demora 30+ segundos"
            fix="Mesh com > 500k triângulos. Reduza no Blender (Decimate modifier ratio 0.5) ou Meshmixer (Reduce target 50k)."
          />
          <Problem
            symptom="Não consigo girar/orbitar"
            fix="No celular use 2 dedos. No desktop, clique e arraste com o botão esquerdo. Scroll do mouse = zoom."
          />
        </div>
      </Box2>
    </article>
  )
}

// ─── helpers locais ────────────────────────────────────────────────────
function Way({ icon: Icon, title, badge, color, desc, best }: {
  icon: React.ElementType; title: string; badge: string; color: "purple" | "cyan" | "amber"; desc: string; best: string
}) {
  const palette = {
    purple: "from-purple-500/10 to-purple-500/5 border-purple-500/25 text-purple-300",
    cyan:   "from-cyan-500/10 to-cyan-500/5 border-cyan-500/25 text-cyan-300",
    amber:  "from-amber-500/10 to-amber-500/5 border-amber-500/25 text-amber-300",
  }[color]
  return (
    <div className={`rounded-xl bg-gradient-to-br ${palette} p-3 border`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-4 h-4" />
        <strong className="text-white text-[13px]">{title}</strong>
        <span className="text-[9px] uppercase px-1.5 py-0.5 bg-white/10 rounded">{badge}</span>
      </div>
      <p className="text-[11px] text-gray-300 leading-relaxed mb-2">{desc}</p>
      <p className="text-[10px] text-gray-500"><strong>Melhor para:</strong> {best}</p>
    </div>
  )
}

function Category({ icon: Icon, title, items, useFor }: {
  icon: React.ElementType; title: string; items: string[]; useFor: string
}) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/10 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-purple-300" />
        <strong className="text-white text-[12px]">{title}</strong>
      </div>
      <ul className="flex flex-wrap gap-1 text-[10px] text-gray-300 mb-2">
        {items.map((it, i) => (
          <li key={i} className="px-1.5 py-0.5 bg-white/5 rounded font-mono">{it}</li>
        ))}
      </ul>
      <p className="text-[10px] text-gray-500"><strong>Uso:</strong> {useFor}</p>
    </div>
  )
}

function MeshIssue({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="rounded bg-emerald-500/[0.05] border border-emerald-500/15 p-1.5">
      <div className="text-emerald-200 font-mono font-semibold">{label}</div>
      <div className="text-gray-500 text-[10px]">{desc}</div>
    </div>
  )
}

function Problem({ symptom, fix }: { symptom: string; fix: string }) {
  return (
    <div className="rounded-lg bg-amber-500/[0.04] border border-amber-500/15 p-2.5">
      <div className="flex items-start gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-amber-200 font-semibold text-[12px]">{symptom}</div>
          <div className="text-gray-300 text-[11px] mt-0.5">{fix}</div>
        </div>
      </div>
    </div>
  )
}
