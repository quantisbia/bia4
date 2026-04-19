"use client"

import { useState } from "react"
import {
  Wrench, Scale, Calculator, FileDown, ChevronDown, ChevronUp,
  FlaskConical, Printer, Info, Zap, TrendingUp, AlertCircle,
  CheckCircle2, DollarSign, Clock, Beaker, BarChart3, ArrowRight,
  FileText, Sparkles, Settings2, Copy, Check,
  Layers, Droplets, Activity, Target, Thermometer,
  RotateCcw, Microscope
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

/* ═══════════════════════════════════════════════════════════════════════════
   BIOMATERIAL COMPARATOR — Dados de referência ampliados
═══════════════════════════════════════════════════════════════════════════ */
interface BiomaterialSpec {
  name: string
  category: string
  elasticity_kPa: [number, number]
  porosity_percent: [number, number]
  degradation_weeks: [number, number]
  biocompatibility: number
  printability: number
  cost_per_ml: number
  crosslinking: string
  typical_conc: string
  cellViability: string
  sterilization: string
  storageTemp: string
  shelfLife: string
  applications: string[]
  pros: string[]
  cons: string[]
  idealFor: string
  references: string[]
}

const BIOMATERIALS_DB: BiomaterialSpec[] = [
  {
    name: "GelMA",
    category: "Hidrogel Fotopolimerizável",
    elasticity_kPa: [1, 30],
    porosity_percent: [70, 95],
    degradation_weeks: [2, 12],
    biocompatibility: 5,
    printability: 4,
    cost_per_ml: 12.5,
    crosslinking: "UV (365-405 nm) + LAP/Irgacure",
    typical_conc: "5-15% w/v",
    cellViability: ">85% (24h pós-print)",
    sterilization: "Filtração 0.22 μm + UV",
    storageTemp: "-20°C (liofilizado) / 4°C (solução)",
    shelfLife: "6 meses (liofilizado), 2 semanas (solução)",
    applications: ["Cartilagem", "Pele", "Vascular", "Córnea", "Osso"],
    pros: ["Excelente adesão celular", "Tunable mecânico via grau de metacrilação", "Fotopolimerizável rápido", "Shear-thinning nativo"],
    cons: ["Sensível a temperatura", "UV pode danificar células", "Batch-to-batch variation", "Custo moderado"],
    idealFor: "Bioinks de uso geral com células — excelente para DLP/SLA e extrusão",
    references: ["Yue K. et al., Biomaterials 2015", "Loessner D. et al., Nat Protoc 2016"],
  },
  {
    name: "Alginato",
    category: "Hidrogel Iônico",
    elasticity_kPa: [5, 50],
    porosity_percent: [60, 90],
    degradation_weeks: [4, 52],
    biocompatibility: 4,
    printability: 5,
    cost_per_ml: 2.5,
    crosslinking: "Iônico (CaCl₂ 50-100 mM)",
    typical_conc: "2-4% w/v",
    cellViability: ">90% (gelificação suave)",
    sterilization: "Autoclave 121°C / Filtração",
    storageTemp: "Temperatura ambiente (pó) / 4°C (solução)",
    shelfLife: "12 meses (pó), 4 semanas (solução)",
    applications: ["Encapsulamento celular", "Bioink universal", "Pâncreas", "Cartilagem"],
    pros: ["Baixo custo", "Rápida gelificação", "Excelente printabilidade", "FDA-approved (food grade)", "Versátil para blends"],
    cons: ["Sem adesão celular nativa (precisa RGD)", "Pouca degradação controlada", "Estabilidade mecânica limitada a longo prazo"],
    idealFor: "Encapsulamento celular, co-bioink, prototipagem — o mais barato e versátil",
    references: ["Lee KY & Mooney DJ, Prog Polym Sci 2012", "Jia J. et al., Biofabrication 2014"],
  },
  {
    name: "Colágeno Tipo I",
    category: "Proteína Natural (ECM)",
    elasticity_kPa: [0.5, 10],
    porosity_percent: [80, 98],
    degradation_weeks: [1, 8],
    biocompatibility: 5,
    printability: 2,
    cost_per_ml: 45.0,
    crosslinking: "pH/Térmico (37°C) ou Glutaraldeído",
    typical_conc: "3-10 mg/mL",
    cellViability: ">90% (ECM nativa)",
    sterilization: "Filtração 0.22 μm (sensível a calor)",
    storageTemp: "4°C (solução ácida)",
    shelfLife: "4 semanas (solução), 12 meses (liofilizado)",
    applications: ["Pele", "Córnea", "FRESH printing coração", "Tendões"],
    pros: ["Máxima biocompatibilidade", "ECM nativa — promove migração celular", "Excelente para FRESH bioprinting", "Sítios de adesão celular naturais"],
    cons: ["Caro", "Difícil de imprimir (baixa viscosidade)", "Gelificação lenta", "Contração do gel"],
    idealFor: "Bioimpressão FRESH de tecidos vasculares e cardíacos — biomimetismo máximo",
    references: ["Lee A. et al., Science 2019", "Hinton TJ et al., Sci Adv 2015"],
  },
  {
    name: "Fibrina",
    category: "Proteína Natural",
    elasticity_kPa: [0.1, 5],
    porosity_percent: [85, 99],
    degradation_weeks: [1, 4],
    biocompatibility: 5,
    printability: 3,
    cost_per_ml: 35.0,
    crosslinking: "Enzimático (trombina 50-250 U/mL)",
    typical_conc: "10-30 mg/mL fibrinogênio",
    cellViability: ">95% (fisiológico)",
    sterilization: "Filtração 0.22 μm",
    storageTemp: "-20°C (aliquotado)",
    shelfLife: "6 meses (-20°C)",
    applications: ["Pele in situ", "Vascular", "Cicatrização", "Neural"],
    pros: ["Rápida gelificação controlável", "Promove angiogênese", "Excelente para cicatrização", "Autólogo possível"],
    cons: ["Degradação rápida", "Mecânica fraca", "Alto custo", "Contração significativa"],
    idealFor: "Bioimpressão in situ de pele e cicatrização — ideal para aplicação direta",
    references: ["Albanna M. et al., Adv Healthcare Mater 2019", "de Melo BAG et al., ACS Biomater 2020"],
  },
  {
    name: "Ácido Hialurônico (HA)",
    category: "Glicosaminoglicano",
    elasticity_kPa: [0.5, 20],
    porosity_percent: [75, 95],
    degradation_weeks: [2, 16],
    biocompatibility: 5,
    printability: 3,
    cost_per_ml: 25.0,
    crosslinking: "Metacrilato (MeHA-UV) ou Tiol-eno",
    typical_conc: "1-5% w/v",
    cellViability: ">85% (dependente do método de crosslinking)",
    sterilization: "Filtração 0.22 μm / UV",
    storageTemp: "-20°C (liofilizado) / 4°C (solução)",
    shelfLife: "12 meses (liofilizado)",
    applications: ["Cartilagem", "Córnea", "Vocal folds", "Neuro", "Disco intervertebral"],
    pros: ["ECM nativa de articulação", "Biodegradável controlado via hialuronidase", "Versátil funcionalização", "Promove condrogênese"],
    cons: ["Caro", "Printabilidade limitada puro", "Precisa modificação química", "Batch variation natural"],
    idealFor: "Cartilagem e córnea — ECM nativa articular com degradação controlada",
    references: ["Highley CB et al., Adv Mater 2015", "Petta D. et al., Biofabrication 2018"],
  },
  {
    name: "PCL (Policaprolactona)",
    category: "Polímero Sintético",
    elasticity_kPa: [3000, 40000],
    porosity_percent: [40, 80],
    degradation_weeks: [52, 156],
    biocompatibility: 3,
    printability: 5,
    cost_per_ml: 5.0,
    crosslinking: "Térmico (60-80°C) — FDM/extrusão quente",
    typical_conc: "Filamento/pellet 100%",
    cellViability: "N/A (não cell-laden — semeadura pós-print)",
    sterilization: "Autoclave / ETO / UV / Plasma",
    storageTemp: "Temperatura ambiente",
    shelfLife: "24+ meses (pellet seco)",
    applications: ["Osso", "Scaffold mecânico", "Stents", "Drug delivery", "Dental"],
    pros: ["Alta resistência mecânica", "Degradação lenta controlada", "FDA-approved", "Barato", "Fácil processamento"],
    cons: ["Sem adesão celular (hidrofóbico)", "Não compatível com cell-laden (alta T)", "Precisa coating ou blend"],
    idealFor: "Scaffolds mecânicos para osso — FDA-approved, barato, degradação longa",
    references: ["Woodruff MA & Hutmacher DW, Prog Polym Sci 2010", "Zhu Y. et al., Biomaterials 2018"],
  },
  {
    name: "dECM (Matriz Descelularizada)",
    category: "ECM Nativa Tecido-Específica",
    elasticity_kPa: [0.5, 15],
    porosity_percent: [80, 98],
    degradation_weeks: [4, 24],
    biocompatibility: 5,
    printability: 3,
    cost_per_ml: 85.0,
    crosslinking: "Térmico (37°C) — self-assembly",
    typical_conc: "10-30 mg/mL",
    cellViability: ">80% (tissue-specific cues)",
    sterilization: "Peracético / UV / Gamma",
    storageTemp: "-80°C (solução) / -20°C (liofilizado)",
    shelfLife: "3 meses (-80°C), 12 meses (liofilizado)",
    applications: ["Fígado", "Coração", "Rim", "Tecido-específico", "Organoides"],
    pros: ["Máximo biomimetismo tecido-específico", "Tissue-specific cues e growth factors retidos", "Promove diferenciação direcionada", "Auto-assembly fisiológico"],
    cons: ["Muito caro", "Batch variation entre tecidos", "Processamento complexo", "Baixa mecânica", "Riscos de imunogenicidade residual"],
    idealFor: "Organoides e tecidos que requerem microambiente específico — biomimetismo máximo",
    references: ["Pati F. et al., Nat Commun 2014", "Choudhury D. et al., Trends Biotechnol 2018"],
  },
  {
    name: "PLGA",
    category: "Polímero Sintético Biodegradável",
    elasticity_kPa: [10000, 70000],
    porosity_percent: [30, 70],
    degradation_weeks: [4, 26],
    biocompatibility: 4,
    printability: 4,
    cost_per_ml: 8.0,
    crosslinking: "Solvente/Térmico",
    typical_conc: "10-30% w/v em solvente",
    cellViability: "N/A (solventes — semeadura pós-processamento)",
    sterilization: "ETO / UV / Gamma",
    storageTemp: "-20°C (proteção de umidade)",
    shelfLife: "24 meses (seco, sellado)",
    applications: ["Osso", "Drug delivery", "Scaffolds", "Suturas", "Cartilagem"],
    pros: ["FDA-approved", "Degradação ajustável (ratio LA:GA)", "Boa mecânica", "Ampla base de evidências clínicas"],
    cons: ["Ácidos de degradação (↓ pH local)", "Solventes residuais", "Não ideal cell-laden", "Inflamação pós-degradação possível"],
    idealFor: "Drug delivery e scaffolds mecânicos com degradação ajustável — aprovação regulatória facilitada",
    references: ["Gentile P. et al., Int J Mol Sci 2014", "Kapoor DN et al., Ther Deliv 2015"],
  },
  {
    name: "Seda (Silk Fibroin)",
    category: "Biopolímero Natural",
    elasticity_kPa: [10, 2000],
    porosity_percent: [60, 95],
    degradation_weeks: [8, 52],
    biocompatibility: 5,
    printability: 3,
    cost_per_ml: 18.0,
    crosslinking: "β-sheet (metanol/pH) ou UV (Silk-MA)",
    typical_conc: "5-30% w/v",
    cellViability: ">85% (biocompatível após purificação)",
    sterilization: "Autoclave / Filtração / UV",
    storageTemp: "4°C (solução) / Temp. ambiente (liofilizado)",
    shelfLife: "6 meses (solução 4°C), 24 meses (liofilizado)",
    applications: ["Osso", "Cartilagem", "Ligamentos", "Vascular", "Córnea"],
    pros: ["Excelente mecânica para biopolímero natural", "Degradação enzimática controlada", "FDA-approved history", "Transparência óptica (córnea)", "Versatilidade de processamento"],
    cons: ["Processamento complexo (sericina removal)", "Viscosidade dependente de concentração", "Sensibilidade à contaminação"],
    idealFor: "Tecidos que requerem alta mecânica + biocompatibilidade — alternativa natural ao PCL",
    references: ["Vepari C & Kaplan DL, Prog Polym Sci 2007", "Kim SH et al., Nat Protoc 2014"],
  },
  {
    name: "Gelatina-Alginato Blend",
    category: "Hidrogel Composto (Blend)",
    elasticity_kPa: [2, 25],
    porosity_percent: [65, 92],
    degradation_weeks: [2, 16],
    biocompatibility: 5,
    printability: 5,
    cost_per_ml: 4.0,
    crosslinking: "Dual: Iônico (CaCl₂) + Térmico (37°C)",
    typical_conc: "5-10% gelatina + 2-3% alginato",
    cellViability: ">90% (condições suaves)",
    sterilization: "Filtração 0.22 μm / UV",
    storageTemp: "4°C (gel) / 37°C (líquido para uso)",
    shelfLife: "2 semanas (solução 4°C)",
    applications: ["Bioink universal", "Pele", "Cartilagem", "Educação/Prototipagem"],
    pros: ["Muito barato", "Dual crosslinking", "Excelente printabilidade", "Adesão celular nativa", "Ideal para iniciantes"],
    cons: ["Estabilidade térmica limitada", "Degradação rápida sem crosslinking extra", "Não adequado para aplicações mecânicas"],
    idealFor: "O bioink mais acessível e versátil — ideal para laboratórios com orçamento limitado e prototipagem",
    references: ["Giuseppe MD et al., Biofabrication 2018", "Chung JHY et al., Biomater Sci 2013"],
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   BIOPRINTING COST CALCULATOR
═══════════════════════════════════════════════════════════════════════════ */
interface CostInput {
  bioinkMaterial: string
  bioinkVolume_mL: number
  cellSource: string
  cellCount_millions: number
  crosslinkerCost: number
  printTime_hours: number
  machineHourRate: number
  laborHours: number
  laborRate: number
  consumables: number
  qcTests: number
  qcCostPerTest: number
  overheadPercent: number
  cultureWeeks: number
  cultureCostPerWeek: number
}

const DEFAULT_COST: CostInput = {
  bioinkMaterial: "GelMA",
  bioinkVolume_mL: 5,
  cellSource: "iPSC",
  cellCount_millions: 10,
  crosslinkerCost: 15,
  printTime_hours: 3,
  machineHourRate: 45,
  laborHours: 6,
  laborRate: 55,
  consumables: 120,
  qcTests: 4,
  qcCostPerTest: 35,
  overheadPercent: 20,
  cultureWeeks: 2,
  cultureCostPerWeek: 85,
}

const CELL_COSTS: Record<string, number> = {
  "iPSC": 0.8,
  "Primary (humana)": 1.5,
  "Linhagem (HeLa, etc)": 0.15,
  "MSC (mesenquimal)": 1.2,
  "Fibroblasto": 0.3,
  "Condrócito": 2.0,
  "Hepatócito": 3.5,
  "Cardiomiócito (iPSC)": 2.5,
}

/* Cost templates/presets */
const COST_PRESETS: { label: string; desc: string; values: Partial<CostInput> }[] = [
  {
    label: "Pesquisa Básica",
    desc: "Lab acadêmico, protótipo simples",
    values: { bioinkMaterial: "Gelatina-Alginato Blend", bioinkVolume_mL: 3, cellSource: "Linhagem (HeLa, etc)", cellCount_millions: 5, printTime_hours: 1.5, machineHourRate: 25, laborHours: 4, laborRate: 35, consumables: 60, qcTests: 2, qcCostPerTest: 20, overheadPercent: 10, cultureWeeks: 1, cultureCostPerWeek: 50 },
  },
  {
    label: "Tissue Engineering",
    desc: "Scaffold funcional, GelMA + iPSC",
    values: { bioinkMaterial: "GelMA", bioinkVolume_mL: 5, cellSource: "iPSC", cellCount_millions: 10, printTime_hours: 3, machineHourRate: 45, laborHours: 6, laborRate: 55, consumables: 120, qcTests: 4, qcCostPerTest: 35, overheadPercent: 20, cultureWeeks: 2, cultureCostPerWeek: 85 },
  },
  {
    label: "GMP/Clínico",
    desc: "Produção GMP, dECM + primary cells",
    values: { bioinkMaterial: "dECM (Matriz Descelularizada)", bioinkVolume_mL: 8, cellSource: "Primary (humana)", cellCount_millions: 20, crosslinkerCost: 45, printTime_hours: 5, machineHourRate: 120, laborHours: 12, laborRate: 85, consumables: 450, qcTests: 8, qcCostPerTest: 75, overheadPercent: 35, cultureWeeks: 4, cultureCostPerWeek: 200 },
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */
function StarRating({ value, max = 5, size = "sm" }: { value: number; max?: number; size?: "sm" | "md" }) {
  const dotSize = size === "md" ? "w-2.5 h-2.5" : "w-2 h-2"
  return (
    <div className="flex gap-0.5" title={`${value}/${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} className={cn(
          dotSize, "rounded-full transition-colors",
          i < value ? "bg-emerald-400" : "bg-white/10"
        )} />
      ))}
    </div>
  )
}

function RangeBar({ min, max, label, unit, color = "blue" }: { min: number; max: number; label: string; unit: string; color?: string }) {
  const maxScale = label.includes("Elasticidade") ? 70000 : label.includes("Porosidade") ? 100 : 156
  const leftPct = Math.min((min / maxScale) * 100, 100)
  const widthPct = Math.min(((max - min) / maxScale) * 100, 100 - leftPct)
  
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/60",
    violet: "bg-violet-500/60",
    amber: "bg-amber-500/60",
    emerald: "bg-emerald-500/60",
    rose: "bg-rose-500/60",
  }
  
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[10px] text-gray-500">{label}</span>
        <span className="text-[10px] text-gray-400">{min.toLocaleString()}-{max.toLocaleString()} {unit}</span>
      </div>
      <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden relative">
        <div className={cn("absolute h-full rounded-full", colorMap[color] ?? "bg-blue-500/60")}
          style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%` }} />
      </div>
    </div>
  )
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
function formatUSD(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" })
}

/* ═══════════════════════════════════════════════════════════════════════════
   PDF EXPORT HELPER
═══════════════════════════════════════════════════════════════════════════ */
function generateComparisonPDF(selectedMaterials: BiomaterialSpec[]) {
  const now = new Date().toLocaleDateString("pt-BR")
  const win = window.open("", "_blank")
  if (!win) return

  const rows = selectedMaterials.map(m => `
    <tr>
      <td style="font-weight:700; color:#1e3a8a;">${m.name}</td>
      <td>${m.category}</td>
      <td>${m.elasticity_kPa[0].toLocaleString()}-${m.elasticity_kPa[1].toLocaleString()} kPa</td>
      <td>${m.porosity_percent[0]}-${m.porosity_percent[1]}%</td>
      <td>${m.degradation_weeks[0]}-${m.degradation_weeks[1]} sem</td>
      <td>${"★".repeat(m.biocompatibility)}${"☆".repeat(5 - m.biocompatibility)}</td>
      <td>${"★".repeat(m.printability)}${"☆".repeat(5 - m.printability)}</td>
      <td style="font-weight:600; color:#059669;">$${m.cost_per_ml.toFixed(2)}/mL</td>
    </tr>
  `).join("")

  const details = selectedMaterials.map(m => `
    <div style="page-break-inside: avoid; margin-bottom: 18px; padding: 14px 18px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fafbff;">
      <h3 style="color:#1e3a8a; margin:0 0 6px; font-size: 13pt;">${m.name} — ${m.category}</h3>
      <table style="width:100%; font-size:9.5pt; border-collapse:collapse;">
        <tr><td style="width:140px; font-weight:600; padding:3px 0;">Crosslinking:</td><td>${m.crosslinking}</td></tr>
        <tr><td style="font-weight:600; padding:3px 0;">Concentração:</td><td>${m.typical_conc}</td></tr>
        <tr><td style="font-weight:600; padding:3px 0;">Viabilidade celular:</td><td>${m.cellViability}</td></tr>
        <tr><td style="font-weight:600; padding:3px 0;">Esterilização:</td><td>${m.sterilization}</td></tr>
        <tr><td style="font-weight:600; padding:3px 0;">Armazenamento:</td><td>${m.storageTemp} — Shelf life: ${m.shelfLife}</td></tr>
        <tr><td style="font-weight:600; padding:3px 0;">Ideal para:</td><td style="color:#059669; font-weight:600;">${m.idealFor}</td></tr>
      </table>
      <div style="margin-top:8px;">
        <span style="font-size:9pt; font-weight:600; color:#059669;">✓ Vantagens:</span>
        <span style="font-size:9pt; color:#374151;"> ${m.pros.join(" · ")}</span>
      </div>
      <div style="margin-top:4px;">
        <span style="font-size:9pt; font-weight:600; color:#d97706;">⚠ Limitações:</span>
        <span style="font-size:9pt; color:#6b7280;"> ${m.cons.join(" · ")}</span>
      </div>
      <div style="margin-top:4px;">
        <span style="font-size:9pt; font-weight:600; color:#6b7280;">Aplicações:</span>
        <span style="font-size:9pt; color:#374151;"> ${m.applications.join(", ")}</span>
      </div>
      <div style="margin-top:4px;">
        <span style="font-size:8.5pt; color:#9ca3af;">Refs: ${m.references.join("; ")}</span>
      </div>
    </div>
  `).join("")

  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comparação de Biomateriais — BIA v4</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #1a1a2e; background: white; }
    .page { max-width: 900px; margin: 0 auto; padding: 1.5cm; }
    .header { background: linear-gradient(135deg, #1e3a8a, #4338ca); color: white; padding: 18px 24px; margin: -1.5cm -1.5cm 20px; border-bottom: 3px solid #2563eb; }
    .header h1 { font-size: 15pt; font-weight: 700; }
    .header .meta { font-size: 9pt; color: #a5b4fc; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 12px 0; }
    thead tr { background: #1e3a8a; color: white; }
    thead th { padding: 8px 10px; text-align: left; font-weight: 600; }
    tbody td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
    tbody tr:nth-child(even) { background: #f0f4ff; }
    h2 { font-size: 13pt; color: #1e3a8a; margin: 20px 0 10px; border-bottom: 2px solid #2563eb; padding-bottom: 4px; }
    .footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 8pt; color: #9ca3af; text-align: center; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } @page { margin: 1cm; } .header { margin: -1cm -1cm 16px; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>🔬 Comparação de Biomateriais — BIA v4</h1>
    <div class="meta">Gerado em ${now} | ${selectedMaterials.length} materiais comparados | Biofabrication Intelligent Assistant</div>
  </div>

  <h2>Tabela Comparativa</h2>
  <table>
    <thead>
      <tr><th>Material</th><th>Categoria</th><th>Elasticidade</th><th>Porosidade</th><th>Degradação</th><th>Biocompat.</th><th>Printab.</th><th>Custo</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <h2>Detalhes dos Materiais</h2>
  ${details}

  <div class="footer">
    Relatório gerado por BIA v4 — Biofabrication Intelligent Assistant | Quantis Biotecnologia | ${now}<br/>
    ⚠ Dados de referência para pesquisa. Validação experimental obrigatória.
  </div>
</div>
<script>window.onload = function() { window.print(); }</script>
</body>
</html>`)
  win.document.close()
}

function generateCostPDF(form: CostInput, breakdown: { label: string; value: number; pct: number }[], total: number, subtotal: number, overhead: number) {
  const now = new Date().toLocaleDateString("pt-BR")
  const win = window.open("", "_blank")
  if (!win) return

  const rows = breakdown.map(item => `
    <tr>
      <td style="font-weight:600;">${item.label}</td>
      <td style="text-align:right;">${formatUSD(item.value)}</td>
      <td style="text-align:right; color:#6b7280;">${item.pct.toFixed(1)}%</td>
      <td>
        <div style="width:100%; height:8px; background:#f3f4f6; border-radius:4px; overflow:hidden;">
          <div style="width:${Math.max(item.pct, 1)}%; height:100%; background:${item.pct > 20 ? '#2563eb' : '#818cf8'}; border-radius:4px;"></div>
        </div>
      </td>
    </tr>
  `).join("")

  const bioinkInfo = BIOMATERIALS_DB.find(b => b.name === form.bioinkMaterial)

  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Custo de Bioimpressão — BIA v4</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #1a1a2e; }
    .page { max-width: 800px; margin: 0 auto; padding: 1.5cm; }
    .header { background: linear-gradient(135deg, #92400e, #d97706); color: white; padding: 18px 24px; margin: -1.5cm -1.5cm 20px; border-bottom: 3px solid #f59e0b; }
    .header h1 { font-size: 15pt; }
    .header .meta { font-size: 9pt; color: #fde68a; margin-top: 6px; }
    .total-box { background: #fffbeb; border: 2px solid #f59e0b; border-radius: 10px; padding: 16px 20px; margin: 16px 0; display: flex; justify-content: space-between; align-items: center; }
    .total-box .amount { font-size: 22pt; font-weight: 800; color: #92400e; }
    .total-box .brl { font-size: 10pt; color: #6b7280; }
    h2 { font-size: 12pt; color: #92400e; margin: 18px 0 8px; border-bottom: 2px solid #f59e0b; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 10px 0; }
    thead tr { background: #92400e; color: white; }
    thead th { padding: 8px 10px; text-align: left; }
    tbody td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
    tbody tr:nth-child(even) { background: #fffbeb; }
    .params-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 10px 0; }
    .param-item { background: #f9fafb; padding: 8px 12px; border-radius: 6px; border: 1px solid #e5e7eb; }
    .param-item .label { font-size: 8pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .param-item .value { font-size: 10pt; font-weight: 600; color: #1a1a2e; }
    .footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 8pt; color: #9ca3af; text-align: center; }
    @media print { @page { margin: 1cm; } .header { margin: -1cm -1cm 16px; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>💰 Estimativa de Custo de Bioimpressão</h1>
    <div class="meta">Gerado em ${now} | ${form.bioinkMaterial} + ${form.cellSource} | BIA v4</div>
  </div>

  <div class="total-box">
    <div>
      <div style="font-size:9pt; color:#6b7280; text-transform:uppercase; letter-spacing:1px;">Custo Total Estimado</div>
      <div class="amount">${formatUSD(total)}</div>
      <div class="brl">≈ ${formatBRL(total * 5.2)} (câmbio ref.)</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:9pt; color:#6b7280;">Subtotal: ${formatUSD(subtotal)}</div>
      <div style="font-size:9pt; color:#6b7280;">Overhead (${form.overheadPercent}%): ${formatUSD(overhead)}</div>
    </div>
  </div>

  <h2>Parâmetros do Projeto</h2>
  <div class="params-grid">
    <div class="param-item"><div class="label">Bioink</div><div class="value">${form.bioinkMaterial} (${bioinkInfo ? formatUSD(bioinkInfo.cost_per_ml) + "/mL" : ""})</div></div>
    <div class="param-item"><div class="label">Volume</div><div class="value">${form.bioinkVolume_mL} mL</div></div>
    <div class="param-item"><div class="label">Fonte Celular</div><div class="value">${form.cellSource}</div></div>
    <div class="param-item"><div class="label">Células</div><div class="value">${form.cellCount_millions}M (${formatUSD((CELL_COSTS[form.cellSource] ?? 0.8))}/M)</div></div>
    <div class="param-item"><div class="label">Tempo Impressão</div><div class="value">${form.printTime_hours}h @ ${formatUSD(form.machineHourRate)}/h</div></div>
    <div class="param-item"><div class="label">Mão de Obra</div><div class="value">${form.laborHours}h @ ${formatUSD(form.laborRate)}/h</div></div>
    <div class="param-item"><div class="label">Testes QC</div><div class="value">${form.qcTests}x @ ${formatUSD(form.qcCostPerTest)}/teste</div></div>
    <div class="param-item"><div class="label">Cultura Pós-Print</div><div class="value">${form.cultureWeeks} sem @ ${formatUSD(form.cultureCostPerWeek)}/sem</div></div>
  </div>

  <h2>Breakdown de Custos</h2>
  <table>
    <thead><tr><th>Item</th><th style="text-align:right;">Valor (USD)</th><th style="text-align:right;">%</th><th style="width:30%;">Proporção</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div style="margin-top:12px; padding:10px 14px; background:#fffbeb; border:1px solid #f59e0b; border-radius:6px; font-size:9pt;">
    <strong style="color:#92400e;">💡 Dicas BIA para otimização de custos:</strong><br/>
    • Substitua colágeno por GelMA para reduzir custo de bioink em ~70%<br/>
    • Use alginato como co-bioink para crosslinking dual — barato e eficaz<br/>
    • iPSC são mais custo-eficientes que células primárias para grandes volumes<br/>
    • Otimize o volume de bioink — menor volume = menor desperdício de material
  </div>

  <div class="footer">
    Relatório gerado por BIA v4 — Biofabrication Intelligent Assistant | Quantis Biotecnologia | ${now}<br/>
    ⚠ Estimativa para planejamento. Custos reais podem variar conforme fornecedores e equipamentos.
  </div>
</div>
<script>window.onload = function() { window.print(); }</script>
</body>
</html>`)
  win.document.close()
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState<"comparator" | "calculator" | "pdf">("comparator")

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-6xl mx-auto w-full">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center shrink-0 shadow-lg shadow-amber-900/40">
          <Wrench className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Ferramentas BIA
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Comparador de biomateriais · Calculadora de custos · Exportação PDF
          </p>
        </div>
      </div>

      {/* Tab Switcher — 3 tabs */}
      <div className="flex gap-1.5 p-1 bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-x-auto">
        <button
          onClick={() => setActiveTab("comparator")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap min-w-[100px]",
            activeTab === "comparator"
              ? "bg-blue-500/15 text-blue-300 border border-blue-500/25"
              : "text-gray-500 hover:text-gray-300"
          )}>
          <Scale className="w-4 h-4" />
          Comparador
        </button>
        <button
          onClick={() => setActiveTab("calculator")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap min-w-[100px]",
            activeTab === "calculator"
              ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
              : "text-gray-500 hover:text-gray-300"
          )}>
          <Calculator className="w-4 h-4" />
          Calculadora
        </button>
        <button
          onClick={() => setActiveTab("pdf")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap min-w-[100px]",
            activeTab === "pdf"
              ? "bg-violet-500/15 text-violet-300 border border-violet-500/25"
              : "text-gray-500 hover:text-gray-300"
          )}>
          <FileDown className="w-4 h-4" />
          Exportar PDF
        </button>
      </div>

      {activeTab === "comparator" ? <BiomaterialComparator /> : activeTab === "calculator" ? <CostCalculator /> : <PDFExporter />}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PDF EXPORTER TAB
═══════════════════════════════════════════════════════════════════════════ */
function PDFExporter() {
  return (
    <div className="space-y-5">
      {/* Info card */}
      <div className="rounded-xl border border-violet-500/15 bg-violet-500/[0.03] p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0">
            <FileDown className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Exportação PDF Profissional</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Exporte relatórios profissionais em PDF para publicação, apresentações e dossiês regulatórios. 
              Cada módulo da BIA possui opções de exportação integradas.
            </p>
          </div>
        </div>
      </div>

      {/* Export options grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          {
            title: "Protocolos GLP/GMP",
            desc: "Exporte protocolos completos com formatação profissional, tabelas, referências normativas e cabeçalho institucional.",
            icon: FileText,
            color: "violet",
            href: "/dashboard/protocols",
            formats: [".md", ".txt", "PDF"],
          },
          {
            title: "Análise de Pipeline",
            desc: "Exporte análise completa de etapas do pipeline com parâmetros, avisos e próximos passos.",
            icon: Activity,
            color: "emerald",
            href: "/dashboard/pipeline",
            formats: ["PDF (print)"],
          },
          {
            title: "Comparação de Biomateriais",
            desc: "Tabela comparativa com propriedades, custos, vantagens, limitações e referências de até 4 materiais.",
            icon: Scale,
            color: "blue",
            href: "#",
            action: "comparator",
            formats: ["PDF"],
          },
          {
            title: "Estimativa de Custos",
            desc: "Relatório detalhado com breakdown de custos, parâmetros do projeto e dicas de otimização.",
            icon: Calculator,
            color: "amber",
            href: "#",
            action: "calculator",
            formats: ["PDF"],
          },
          {
            title: "Análises & Dossiês",
            desc: "Dossiês regulatórios completos com análises moleculares, bioquímicas e documentação FDA/ANVISA.",
            icon: Microscope,
            color: "rose",
            href: "/dashboard/analyses",
            formats: [".md", ".txt", "PDF"],
          },
          {
            title: "Notebook Científico",
            desc: "Exporte anotações do notebook do pesquisador com dados de experimentos e observações.",
            icon: Layers,
            color: "indigo",
            href: "/dashboard/notebook",
            formats: [".md", "PDF"],
          },
        ].map((item) => (
          <a key={item.title} href={item.href}
            className={cn(
              "group p-4 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99]",
              `bg-${item.color}-500/[0.03] border-${item.color}-500/10 hover:border-${item.color}-500/25`
            )}>
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                `bg-${item.color}-500/15 border border-${item.color}-500/20`
              )}>
                <item.icon className={cn("w-4 h-4", `text-${item.color}-400`)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white mb-1">{item.title}</p>
                <p className="text-[11px] text-gray-400 leading-relaxed mb-2">{item.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.formats.map(f => (
                    <span key={f} className={cn(
                      "text-[9px] font-semibold px-2 py-0.5 rounded-full border",
                      `bg-${item.color}-500/10 text-${item.color}-400 border-${item.color}-500/20`
                    )}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300 shrink-0 mt-1 transition-colors" />
            </div>
          </a>
        ))}
      </div>

      {/* Tips */}
      <div className="rounded-xl border border-violet-500/10 bg-violet-500/[0.03] p-4">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-violet-300 mb-1">Como exportar PDFs</p>
            <ul className="text-[11px] text-gray-400 space-y-1 leading-relaxed">
              <li>• <strong className="text-white">Protocolos:</strong> Abra qualquer protocolo → clique no botão <span className="text-violet-300">PDF</span> na toolbar</li>
              <li>• <strong className="text-white">Comparador:</strong> Selecione biomateriais na aba Comparador → botão <span className="text-blue-300">Exportar PDF</span></li>
              <li>• <strong className="text-white">Calculadora:</strong> Preencha os parâmetros na aba Calculadora → botão <span className="text-amber-300">Exportar PDF</span></li>
              <li>• <strong className="text-white">Dica:</strong> Use Ctrl+P ou Cmd+P para configurar impressão e salvar como PDF</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPARATOR COMPONENT — Enhanced
═══════════════════════════════════════════════════════════════════════════ */
function BiomaterialComparator() {
  const [selected, setSelected] = useState<string[]>(["GelMA", "Alginato"])
  const [expandedDetail, setExpandedDetail] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"name" | "cost" | "biocompat" | "print">("name")
  const [copied, setCopied] = useState(false)

  const toggleSelect = (name: string) => {
    setSelected(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : prev.length < 4
          ? [...prev, name]
          : prev
    )
  }

  const categories = Array.from(new Set(BIOMATERIALS_DB.map(b => b.category)))

  const filteredDB = BIOMATERIALS_DB
    .filter(b => filterCategory === "all" || b.category === filterCategory)
    .sort((a, b) => {
      if (sortBy === "cost") return a.cost_per_ml - b.cost_per_ml
      if (sortBy === "biocompat") return b.biocompatibility - a.biocompatibility
      if (sortBy === "print") return b.printability - a.printability
      return a.name.localeCompare(b.name)
    })

  const selectedMaterials = BIOMATERIALS_DB.filter(m => selected.includes(m.name))

  function copyComparisonText() {
    const text = selectedMaterials.map(m =>
      `${m.name} (${m.category})\n  Elasticidade: ${m.elasticity_kPa[0]}-${m.elasticity_kPa[1]} kPa\n  Porosidade: ${m.porosity_percent[0]}-${m.porosity_percent[1]}%\n  Degradação: ${m.degradation_weeks[0]}-${m.degradation_weeks[1]} semanas\n  Custo: ${formatUSD(m.cost_per_ml)}/mL\n  Crosslinking: ${m.crosslinking}\n  Ideal: ${m.idealFor}\n`
    ).join("\n")
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">
      {/* Filter and Sort controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/40 appearance-none cursor-pointer"
        >
          <option value="all">Todas as categorias</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/40 appearance-none cursor-pointer"
        >
          <option value="name">Ordenar por nome</option>
          <option value="cost">Ordenar por custo (↑)</option>
          <option value="biocompat">Ordenar por biocompatibilidade (↓)</option>
          <option value="print">Ordenar por printabilidade (↓)</option>
        </select>
      </div>

      {/* Selection */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Selecione até 4 biomateriais</h3>
          </div>
          <span className="text-[10px] text-gray-500">{selected.length}/4 selecionados</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {filteredDB.map(bm => (
            <button key={bm.name}
              onClick={() => toggleSelect(bm.name)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-medium border transition-all active:scale-95",
                selected.includes(bm.name)
                  ? "bg-blue-500/15 text-blue-300 border-blue-500/25 shadow-sm shadow-blue-500/10"
                  : "bg-white/[0.03] text-gray-400 border-white/[0.08] hover:border-white/15"
              )}>
              {selected.includes(bm.name) && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
              {bm.name}
              <span className="text-[9px] text-gray-500 ml-1">({formatUSD(bm.cost_per_ml)})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      {selectedMaterials.length >= 2 && (
        <div className="rounded-xl border border-blue-500/15 bg-blue-500/[0.02] overflow-hidden">
          <div className="px-4 py-3 border-b border-blue-500/10 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-blue-300">Comparação Lado a Lado</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={copyComparisonText}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white/[0.05] hover:bg-white/[0.08] text-gray-400 hover:text-white rounded-lg text-[11px] font-medium transition-all border border-white/[0.06]">
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copiado!" : "Copiar"}
              </button>
              <button onClick={() => generateComparisonPDF(selectedMaterials)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 rounded-lg text-[11px] font-medium transition-all border border-blue-500/20">
                <FileDown className="w-3 h-3" /> Exportar PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider px-4 py-3 w-36">Propriedade</th>
                  {selectedMaterials.map(m => (
                    <th key={m.name} className="text-center text-xs font-semibold text-white px-3 py-3">{m.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-xs">
                <CompRow label="Categoria">
                  {selectedMaterials.map(m => (
                    <td key={m.name} className="text-center px-3 py-2.5 text-gray-300">{m.category}</td>
                  ))}
                </CompRow>
                <CompRow label="Elasticidade (kPa)">
                  {selectedMaterials.map(m => (
                    <td key={m.name} className="text-center px-3 py-2.5 text-gray-300">{m.elasticity_kPa[0].toLocaleString()}-{m.elasticity_kPa[1].toLocaleString()}</td>
                  ))}
                </CompRow>
                <CompRow label="Porosidade (%)">
                  {selectedMaterials.map(m => (
                    <td key={m.name} className="text-center px-3 py-2.5 text-gray-300">{m.porosity_percent[0]}-{m.porosity_percent[1]}%</td>
                  ))}
                </CompRow>
                <CompRow label="Degradação (sem)">
                  {selectedMaterials.map(m => (
                    <td key={m.name} className="text-center px-3 py-2.5 text-gray-300">{m.degradation_weeks[0]}-{m.degradation_weeks[1]}</td>
                  ))}
                </CompRow>
                <CompRow label="Biocompatibilidade">
                  {selectedMaterials.map(m => (
                    <td key={m.name} className="px-3 py-2.5"><div className="flex justify-center"><StarRating value={m.biocompatibility} /></div></td>
                  ))}
                </CompRow>
                <CompRow label="Printabilidade">
                  {selectedMaterials.map(m => (
                    <td key={m.name} className="px-3 py-2.5"><div className="flex justify-center"><StarRating value={m.printability} /></div></td>
                  ))}
                </CompRow>
                <CompRow label="Viabilidade Celular">
                  {selectedMaterials.map(m => (
                    <td key={m.name} className="text-center px-3 py-2.5 text-emerald-400 text-[11px]">{m.cellViability}</td>
                  ))}
                </CompRow>
                <CompRow label="Crosslinking">
                  {selectedMaterials.map(m => (
                    <td key={m.name} className="text-center px-3 py-2.5 text-gray-400 text-[11px]">{m.crosslinking}</td>
                  ))}
                </CompRow>
                <CompRow label="Concentração">
                  {selectedMaterials.map(m => (
                    <td key={m.name} className="text-center px-3 py-2.5 text-gray-300">{m.typical_conc}</td>
                  ))}
                </CompRow>
                <CompRow label="Esterilização">
                  {selectedMaterials.map(m => (
                    <td key={m.name} className="text-center px-3 py-2.5 text-gray-400 text-[11px]">{m.sterilization}</td>
                  ))}
                </CompRow>
                <CompRow label="Armazenamento">
                  {selectedMaterials.map(m => (
                    <td key={m.name} className="text-center px-3 py-2.5 text-gray-400 text-[11px]">{m.storageTemp}</td>
                  ))}
                </CompRow>
                <CompRow label="Custo por mL (USD)" highlight>
                  {selectedMaterials.map(m => {
                    const isMin = m.cost_per_ml === Math.min(...selectedMaterials.map(s => s.cost_per_ml))
                    const isMax = m.cost_per_ml === Math.max(...selectedMaterials.map(s => s.cost_per_ml))
                    return (
                      <td key={m.name} className={cn("text-center px-3 py-2.5 font-semibold", isMin ? "text-emerald-400" : isMax ? "text-rose-400" : "text-gray-300")}>
                        {formatUSD(m.cost_per_ml)}
                        {isMin && <span className="text-[9px] block text-emerald-500">mais barato</span>}
                        {isMax && <span className="text-[9px] block text-rose-500">mais caro</span>}
                      </td>
                    )
                  })}
                </CompRow>
                <CompRow label="Aplicações">
                  {selectedMaterials.map(m => (
                    <td key={m.name} className="text-center px-3 py-2.5">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {m.applications.slice(0, 3).map(a => (
                          <span key={a} className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 rounded-md text-blue-400">{a}</span>
                        ))}
                        {m.applications.length > 3 && (
                          <span className="text-[9px] text-gray-500">+{m.applications.length - 3}</span>
                        )}
                      </div>
                    </td>
                  ))}
                </CompRow>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Material Detail Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {selectedMaterials.map(m => (
          <div key={m.name} className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
            <button
              onClick={() => setExpandedDetail(expandedDetail === m.name ? null : m.name)}
              className="w-full p-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Beaker className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-white">{m.name}</p>
                <p className="text-[10px] text-gray-500">{m.category}</p>
              </div>
              {expandedDetail === m.name ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            {expandedDetail === m.name && (
              <div className="px-4 pb-4 border-t border-white/[0.06] pt-3 space-y-3">
                {/* Ideal for banner */}
                <div className="p-2.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
                  <div className="flex items-start gap-2">
                    <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-emerald-300 leading-relaxed">{m.idealFor}</p>
                  </div>
                </div>

                <RangeBar min={m.elasticity_kPa[0]} max={m.elasticity_kPa[1]} label="Elasticidade" unit="kPa" color="blue" />
                <RangeBar min={m.porosity_percent[0]} max={m.porosity_percent[1]} label="Porosidade" unit="%" color="violet" />
                <RangeBar min={m.degradation_weeks[0]} max={m.degradation_weeks[1]} label="Degradação" unit="semanas" color="amber" />
                
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Biocompatibilidade</span>
                  <StarRating value={m.biocompatibility} size="md" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Printabilidade</span>
                  <StarRating value={m.printability} size="md" />
                </div>

                {/* Additional info */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2 text-[11px]">
                    <Droplets className="w-3 h-3 text-blue-400 shrink-0" />
                    <span className="text-gray-500">Crosslinking:</span>
                    <span className="text-gray-300">{m.crosslinking}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <Activity className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="text-gray-500">Viabilidade:</span>
                    <span className="text-emerald-400">{m.cellViability}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <Thermometer className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="text-gray-500">Armazenamento:</span>
                    <span className="text-gray-300">{m.storageTemp}</span>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-emerald-500 uppercase tracking-wider mb-1.5">Vantagens</p>
                  {m.pros.map((p, i) => (
                    <p key={i} className="text-xs text-gray-300 flex items-start gap-1.5 mb-0.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />{p}
                    </p>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] text-amber-500 uppercase tracking-wider mb-1.5">Limitações</p>
                  {m.cons.map((c, i) => (
                    <p key={i} className="text-xs text-gray-400 flex items-start gap-1.5 mb-0.5">
                      <AlertCircle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />{c}
                    </p>
                  ))}
                </div>
                {/* References */}
                <div className="pt-1 border-t border-white/[0.04]">
                  <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Referências</p>
                  {m.references.map((r, i) => (
                    <p key={i} className="text-[10px] text-gray-500">{r}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick recommendation */}
      {selectedMaterials.length >= 2 && (
        <div className="rounded-xl border border-blue-500/10 bg-blue-500/[0.03] p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-blue-300 mb-1">Recomendação BIA</p>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {(() => {
                  const cheapest = [...selectedMaterials].sort((a, b) => a.cost_per_ml - b.cost_per_ml)[0]
                  const bestBio = [...selectedMaterials].sort((a, b) => b.biocompatibility - a.biocompatibility)[0]
                  const bestPrint = [...selectedMaterials].sort((a, b) => b.printability - a.printability)[0]
                  return `Melhor custo-benefício: ${cheapest.name} (${formatUSD(cheapest.cost_per_ml)}/mL). Máxima biocompatibilidade: ${bestBio.name} (${bestBio.biocompatibility}/5). Melhor printabilidade: ${bestPrint.name} (${bestPrint.printability}/5). Para blend, considere combinar ${cheapest.name} com ${bestBio.name !== cheapest.name ? bestBio.name : bestPrint.name} para otimizar propriedades.`
                })()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CompRow({ label, children, highlight }: { label: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <tr className={cn("border-b border-white/[0.04]", highlight && "bg-white/[0.02]")}>
      <td className="text-left text-[10px] text-gray-500 px-4 py-2.5 font-medium">{label}</td>
      {children}
    </tr>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   COST CALCULATOR COMPONENT — Enhanced
═══════════════════════════════════════════════════════════════════════════ */
function CostCalculator() {
  const [form, setForm] = useState<CostInput>(DEFAULT_COST)
  const [showBreakdown, setShowBreakdown] = useState(true)
  const [showPresets, setShowPresets] = useState(false)
  const [copied, setCopied] = useState(false)

  const bioinkCost = (BIOMATERIALS_DB.find(b => b.name === form.bioinkMaterial)?.cost_per_ml ?? 12.5) * form.bioinkVolume_mL
  const cellCost = (CELL_COSTS[form.cellSource] ?? 0.8) * form.cellCount_millions
  const machineCost = form.printTime_hours * form.machineHourRate
  const laborCost = form.laborHours * form.laborRate
  const qcCost = form.qcTests * form.qcCostPerTest
  const cultureCost = form.cultureWeeks * form.cultureCostPerWeek
  const subtotal = bioinkCost + cellCost + form.crosslinkerCost + machineCost + laborCost + form.consumables + qcCost + cultureCost
  const overhead = subtotal * (form.overheadPercent / 100)
  const total = subtotal + overhead

  const breakdownColors: Record<string, string> = {
    "Bioink": "blue",
    "Células": "violet",
    "Crosslinker": "emerald",
    "Máquina": "indigo",
    "Mão de obra": "amber",
    "Consumíveis": "rose",
    "QC/Testes": "purple",
    "Cultura": "teal",
    "Overhead": "gray",
  }

  const breakdownIcons: Record<string, typeof FlaskConical> = {
    "Bioink": FlaskConical,
    "Células": Beaker,
    "Crosslinker": Zap,
    "Máquina": Printer,
    "Mão de obra": Clock,
    "Consumíveis": Wrench,
    "QC/Testes": CheckCircle2,
    "Cultura": Layers,
    "Overhead": TrendingUp,
  }

  const breakdown = [
    { label: "Bioink",        value: bioinkCost,    pct: (bioinkCost / total) * 100 },
    { label: "Células",       value: cellCost,      pct: (cellCost / total) * 100 },
    { label: "Crosslinker",   value: form.crosslinkerCost, pct: (form.crosslinkerCost / total) * 100 },
    { label: "Máquina",       value: machineCost,   pct: (machineCost / total) * 100 },
    { label: "Mão de obra",   value: laborCost,     pct: (laborCost / total) * 100 },
    { label: "Consumíveis",   value: form.consumables, pct: (form.consumables / total) * 100 },
    { label: "QC/Testes",     value: qcCost,        pct: (qcCost / total) * 100 },
    { label: "Cultura",       value: cultureCost,   pct: (cultureCost / total) * 100 },
    { label: "Overhead",      value: overhead,      pct: (overhead / total) * 100 },
  ]

  const update = (key: keyof CostInput, value: string | number) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function applyPreset(preset: typeof COST_PRESETS[0]) {
    setForm(prev => ({ ...prev, ...preset.values }))
    setShowPresets(false)
  }

  function copyCostText() {
    const text = `Estimativa de Custo — BIA v4\n\nBioink: ${form.bioinkMaterial} (${form.bioinkVolume_mL} mL) = ${formatUSD(bioinkCost)}\nCélulas: ${form.cellSource} (${form.cellCount_millions}M) = ${formatUSD(cellCost)}\nMáquina: ${form.printTime_hours}h @ ${formatUSD(form.machineHourRate)}/h = ${formatUSD(machineCost)}\nMão de obra: ${form.laborHours}h @ ${formatUSD(form.laborRate)}/h = ${formatUSD(laborCost)}\nQC: ${form.qcTests}x testes = ${formatUSD(qcCost)}\nCultura: ${form.cultureWeeks} sem = ${formatUSD(cultureCost)}\nSubtotal: ${formatUSD(subtotal)}\nOverhead (${form.overheadPercent}%): ${formatUSD(overhead)}\n\nTOTAL: ${formatUSD(total)} (≈ ${formatBRL(total * 5.2)})`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inputClass = "w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/40 transition-colors"
  const labelClass = "text-[11px] text-gray-400 block mb-1"

  // Color classes for breakdown
  const colorClasses: Record<string, { bg: string; border: string; text: string; bar: string }> = {
    blue:    { bg: "bg-blue-500/10",    border: "border-blue-500/20",    text: "text-blue-400",    bar: "bg-blue-500/50" },
    violet:  { bg: "bg-violet-500/10",  border: "border-violet-500/20",  text: "text-violet-400",  bar: "bg-violet-500/50" },
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", bar: "bg-emerald-500/50" },
    indigo:  { bg: "bg-indigo-500/10",  border: "border-indigo-500/20",  text: "text-indigo-400",  bar: "bg-indigo-500/50" },
    amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/20",   text: "text-amber-400",   bar: "bg-amber-500/50" },
    rose:    { bg: "bg-rose-500/10",    border: "border-rose-500/20",    text: "text-rose-400",    bar: "bg-rose-500/50" },
    purple:  { bg: "bg-purple-500/10",  border: "border-purple-500/20",  text: "text-purple-400",  bar: "bg-purple-500/50" },
    teal:    { bg: "bg-teal-500/10",    border: "border-teal-500/20",    text: "text-teal-400",    bar: "bg-teal-500/50" },
    gray:    { bg: "bg-gray-500/10",    border: "border-gray-500/20",    text: "text-gray-400",    bar: "bg-gray-500/50" },
  }

  return (
    <div className="space-y-5">

      {/* Total Card */}
      <div className="rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/[0.08] to-orange-500/[0.05] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-400/70 uppercase tracking-wider mb-1">Custo Total Estimado</p>
            <p className="text-3xl sm:text-4xl font-bold text-white">{formatUSD(total)}</p>
            <p className="text-xs text-gray-500 mt-1">≈ {formatBRL(total * 5.2)} (câmbio ref.)</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <DollarSign className="w-7 h-7 text-amber-400" />
            </div>
            <div className="flex gap-1.5">
              <button onClick={copyCostText}
                className="flex items-center gap-1 px-2 py-1 bg-white/[0.06] hover:bg-white/[0.1] text-gray-400 hover:text-white rounded-lg text-[10px] font-medium transition-all border border-white/[0.06]">
                {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
              </button>
              <button onClick={() => generateCostPDF(form, breakdown, total, subtotal, overhead)}
                className="flex items-center gap-1 px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 rounded-lg text-[10px] font-medium transition-all border border-amber-500/20">
                <FileDown className="w-2.5 h-2.5" /> PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Templates Rápidos
          </h3>
          {showPresets ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>
        {showPresets && (
          <div className="px-4 pb-4 border-t border-white/[0.06] pt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {COST_PRESETS.map((preset) => (
              <button key={preset.label}
                onClick={() => applyPreset(preset)}
                className="text-left p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:border-amber-500/25 hover:bg-amber-500/[0.03] transition-all active:scale-[0.98]">
                <p className="text-xs font-semibold text-white mb-0.5">{preset.label}</p>
                <p className="text-[10px] text-gray-500">{preset.desc}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-amber-400" />
            Parâmetros do Projeto
          </h3>
          <button onClick={() => setForm(DEFAULT_COST)}
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-white transition-colors">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Material do Bioink</label>
            <select value={form.bioinkMaterial} onChange={e => update("bioinkMaterial", e.target.value)}
              className={cn(inputClass, "appearance-none cursor-pointer")}>
              {BIOMATERIALS_DB.map(b => <option key={b.name} value={b.name}>{b.name} ({formatUSD(b.cost_per_ml)}/mL)</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Volume bioink (mL)</label>
            <input type="number" min={0.5} step={0.5} value={form.bioinkVolume_mL}
              onChange={e => update("bioinkVolume_mL", +e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Fonte celular</label>
            <select value={form.cellSource} onChange={e => update("cellSource", e.target.value)}
              className={cn(inputClass, "appearance-none cursor-pointer")}>
              {Object.entries(CELL_COSTS).map(([k, v]) => <option key={k} value={k}>{k} ({formatUSD(v)}/M)</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Células (milhões)</label>
            <input type="number" min={0} step={1} value={form.cellCount_millions}
              onChange={e => update("cellCount_millions", +e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Crosslinker (USD)</label>
            <input type="number" min={0} step={1} value={form.crosslinkerCost}
              onChange={e => update("crosslinkerCost", +e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Tempo impressão (h)</label>
            <input type="number" min={0.5} step={0.5} value={form.printTime_hours}
              onChange={e => update("printTime_hours", +e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Máquina (USD/h)</label>
            <input type="number" min={0} step={5} value={form.machineHourRate}
              onChange={e => update("machineHourRate", +e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Mão de obra (h)</label>
            <input type="number" min={0} step={0.5} value={form.laborHours}
              onChange={e => update("laborHours", +e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Custo/hora labor (USD)</label>
            <input type="number" min={0} step={5} value={form.laborRate}
              onChange={e => update("laborRate", +e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Consumíveis (USD)</label>
            <input type="number" min={0} step={10} value={form.consumables}
              onChange={e => update("consumables", +e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Testes QC (qtd)</label>
            <input type="number" min={0} step={1} value={form.qcTests}
              onChange={e => update("qcTests", +e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Custo/teste QC (USD)</label>
            <input type="number" min={0} step={5} value={form.qcCostPerTest}
              onChange={e => update("qcCostPerTest", +e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Cultura pós-print (sem)</label>
            <input type="number" min={0} step={1} value={form.cultureWeeks}
              onChange={e => update("cultureWeeks", +e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Custo cultura (USD/sem)</label>
            <input type="number" min={0} step={5} value={form.cultureCostPerWeek}
              onChange={e => update("cultureCostPerWeek", +e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Overhead (%)</label>
            <input type="number" min={0} max={100} step={5} value={form.overheadPercent}
              onChange={e => update("overheadPercent", +e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            Breakdown de Custos
          </h3>
          {showBreakdown ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>

        {showBreakdown && (
          <div className="px-4 pb-4 border-t border-white/[0.06] pt-3 space-y-2.5">
            {breakdown.map(item => {
              const color = breakdownColors[item.label] ?? "gray"
              const cc = colorClasses[color] ?? colorClasses.gray
              const Icon = breakdownIcons[item.label] ?? Wrench
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border", cc.bg, cc.border)}>
                    <Icon className={cn("w-3.5 h-3.5", cc.text)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-xs text-gray-300">{item.label}</span>
                      <span className="text-xs text-white font-medium">{formatUSD(item.value)}</span>
                    </div>
                    <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", cc.bar)}
                        style={{ width: `${Math.max(item.pct, 1)}%` }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500 w-8 text-right shrink-0">{item.pct.toFixed(0)}%</span>
                </div>
              )
            })}

            {/* Summary */}
            <div className="pt-3 mt-3 border-t border-white/[0.06]">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Subtotal</span>
                <span>{formatUSD(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Overhead ({form.overheadPercent}%)</span>
                <span>{formatUSD(overhead)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white mt-2 pt-2 border-t border-white/[0.06]">
                <span>Total</span>
                <span className="text-amber-400">{formatUSD(total)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>≈ BRL (câmbio ref.)</span>
                <span>{formatBRL(total * 5.2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.03] p-4">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-300 mb-1">Dicas BIA para reduzir custos</p>
            <ul className="text-[11px] text-gray-400 space-y-1 leading-relaxed">
              <li>• <strong className="text-white">Bioink:</strong> Substitua colágeno por GelMA — reduz custo em ~70%</li>
              <li>• <strong className="text-white">Blend:</strong> Use alginato como co-bioink — crosslinking dual barato e eficaz</li>
              <li>• <strong className="text-white">Volume:</strong> Otimize volume de impressão — menor volume = menos desperdício</li>
              <li>• <strong className="text-white">Células:</strong> iPSC vs primary cells — iPSC são mais baratas para grandes volumes</li>
              <li>• <strong className="text-white">QC:</strong> Automatize testes de rotina para reduzir custos de mão de obra</li>
              <li>• <strong className="text-white">Gelatina-Alginato:</strong> Para prototipagem, use blend G/A a ${formatUSD(4)}/mL — 96% mais barato que dECM</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
