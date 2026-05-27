/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · Manual — Capítulo 13: Ferramentas
 *  ───────────────────────────────────────────────────────────────────────
 *  Conversores, calculadoras e utilitários do laboratório.
 * ═══════════════════════════════════════════════════════════════════════
 */

"use client"

import React from "react"
import {
  Wrench, Calculator, Beaker, Droplet, FlaskConical, Scale,
  ChevronRight, Sparkles, Activity, Thermometer,
} from "lucide-react"
import { Box2, StepCard, MiniCard, ChapterCover, ProTip, Pitfall, FaqItem, ScreenSpot } from "./_components"

export function Tools() {
  return (
    <div className="space-y-8">
      <ChapterCover
        number={13}
        badge="TOOLS"
        title="Ferramentas — calculadoras de bancada"
        icon={Wrench}
        gradient="from-amber-500/15 to-orange-500/15 border-amber-500/20"
        lead={<>
          O módulo <strong className="text-white">Ferramentas</strong> reúne calculadoras e
          conversores que você usa todo dia no laboratório: diluições, molaridade, transferência
          de células, conversão de unidades, planejamento de placas multi-poço. Tudo gratuito,
          sem consumo de créditos.
        </>}
        href="/dashboard/tools"
        hrefLabel="Abrir Ferramentas"
        readMin={5}
        cost="Gratuito"
      />

      {/* ─── Lista de ferramentas ────────────────────────────────── */}
      <Box2 icon={Calculator} title="Ferramentas disponíveis" tone="amber">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <MiniCard title="Diluições" items={[
            "Stock → trabalho (C1V1 = C2V2)",
            "Diluição seriada (½, ¼, ⅛...)",
            "Mix de 2+ soluções",
            "% w/v → mg/mL",
          ]} />
          <MiniCard title="Molaridade" items={[
            "Peso → mols → molaridade",
            "Conversor mM ↔ µg/mL",
            "pH de tampões",
            "Constante de equilíbrio",
          ]} />
          <MiniCard title="Cultura Celular" items={[
            "Densidade de plaqueamento",
            "Tempo de duplicação",
            "Passagem (split ratio)",
            "Viabilidade %",
          ]} />
          <MiniCard title="Placas" items={[
            "Mapa de poços (6/12/24/48/96)",
            "Diluição em placa",
            "Layout de controles",
            "Cálculo de réplicas",
          ]} />
          <MiniCard title="Bioimpressão" items={[
            "Volume de bioink necessário",
            "Tempo estimado de impressão",
            "Velocidade ↔ feedrate",
            "Conversor unidades G-code",
          ]} />
          <MiniCard title="Geral" items={[
            "Conversor de unidades (SI)",
            "Calculadora de densidade",
            "Conversor temperatura",
            "Calculadora de pH",
          ]} />
        </div>
      </Box2>

      {/* ─── Como usar ───────────────────────────────────────────── */}
      <h3 className="text-xl font-bold text-white pt-2">Exemplos práticos</h3>
      <div className="grid grid-cols-1 gap-4">
        <StepCard n={1} title="Calcular diluição" icon={Droplet} accent="blue">
          <p>
            <strong>Cenário:</strong> tenho colagenase 10 mg/mL, preciso de 1 mL a 0,2 mg/mL.
            Quanto stock e quanto diluente?
          </p>
          <p className="mt-2">
            Vá em <strong>Ferramentas → Diluição C1V1=C2V2</strong>, preencha:
          </p>
          <ul className="space-y-1 mt-2 ml-2 text-xs">
            <li>• C1 = 10 mg/mL, C2 = 0,2 mg/mL, V2 = 1000 µL</li>
            <li>• Resultado: V1 = 20 µL de stock + 980 µL de diluente</li>
          </ul>
        </StepCard>

        <StepCard n={2} title="Molaridade rápida" icon={Beaker} accent="purple">
          <p>
            <strong>Cenário:</strong> dissolver 500 mg de glucose (MW=180,16 g/mol) em 200 mL.
            Qual a molaridade?
          </p>
          <p className="mt-2">
            <strong>Ferramentas → Massa para Molaridade</strong>: 500 mg ÷ 180,16 g/mol = 2,776 mmol
            em 200 mL = <strong className="text-purple-200">13,9 mM</strong>.
          </p>
        </StepCard>

        <StepCard n={3} title="Plaqueamento celular" icon={FlaskConical} accent="emerald">
          <p>
            <strong>Cenário:</strong> preciso 10.000 células por poço em placa de 96 poços
            (60 poços usados). Minha contagem deu 1,2 × 10⁶ células/mL.
          </p>
          <p className="mt-2">
            <strong>Ferramentas → Plaqueamento</strong>: input → "10000 céls/poço × 60 poços =
            600.000 céls necessárias". Volume total na placa: 60 × 100 µL = 6 mL.
            Pegue <strong className="text-emerald-200">500 µL do stock + 5,5 mL de meio</strong>.
          </p>
          <ProTip>
            Sempre prepare <strong>10% a mais</strong> do volume (pipetagem perde um pouco).
            Marque a opção "+10% segurança" na ferramenta.
          </ProTip>
        </StepCard>

        <StepCard n={4} title="Volume de bioink" icon={Scale} accent="amber">
          <p>
            <strong>Cenário:</strong> vou imprimir 5 scaffolds de 15 mm × 15 mm × 3 mm com infill 30%.
          </p>
          <p className="mt-2">
            <strong>Ferramentas → Volume de Bioink</strong>: calcula automaticamente o volume
            geométrico × fator de infill × fator de segurança 1.5. Resultado:
            <strong className="text-amber-200"> ~1.5 mL</strong> para os 5 scaffolds.
          </p>
        </StepCard>
      </div>

      {/* ─── Conversores rápidos ─────────────────────────────────── */}
      <Box2 icon={Activity} title="Conversões mais usadas" tone="info">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="space-y-1.5">
            <p><strong className="text-blue-200">Concentração:</strong></p>
            <ul className="space-y-0.5 text-xs list-disc list-inside ml-2">
              <li>1 mg/mL = 1000 µg/mL = 0,1% w/v</li>
              <li>1 mM = 10⁻³ M = quantos µg/mL? depende do MW</li>
              <li>OD 600 = 1 ≈ 8 × 10⁸ E. coli/mL</li>
            </ul>
          </div>
          <div className="space-y-1.5">
            <p><strong className="text-blue-200">Bioimpressão:</strong></p>
            <ul className="space-y-0.5 text-xs list-disc list-inside ml-2">
              <li>10 mm/s = 600 mm/min (feedrate)</li>
              <li>Nozzle 22G = 0,41 mm ID</li>
              <li>Nozzle 25G = 0,26 mm ID</li>
              <li>1 mL/h = 16,67 µL/min</li>
            </ul>
          </div>
        </div>
      </Box2>

      {/* ─── FAQ ─────────────────────────────────────────────────── */}
      <Box2 icon={Sparkles} title="Perguntas frequentes" tone="default">
        <div className="grid grid-cols-1 gap-2">
          <FaqItem q="As ferramentas funcionam offline?">
            Sim — depois de abrir a página uma vez, ficam disponíveis offline (cache do navegador).
          </FaqItem>
          <FaqItem q="Posso salvar um cálculo para usar depois?">
            Sim — botão "Salvar" gera um link permanente que você pode colar no Notebook.
          </FaqItem>
          <FaqItem q="Sistema imperial (oz, lb, °F)?">
            Sim — preferências em Configurações → "Sistema de Unidades".
          </FaqItem>
          <FaqItem q="Faltou alguma ferramenta que preciso?">
            Mande sugestão em Configurações → "Sugerir ferramenta" — a equipe avalia mensalmente.
          </FaqItem>
        </div>
      </Box2>
    </div>
  )
}
