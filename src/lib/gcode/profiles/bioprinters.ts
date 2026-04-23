/**
 * BIA v4.2 — Bioprinter Profiles
 *
 * Perfis calibrados para as principais bioimpressoras comerciais.
 * Cada perfil define o "dialeto" G-code e M-codes específicos.
 */

import type { BioprinterProfile } from "../core/types"

export const BIOPRINTER_PROFILES: Record<string, BioprinterProfile> = {
  cellink_biox: {
    id: "cellink_biox",
    name: "BIO X",
    manufacturer: "CELLINK",
    flavor: "cellink",
    technology: "extrusion",
    heads: 3,
    buildVolume: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 130, y: 90, z: 80 },
    },
    extrusionMode: "pressure_kpa",
    maxFeedrate: { xy: 3000, z: 600, e: 600 },
    minFeedrate: { xy: 60, z: 30, e: 30 },
    maxAcceleration: 500,
    minNozzleUm: 100,
    maxNozzleUm: 840,
    hasHeatedBed: true,
    hasUV: true,
    hasCamera: true,
    hasAutoLeveling: true,
    hasWellPlateSupport: true,
    mcodes: {
      startPrint: "M710",
      endPrint: "M711",
      pressureSet: "M773 P{kpa}",
      uvOn: "M106 P1 S255",
      uvOff: "M107 P1",
      pauseForBioink: "M600",
      wipeTower: "M712",
    },
    sbsOriginOffset: { x: 10, y: 10, z: 0 },
    notes: [
      "Suporta até 3 bioinks simultâneos (PH1, PH2, PH3)",
      "Placa de poços nativamente suportada (6/12/24/48/96)",
      "UV 365nm integrado para GelMA crosslink",
      "Clean chamber com HEPA — ideal para células",
    ],
  },

  cellink_inkredible: {
    id: "cellink_inkredible",
    name: "INKREDIBLE+",
    manufacturer: "CELLINK",
    flavor: "cellink",
    technology: "extrusion",
    heads: 2,
    buildVolume: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 130, y: 80, z: 50 },
    },
    extrusionMode: "pressure_kpa",
    maxFeedrate: { xy: 2000, z: 400, e: 400 },
    minFeedrate: { xy: 60, z: 30, e: 30 },
    maxAcceleration: 400,
    minNozzleUm: 150,
    maxNozzleUm: 840,
    hasHeatedBed: false,
    hasUV: true,
    hasCamera: false,
    hasAutoLeveling: false,
    hasWellPlateSupport: true,
    mcodes: {
      startPrint: "M710",
      pressureSet: "M773 P{kpa}",
      uvOn: "M106 P1 S255",
      uvOff: "M107 P1",
    },
    sbsOriginOffset: { x: 8, y: 8, z: 0 },
    notes: [
      "Entry-level CELLINK, 2 cabeçotes pneumáticos",
      "Ideal para laboratórios de ensino",
      "Não tem bed aquecido",
    ],
  },

  allevi_2: {
    id: "allevi_2",
    name: "Allevi 2",
    manufacturer: "Allevi (3D Systems)",
    flavor: "allevi",
    technology: "extrusion",
    heads: 2,
    buildVolume: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 110, y: 70, z: 60 },
    },
    extrusionMode: "pressure_kpa",
    maxFeedrate: { xy: 2000, z: 400, e: 400 },
    minFeedrate: { xy: 60, z: 30, e: 30 },
    maxAcceleration: 400,
    minNozzleUm: 100,
    maxNozzleUm: 840,
    hasHeatedBed: true,
    hasUV: true,
    hasCamera: false,
    hasAutoLeveling: true,
    hasWellPlateSupport: true,
    mcodes: {
      startPrint: "G28",
      pressureSet: "M751 S{kpa}",
      uvOn: "M106 P1 S255",
      uvOff: "M107 P1",
    },
    sbsOriginOffset: { x: 5, y: 5, z: 0 },
    notes: [
      "Bioprinter educacional e de pesquisa",
      "Suporta Ø 22 mm (well 12) e 24-well",
      "Controle via Allevi Bioprint™ (mas aceita G-code genérico)",
    ],
  },

  allevi_3: {
    id: "allevi_3",
    name: "Allevi 3",
    manufacturer: "Allevi (3D Systems)",
    flavor: "allevi",
    technology: "extrusion",
    heads: 3,
    buildVolume: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 120, y: 80, z: 65 },
    },
    extrusionMode: "pressure_kpa",
    maxFeedrate: { xy: 2500, z: 500, e: 500 },
    minFeedrate: { xy: 60, z: 30, e: 30 },
    maxAcceleration: 500,
    minNozzleUm: 100,
    maxNozzleUm: 840,
    hasHeatedBed: true,
    hasUV: true,
    hasCamera: true,
    hasAutoLeveling: true,
    hasWellPlateSupport: true,
    mcodes: {
      startPrint: "G28",
      pressureSet: "M751 S{kpa}",
      uvOn: "M106 P1 S255",
      uvOff: "M107 P1",
    },
    sbsOriginOffset: { x: 5, y: 5, z: 0 },
    notes: [
      "3 cabeçotes, suporta bioinks multi-material",
      "Câmera integrada para monitoramento",
      "Suporte robusto para well-plates 24/48/96",
    ],
  },

  regemat_bio_v1: {
    id: "regemat_bio_v1",
    name: "REGEMAT 3D V1",
    manufacturer: "REGEMAT 3D",
    flavor: "regemat",
    technology: "extrusion",
    heads: 2,
    buildVolume: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 150, y: 150, z: 150 },
    },
    extrusionMode: "volumetric_ul",
    maxFeedrate: { xy: 3000, z: 600, e: 600 },
    minFeedrate: { xy: 60, z: 30, e: 30 },
    maxAcceleration: 500,
    minNozzleUm: 100,
    maxNozzleUm: 1000,
    hasHeatedBed: true,
    hasUV: true,
    hasCamera: true,
    hasAutoLeveling: true,
    hasWellPlateSupport: true,
    mcodes: {
      startPrint: "G28",
      pressureSet: "M104 S{kpa}",
      uvOn: "M106 P1 S255",
      uvOff: "M107 P1",
    },
    notes: [
      "Build volume grande — ideal para scaffolds ortopédicos",
      "Suporta extrusão volumétrica e pressão",
    ],
  },

  envisiontec_perfactory_p4k: {
    id: "envisiontec_perfactory_p4k",
    name: "Perfactory P4K DSP",
    manufacturer: "EnvisionTEC (Desktop Metal)",
    flavor: "envisiontec",
    technology: "dlp_sla",
    heads: 1,  // DLP tem um único projetor
    buildVolume: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 134, y: 84, z: 180 },
    },
    extrusionMode: "pressure_kpa",  // não se aplica a DLP, mas mantemos p/ compat
    // Mecânica Z (subida incremental entre camadas)
    maxFeedrate: { xy: 0, z: 300, e: 0 },  // DLP não move XY
    minFeedrate: { xy: 0, z: 10, e: 0 },
    maxAcceleration: 100,
    minNozzleUm: 40,   // = pixelSize_um
    maxNozzleUm: 40,
    hasHeatedBed: false,
    hasUV: true,       // projetor UV é a fonte de exposição
    hasCamera: true,
    hasAutoLeveling: false,
    hasWellPlateSupport: false,
    dlp: {
      projector: "385nm_dlp",
      resolution_px: { x: 3840, y: 2400 },
      pixelSize_um: 35,
      buildAreaMax_mm: { x: 134, y: 84 },
      minLayerHeight_um: 25,
      maxLayerHeight_um: 150,
      minExposureTime_s: 0.8,
      maxExposureTime_s: 30,
      supportedResins: [
        "GelMA-LAP",
        "GelMA-I2959",
        "PEGDA-575",
        "PEGDA-700",
        "HEMA",
        "E-Shell 600 (biocompatible resin)",
        "Clear Guide (transparent biocompatible)",
      ],
      tiltAngle_deg: 3,
      hasO2Permeation: false,
    },
    mcodes: {
      startPrint: "M110 N0",            // init DLP
      endPrint: "M84",
      projectImage: "PROJECT S{intensity}",  // acionar projetor
      layerExposure: "G4 P{ms}",             // tempo de exposição (dwell)
      vatTilt: "M3 S{angle}",                // tilt do vat para peeling
      buildPlateLift: "G1 Z{dz} F300",       // erguer build plate
    },
    notes: [
      "DLP/SLA 385nm — impressão por fotopolimerização camada-a-camada",
      "RESOLUÇÃO XY: 35 µm/pixel (3840×2400 = 4K DLP)",
      "NÃO USA BIOINK DE EXTRUSÃO — usa resinas fotopolimerizáveis",
      "Ideal para GelMA + fotoiniciador (LAP ou I2959 a 0.05-0.1%)",
      "Suporta microestruturas < 50 µm (mais fino que extrusão)",
      "Sequência por camada: tilt vat → subir plate → descer (newlayer) → projetar imagem → dwell exposição",
      "Tempo total de impressão depende apenas de N_layers × t_exposure (não depende da área)",
      "Pouca shear stress → melhor viabilidade celular em suspensão",
    ],
  },

  envisiontec_3dbioplotter: {
    id: "envisiontec_3dbioplotter",
    name: "3D-Bioplotter Manufacturer Series",
    manufacturer: "EnvisionTEC (Desktop Metal)",
    flavor: "envisiontec",
    technology: "extrusion",  // este modelo é extrusão, não DLP
    heads: 5,
    buildVolume: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 150, y: 150, z: 140 },
    },
    extrusionMode: "pressure_kpa",
    maxFeedrate: { xy: 2500, z: 500, e: 400 },
    minFeedrate: { xy: 60, z: 30, e: 30 },
    maxAcceleration: 400,
    minNozzleUm: 100,
    maxNozzleUm: 1200,
    hasHeatedBed: true,
    hasUV: true,
    hasCamera: true,
    hasAutoLeveling: true,
    hasWellPlateSupport: true,
    mcodes: {
      startPrint: "G28",
      pressureSet: "M751 P{head} S{kpa}",
      uvOn: "M106 P2 S255",
      uvOff: "M107 P2",
      pauseForBioink: "M0",
    },
    sbsOriginOffset: { x: 10, y: 10, z: 0 },
    notes: [
      "3D-Bioplotter: 5 cabeçotes pneumáticos (temp -10°C a 250°C)",
      "Suporta materiais termosensíveis (PCL, PLA, colágeno gelificado)",
      "Sistema de UV modular acoplável ao cabeçote",
      "Certificação GMP-ready (FDA 21 CFR Part 11)",
      "Ideal para scaffolds multi-material com bioinks e polímeros sintéticos",
    ],
  },

  generic_marlin: {
    id: "generic_marlin",
    name: "Generic Marlin Bioprinter",
    manufacturer: "DIY / Open Source",
    flavor: "marlin",
    technology: "extrusion",
    heads: 1,
    buildVolume: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 200, y: 200, z: 100 },
    },
    extrusionMode: "filament_mm",
    maxFeedrate: { xy: 3000, z: 600, e: 600 },
    minFeedrate: { xy: 60, z: 30, e: 30 },
    maxAcceleration: 1000,
    minNozzleUm: 200,
    maxNozzleUm: 1500,
    hasHeatedBed: true,
    hasUV: false,
    hasCamera: false,
    hasAutoLeveling: true,
    hasWellPlateSupport: false,
    mcodes: {
      startPrint: "G28",
    },
    notes: [
      "Bioprinter customizada compatível com Marlin",
      "Aceita todos os G-codes padrão RepRap",
    ],
  },
}

export function listBioprinters(): BioprinterProfile[] {
  return Object.values(BIOPRINTER_PROFILES)
}

export function getBioprinter(id: string): BioprinterProfile {
  const bp = BIOPRINTER_PROFILES[id]
  if (!bp) throw new Error(`Unknown bioprinter: ${id}`)
  return bp
}
