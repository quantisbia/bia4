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

  generic_marlin: {
    id: "generic_marlin",
    name: "Generic Marlin Bioprinter",
    manufacturer: "DIY / Open Source",
    flavor: "marlin",
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
