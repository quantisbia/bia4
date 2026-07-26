/**
 * material-database.ts
 * Catálogo de materiais de bioimpressão extraído da CECT 3D Printing DB.
 *
 * Gerado automaticamente por scripts/parse_cect_csv.py a partir de
 * cect-3d-printing-db-todos-os-materiais.csv (808 linhas)
 *
 * NÃO EDITAR MANUALMENTE. Rode `python scripts/parse_cect_csv.py` para regenerar.
 *
 * Total de entradas parseadas:  803
 * Total de entradas únicas (dedupe por material+%):  298
 * Total de materiais únicos (canônicos):  128
 *
 * R12.55 — Motor Básico usa este catálogo para popular presets e validar faixas.
 */

// ============================================================================
// Types
// ============================================================================

export interface MaterialComponent {
  material: string
  value: number | null
  unit: string  // '%w' | 'mg/mL' | 'kDa' | ''
}

export interface RangeValue {
  min: number
  max: number
  unit: string
}

export interface NeedleSpec {
  kind: 'gauge' | 'diameter_um' | 'unknown'
  gauge?: number | null
  diameter_um?: number | null
  geometry?: 'cylindrical' | 'conical' | null
}

export interface CellSpec {
  cellType: string
  density_M_per_mL: number | null
}

export interface MaterialEntry {
  id: string
  doi: string
  components: MaterialComponent[]
  pressure: RangeValue | null
  temperatureC: number | null
  speed_mm_s: RangeValue | null
  needle: NeedleSpec | null
  cells: CellSpec | null
}

export interface MaterialSummary {
  material: string
  count: number
  entryIds: string[]
  pressureKPa: RangeValue | null
  temperatureC: RangeValue | null
  speedMmS: RangeValue | null
}

// ============================================================================
// Data (compacto — dedupe por material+% para reduzir bundle size)
// ============================================================================

export const MATERIAL_DATABASE: MaterialEntry[] = [
  {
    "id": "cect_0000",
    "doi": "10.1002/jbm.b.34347",
    "components": [
      {
        "material": "Polystyrene",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 900.0,
      "max": 900.0,
      "unit": "kPa"
    },
    "temperatureC": 155.0,
    "speed_mm_s": {
      "min": 3.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0001",
    "doi": "10.1002/jbm.b.34347",
    "components": [
      {
        "material": "Sugar Glass",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 70.0,
      "max": 80.0,
      "unit": "kPa"
    },
    "temperatureC": 150.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 30.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 300.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0002",
    "doi": "10.1021/acsbiomaterials.6b00031",
    "components": [
      {
        "material": "GelMA",
        "value": 5.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.5,
      "max": 0.5,
      "unit": "bar"
    },
    "temperatureC": 23.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": {
      "cellType": "Células BeWo da placenta",
      "density_M_per_mL": 10.0
    }
  },
  {
    "id": "cect_0003",
    "doi": "10.1021/acsbiomaterials.6b00031",
    "components": [
      {
        "material": "GelMA",
        "value": 10.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.7,
      "max": 0.7,
      "unit": "bar"
    },
    "temperatureC": 28.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": {
      "cellType": "Células BeWo da placenta",
      "density_M_per_mL": 10.0
    }
  },
  {
    "id": "cect_0055",
    "doi": "10.1016/j.bprint.2020.e00076",
    "components": [
      {
        "material": "GelMA",
        "value": 7.5,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.4,
      "max": 0.4,
      "unit": "bar"
    },
    "temperatureC": 23.0,
    "speed_mm_s": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "L929 Fibroblasts",
      "density_M_per_mL": 1.0
    }
  },
  {
    "id": "cect_0077",
    "doi": "10.1039/C9BM01271K",
    "components": [
      {
        "material": "GelMA",
        "value": 4.0,
        "unit": "%w"
      },
      {
        "material": "Chitosan",
        "value": 4.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 400.0,
      "max": 400.0,
      "unit": "kPa"
    },
    "temperatureC": 40.0,
    "speed_mm_s": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 200.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0122",
    "doi": "10.1016/j.dental.2019.08.114",
    "components": [
      {
        "material": "GelMA",
        "value": 12.5,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 120.0,
      "max": 150.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 12.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Primary Human Periodontal Ligament Cells",
      "density_M_per_mL": 2.0
    }
  },
  {
    "id": "cect_0123",
    "doi": "10.1016/j.dental.2019.08.114",
    "components": [
      {
        "material": "GelMA",
        "value": 15.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 250.0,
      "max": 280.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 8.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0178",
    "doi": "10.1016/j.msec.2019.110578",
    "components": [
      {
        "material": "GelMA",
        "value": 20.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 2.0,
      "max": 2.0,
      "unit": "bar"
    },
    "temperatureC": 20.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Primary Sheep Chondrocytes",
      "density_M_per_mL": 10.0
    }
  },
  {
    "id": "cect_0660",
    "doi": "10.1021/acsami.0c07212",
    "components": [
      {
        "material": "GelMA",
        "value": 13.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 225.0,
      "max": 225.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 800.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": {
      "cellType": "Bone Marrow Stromal Stem Cells",
      "density_M_per_mL": 5.0
    }
  },
  {
    "id": "cect_0686",
    "doi": "10.1039/d0bm01784a",
    "components": [
      {
        "material": "GelMA",
        "value": 6.0,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 3.6,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 3.5,
      "max": 3.5,
      "unit": "bar"
    },
    "temperatureC": 27.0,
    "speed_mm_s": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0721",
    "doi": "10.1002/adhm.201601451",
    "components": [
      {
        "material": "GelMA",
        "value": 3.0,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 21.0,
    "speed_mm_s": {
      "min": 6.667,
      "max": 6.667,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Human Umbilical Vein Endothelial Cells",
      "density_M_per_mL": 4.0
    }
  },
  {
    "id": "cect_0006",
    "doi": "10.1088/1758-5090/ab078a",
    "components": [
      {
        "material": "Fibrinogen",
        "value": 10.0,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 5.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.5,
      "max": 2.0,
      "unit": "bar"
    },
    "temperatureC": 26.0,
    "speed_mm_s": {
      "min": 2.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0043",
    "doi": "10.1016/j.actbio.2018.02.007",
    "components": [
      {
        "material": "Fibrinogen",
        "value": 20.0,
        "unit": "mg/mL"
      },
      {
        "material": "Gelatin",
        "value": 30.0,
        "unit": "mg/mL"
      },
      {
        "material": "Hyaluronic Acid",
        "value": 3.0,
        "unit": "mg/mL"
      },
      {
        "material": "Glicerol",
        "value": 10.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 100.0,
      "max": 100.0,
      "unit": "kPa"
    },
    "temperatureC": 18.0,
    "speed_mm_s": {
      "min": 1.67,
      "max": 1.67,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 200.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0215",
    "doi": "10.1016/j.actbio.2016.12.008",
    "components": [
      {
        "material": "Fibrinogen",
        "value": 30.0,
        "unit": "mg/mL"
      },
      {
        "material": "Gelatin",
        "value": 35.0,
        "unit": "mg/mL"
      },
      {
        "material": "Hyaluronic Acid",
        "value": 3.0,
        "unit": "mg/mL"
      }
    ],
    "pressure": {
      "min": 60.0,
      "max": 60.0,
      "unit": "kPa"
    },
    "temperatureC": 18.0,
    "speed_mm_s": {
      "min": 1.67,
      "max": 8.34,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 300.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": {
      "cellType": "Primary Rabbit Bladder Urothelial Cells",
      "density_M_per_mL": 10.0
    }
  },
  {
    "id": "cect_0008",
    "doi": "10.1088/1758-5090/ab078a",
    "components": [
      {
        "material": "PCL",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 5.0,
      "max": 5.0,
      "unit": "bar"
    },
    "temperatureC": 120.0,
    "speed_mm_s": {
      "min": 2.0,
      "max": 2.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0012",
    "doi": "10.1089/ten.tec.2019.0112",
    "components": [
      {
        "material": "PCL",
        "value": 85.0,
        "unit": "%w"
      },
      {
        "material": "Hydroxyapatite",
        "value": 15.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 4.5,
      "max": 4.5,
      "unit": "bar"
    },
    "temperatureC": 160.0,
    "speed_mm_s": {
      "min": 1.2,
      "max": 1.2,
      "unit": ""
    },
    "needle": {
      "kind": "gauge",
      "diameter_um": null,
      "gauge": 22,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0015",
    "doi": "10.1089/ten.tec.2019.0112",
    "components": [
      {
        "material": "PCL",
        "value": 70.0,
        "unit": "%w"
      },
      {
        "material": "Hydroxyapatite",
        "value": 30.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 5.0,
      "max": 5.0,
      "unit": "bar"
    },
    "temperatureC": 160.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    },
    "needle": {
      "kind": "gauge",
      "diameter_um": null,
      "gauge": 22,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0056",
    "doi": "10.1089/ten.tea.2019.0204",
    "components": [
      {
        "material": "PCL",
        "value": 90.0,
        "unit": "%w"
      },
      {
        "material": "Hydroxyapatite",
        "value": 10.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 5.2,
      "max": 5.2,
      "unit": "bar"
    },
    "temperatureC": 160.0,
    "speed_mm_s": {
      "min": 1.1,
      "max": 1.1,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0057",
    "doi": "10.1089/ten.tea.2019.0204",
    "components": [
      {
        "material": "PCL",
        "value": 80.0,
        "unit": "%w"
      },
      {
        "material": "Hydroxyapatite",
        "value": 10.0,
        "unit": "%w"
      },
      {
        "material": "Beta Tricalcium Phosphate",
        "value": 10.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 6.0,
      "max": 6.0,
      "unit": "bar"
    },
    "temperatureC": 160.0,
    "speed_mm_s": {
      "min": 1.3,
      "max": 1.3,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0108",
    "doi": "10.1016/j.actbio.2014.02.041",
    "components": [
      {
        "material": "PCL",
        "value": 50.0,
        "unit": "%w"
      },
      {
        "material": "pHMGCL Methacrylated",
        "value": 50.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 500.0,
      "max": 500.0,
      "unit": "kPa"
    },
    "temperatureC": 140.0,
    "speed_mm_s": {
      "min": 4.16667,
      "max": 4.16667,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0279",
    "doi": "10.3892/mmr.2018.9076",
    "components": [
      {
        "material": "PCL",
        "value": 10.0,
        "unit": "%w"
      },
      {
        "material": "PLGA",
        "value": 90.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 650.0,
      "max": 650.0,
      "unit": "kPa"
    },
    "temperatureC": 135.0,
    "speed_mm_s": {
      "min": 1.667,
      "max": 1.667,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0285",
    "doi": "10.1016/j.actbio.2017.09.031",
    "components": [
      {
        "material": "PCL",
        "value": 66.6666,
        "unit": "%w"
      },
      {
        "material": "Calcium Polyphosphate Microparticles",
        "value": 33.3333,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 7.8,
      "max": 7.8,
      "unit": "bar"
    },
    "temperatureC": 100.0,
    "speed_mm_s": {
      "min": 3.0,
      "max": 3.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0294",
    "doi": "10.1016/j.msec.2017.05.003",
    "components": [
      {
        "material": "PCL",
        "value": 95.0,
        "unit": "%w"
      },
      {
        "material": "Nukbone",
        "value": 5.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.7,
      "max": 1.0,
      "unit": "bar"
    },
    "temperatureC": 90.0,
    "speed_mm_s": {
      "min": 0.5,
      "max": 0.7,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 800.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0453",
    "doi": "10.1111/iej.12799",
    "components": [
      {
        "material": "PCL",
        "value": 40.0,
        "unit": "%w"
      },
      {
        "material": "Biodentine",
        "value": 60.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 500.0,
      "max": 500.0,
      "unit": "kPa"
    },
    "temperatureC": 95.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0624",
    "doi": "10.1089/ten.TEC.2018.0293",
    "components": [
      {
        "material": "PCL",
        "value": 98.0,
        "unit": "%w"
      },
      {
        "material": "Lidocaine",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 450.0,
      "max": 450.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0625",
    "doi": "10.1089/ten.TEC.2018.0293",
    "components": [
      {
        "material": "PCL",
        "value": 96.0,
        "unit": "%w"
      },
      {
        "material": "Lidocaine",
        "value": 4.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 450.0,
      "max": 450.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 210.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0626",
    "doi": "10.1089/ten.TEC.2018.0293",
    "components": [
      {
        "material": "PCL",
        "value": 99.0,
        "unit": "%w"
      },
      {
        "material": "Silver Phosphate",
        "value": 1.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 450.0,
      "max": 450.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0627",
    "doi": "10.1089/ten.TEC.2018.0293",
    "components": [
      {
        "material": "PCL",
        "value": 97.0,
        "unit": "%w"
      },
      {
        "material": "Silver Phosphate",
        "value": 3.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 450.0,
      "max": 450.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 210.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0628",
    "doi": "10.1089/ten.TEC.2018.0293",
    "components": [
      {
        "material": "PCL",
        "value": 93.0,
        "unit": "%w"
      },
      {
        "material": "Lidocaine",
        "value": 4.0,
        "unit": "%w"
      },
      {
        "material": "Silver Phosphate",
        "value": 3.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 450.0,
      "max": 450.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0634",
    "doi": "10.1016/j.msec.2019.04.026",
    "components": [
      {
        "material": "PCL",
        "value": 99.9,
        "unit": "%w"
      },
      {
        "material": "Graphene Oxide",
        "value": 0.1,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 80.0,
      "max": 100.0,
      "unit": "psi"
    },
    "temperatureC": 100.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 159.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0635",
    "doi": "10.1016/j.msec.2019.04.026",
    "components": [
      {
        "material": "PCL",
        "value": 99.5,
        "unit": "%w"
      },
      {
        "material": "Graphene Oxide",
        "value": 0.5,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 80.0,
      "max": 100.0,
      "unit": "psi"
    },
    "temperatureC": 100.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 159.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0731",
    "doi": "10.1016/j.biomaterials.2020.120302",
    "components": [
      {
        "material": "PCL",
        "value": 30.0,
        "unit": "%w"
      },
      {
        "material": "Magnesium Phosphate",
        "value": 70.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 9.0,
      "max": 9.0,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0025",
    "doi": "10.1088/1758-5090/aa6370",
    "components": [
      {
        "material": "PLGA",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 9.0,
      "max": 9.0,
      "unit": "bar"
    },
    "temperatureC": 110.0,
    "speed_mm_s": {
      "min": 1.5,
      "max": 1.5,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 200.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0357",
    "doi": "10.1016/jbioactmat.2020.04.017",
    "components": [
      {
        "material": "PLGA",
        "value": 60.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 1.5,
      "max": 2.0,
      "unit": "bar"
    },
    "temperatureC": null,
    "speed_mm_s": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0362",
    "doi": "10.1016/j.bprint.2018.e00038",
    "components": [
      {
        "material": "PLGA",
        "value": 66.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 4.0,
      "max": 4.0,
      "unit": "bar"
    },
    "temperatureC": 45.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0703",
    "doi": "10.1007/s10439-021-02736-9",
    "components": [
      {
        "material": "PLGA",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 4.5,
      "max": 6.5,
      "unit": "bar"
    },
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 0.3,
      "max": 2.5,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0036",
    "doi": "10.1016/j.biomaterials.2018.09.022",
    "components": [
      {
        "material": "PLCL",
        "value": 85.0,
        "unit": "%w"
      },
      {
        "material": "PLGA",
        "value": 15.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 6.5,
      "max": 6.5,
      "unit": "bar"
    },
    "temperatureC": 155.0,
    "speed_mm_s": {
      "min": 4.2,
      "max": 4.2,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 200.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0217",
    "doi": "10.1016/j.actbio.2016.12.008",
    "components": [
      {
        "material": "PLCL",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 550.0,
      "max": 550.0,
      "unit": "kPa"
    },
    "temperatureC": 160.0,
    "speed_mm_s": {
      "min": 1.67,
      "max": 8.34,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 200.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0218",
    "doi": "10.1016/j.actbio.2016.12.008",
    "components": [
      {
        "material": "PLCL",
        "value": 50.0,
        "unit": "%w"
      },
      {
        "material": "PCL",
        "value": 50.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 760.0,
      "max": 760.0,
      "unit": "kPa"
    },
    "temperatureC": 150.0,
    "speed_mm_s": {
      "min": 1.67,
      "max": 8.34,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 200.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0037",
    "doi": "10.1088/1758-5090/8/4/045015",
    "components": [
      {
        "material": "Polyurethane",
        "value": 40.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 250.0,
      "max": 250.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 1.67,
      "max": 1.67,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 200.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0050",
    "doi": "10.1016/j.bprint.2018.e00028",
    "components": [
      {
        "material": "Polyurethane",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 1500.0,
      "max": 1500.0,
      "unit": "kPa"
    },
    "temperatureC": 160.0,
    "speed_mm_s": {
      "min": 3.0,
      "max": 3.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 200.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0384",
    "doi": "10.1016/j.actbio.2018.01.044",
    "components": [
      {
        "material": "Polyurethane",
        "value": 25.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 80.0,
      "max": 80.0,
      "unit": "kPa"
    },
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0038",
    "doi": "10.1038/nbt.3413",
    "components": [
      {
        "material": "Gelatin",
        "value": 35.0,
        "unit": "mg/mL"
      },
      {
        "material": "Fibrinogen",
        "value": 20.0,
        "unit": "mg/mL"
      },
      {
        "material": "Hyaluronic Acid",
        "value": 3.0,
        "unit": "mg/mL"
      },
      {
        "material": "Glicerol",
        "value": 10.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 50.0,
      "max": 80.0,
      "unit": "kPa"
    },
    "temperatureC": 18.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 3.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 300.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0039",
    "doi": "10.1038/nbt.3413",
    "components": [
      {
        "material": "Gelatin",
        "value": 45.0,
        "unit": "mg/mL"
      },
      {
        "material": "Fibrinogen",
        "value": 30.0,
        "unit": "mg/mL"
      },
      {
        "material": "Hyaluronic Acid",
        "value": 3.0,
        "unit": "mg/mL"
      },
      {
        "material": "Glicerol",
        "value": 10.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 50.0,
      "max": 80.0,
      "unit": "kPa"
    },
    "temperatureC": 18.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 3.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 300.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0115",
    "doi": "10.1088/1758-5090/aacdc7",
    "components": [
      {
        "material": "Gelatin",
        "value": 8.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 60.0,
      "max": 60.0,
      "unit": "kPa"
    },
    "temperatureC": 21.0,
    "speed_mm_s": {
      "min": 3.3333,
      "max": 3.3333,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0116",
    "doi": "10.1088/1758-5090/aacdc7",
    "components": [
      {
        "material": "Gelatin",
        "value": 6.0,
        "unit": "%w"
      },
      {
        "material": "Alginate",
        "value": 3.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 70.0,
      "max": 70.0,
      "unit": "kPa"
    },
    "temperatureC": 21.0,
    "speed_mm_s": {
      "min": 3.3333,
      "max": 3.3333,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0117",
    "doi": "10.1088/1758-5090/aacdc7",
    "components": [
      {
        "material": "Gelatin",
        "value": 5.0,
        "unit": "%w"
      },
      {
        "material": "Alginate",
        "value": 6.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 90.0,
      "max": 90.0,
      "unit": "kPa"
    },
    "temperatureC": 21.0,
    "speed_mm_s": {
      "min": 3.3333,
      "max": 3.3333,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0118",
    "doi": "10.1088/1758-5090/aacdc7",
    "components": [
      {
        "material": "Gelatin",
        "value": 4.0,
        "unit": "%w"
      },
      {
        "material": "Alginate",
        "value": 7.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 70.0,
      "max": 70.0,
      "unit": "kPa"
    },
    "temperatureC": 21.0,
    "speed_mm_s": {
      "min": 3.3333,
      "max": 3.3333,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0160",
    "doi": "10.1038/s41598-017-04691-9",
    "components": [
      {
        "material": "Gelatin",
        "value": 7.0,
        "unit": "%w"
      },
      {
        "material": "Alginate",
        "value": 3.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 200.0,
      "max": 200.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "MDA-MB-231 Epithelial Cells",
      "density_M_per_mL": 1.0
    }
  },
  {
    "id": "cect_0167",
    "doi": "10.1155/2020/3863428",
    "components": [
      {
        "material": "Gelatin",
        "value": 20.0,
        "unit": "%w"
      },
      {
        "material": "Alginate",
        "value": 1.25,
        "unit": "%w"
      },
      {
        "material": "Cellulose Nanofibers",
        "value": 0.25,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 3.0,
      "max": 3.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Primary Rabbit Fibrochondrocytes",
      "density_M_per_mL": 5.0
    }
  },
  {
    "id": "cect_0169",
    "doi": "10.1155/2020/3863428",
    "components": [
      {
        "material": "Gelatin",
        "value": 10.0,
        "unit": "%w"
      },
      {
        "material": "Alginate",
        "value": 1.25,
        "unit": "%w"
      },
      {
        "material": "Cellulose Nanofibers",
        "value": 0.25,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 20.0,
    "speed_mm_s": {
      "min": 3.0,
      "max": 3.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0214",
    "doi": "10.1016/j.actbio.2014.09.023",
    "components": [
      {
        "material": "Gelatin",
        "value": 15.0,
        "unit": "%w"
      },
      {
        "material": "Silk Fibroin",
        "value": 8.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 200.0,
      "max": 250.0,
      "unit": "kPa"
    },
    "temperatureC": 28.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 250.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": {
      "cellType": "Primary Human Nasal Inferior Turbinate Tissue-derived",
      "density_M_per_mL": 2.5
    }
  },
  {
    "id": "cect_0308",
    "doi": "10.1002/adfm.201908349",
    "components": [
      {
        "material": "Gelatin",
        "value": 7.5,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.7,
      "max": 1.1,
      "unit": "bar"
    },
    "temperatureC": 27.0,
    "speed_mm_s": {
      "min": 3.0,
      "max": 6.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Human Umbilical Vein Endothelial Cells",
      "density_M_per_mL": 6.0
    }
  },
  {
    "id": "cect_0318",
    "doi": "10.1016/j.jmbbm.2019.02.014",
    "components": [
      {
        "material": "Gelatin",
        "value": 50.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.8,
      "max": 0.8,
      "unit": "bar"
    },
    "temperatureC": 50.0,
    "speed_mm_s": {
      "min": 16.0,
      "max": 16.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0365",
    "doi": "10.1016/j.actbio.2020.07.016",
    "components": [
      {
        "material": "Gelatin",
        "value": 4.1,
        "unit": "%w"
      },
      {
        "material": "Alginate",
        "value": 0.8,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 30.0,
      "max": 40.0,
      "unit": "kPa"
    },
    "temperatureC": 10.0,
    "speed_mm_s": {
      "min": 2.0,
      "max": 2.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Human Mesenchymal Stem Cells",
      "density_M_per_mL": 5.0
    }
  },
  {
    "id": "cect_0768",
    "doi": "10.1631/jzus.B1900190",
    "components": [
      {
        "material": "Gelatin",
        "value": 100.0,
        "unit": "mg/mL"
      },
      {
        "material": "Alginate",
        "value": 20.0,
        "unit": "mg/mL"
      }
    ],
    "pressure": {
      "min": 0.5,
      "max": 0.8,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 250.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": {
      "cellType": "Human Corneal Epithelial Cells",
      "density_M_per_mL": 2.0
    }
  },
  {
    "id": "cect_0042",
    "doi": "10.1038/nbt.3413",
    "components": [
      {
        "material": "Pluronic F127",
        "value": 33.0,
        "unit": "%w"
      },
      {
        "material": "Glicerol",
        "value": 10.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 200.0,
      "max": 200.0,
      "unit": "kPa"
    },
    "temperatureC": 18.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 250.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0073",
    "doi": "10.1007/s10856-019-6258-2",
    "components": [
      {
        "material": "Pluronic F127",
        "value": 60.0,
        "unit": "%w"
      },
      {
        "material": "Collagen",
        "value": 6.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 50.0,
      "max": 85.0,
      "unit": "kPa"
    },
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 3.333,
      "max": 3.333,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 337.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0189",
    "doi": "10.1016/j.actbio.2019.02.038",
    "components": [
      {
        "material": "Pluronic F127",
        "value": 40.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 414.0,
      "max": 414.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 80.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0225",
    "doi": "10.1016/j.procir.2015.11.001",
    "components": [
      {
        "material": "Pluronic F127",
        "value": 25.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 1.2,
      "max": 1.2,
      "unit": "bar"
    },
    "temperatureC": 37.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 200.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0273",
    "doi": "10.1088/2057-1976/ab54a7",
    "components": [
      {
        "material": "Pluronic F127",
        "value": null,
        "unit": ""
      }
    ],
    "pressure": {
      "min": 4.2,
      "max": 4.2,
      "unit": "bar"
    },
    "temperatureC": 30.0,
    "speed_mm_s": {
      "min": 6.0,
      "max": 6.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 200.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0416",
    "doi": "10.1016/j.bprint.2020.e00092",
    "components": [
      {
        "material": "Pluronic F127",
        "value": 30.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 50.0,
      "max": 140.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 1070.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0598",
    "doi": "10.1088/1758-5090/aa90e2",
    "components": [
      {
        "material": "Pluronic F127",
        "value": 29.0,
        "unit": "%w"
      },
      {
        "material": "PEG",
        "value": 1.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 130.0,
      "max": 170.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 6.0,
      "max": 6.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 330.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0599",
    "doi": "10.1088/1758-5090/aa90e2",
    "components": [
      {
        "material": "Pluronic F127",
        "value": 28.0,
        "unit": "%w"
      },
      {
        "material": "PEG",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 120.0,
      "max": 150.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 6.0,
      "max": 6.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 330.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0600",
    "doi": "10.1088/1758-5090/aa90e2",
    "components": [
      {
        "material": "Pluronic F127",
        "value": 27.0,
        "unit": "%w"
      },
      {
        "material": "PEG",
        "value": 3.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 90.0,
      "max": 120.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 6.0,
      "max": 6.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 330.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0601",
    "doi": "10.1088/1758-5090/aa90e2",
    "components": [
      {
        "material": "Pluronic F127",
        "value": 26.0,
        "unit": "%w"
      },
      {
        "material": "PEG",
        "value": 4.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 70.0,
      "max": 90.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 6.0,
      "max": 6.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 330.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0602",
    "doi": "10.1088/1758-5090/aa90e2",
    "components": [
      {
        "material": "Pluronic F127",
        "value": 20.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 60.0,
      "max": 80.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 6.0,
      "max": 6.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 330.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0608",
    "doi": "10.3791/50632",
    "components": [
      {
        "material": "Pluronic F127",
        "value": 24.5,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 1.5,
      "max": 1.5,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 1.25,
      "max": 1.25,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0048",
    "doi": "10.1016/j.bprint.2018.e00028",
    "components": [
      {
        "material": "Hyaluronic Acid",
        "value": 3.0,
        "unit": "mg/mL"
      },
      {
        "material": "Gelatin",
        "value": 30.0,
        "unit": "mg/mL"
      },
      {
        "material": "Fibrinogen",
        "value": 20.0,
        "unit": "mg/mL"
      },
      {
        "material": "Glicerol",
        "value": 10.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 60.0,
      "max": 60.0,
      "unit": "kPa"
    },
    "temperatureC": 18.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 3.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 300.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0091",
    "doi": "10.1007/s42242-020-00076-6",
    "components": [
      {
        "material": "Hyaluronic Acid",
        "value": 2.0,
        "unit": "%w"
      },
      {
        "material": "Alginate",
        "value": 1.0,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 3.75,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 3.0,
      "max": 3.0,
      "unit": "bar"
    },
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 2.3,
      "max": 2.3,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0051",
    "doi": "10.1002/bit.26514",
    "components": [
      {
        "material": "Hydroxyapatite",
        "value": 60.0,
        "unit": "%w"
      },
      {
        "material": "Beta Tricalcium Phosphate",
        "value": 40.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 600.0,
      "max": 600.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 1.67,
      "max": 1.67,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 610.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0061",
    "doi": "10.1080/09205063.2017.1286184",
    "components": [
      {
        "material": "Hydroxyapatite",
        "value": 10.0,
        "unit": "%w"
      },
      {
        "material": "SDS/DMSO",
        "value": 3.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.4,
      "max": 0.8,
      "unit": "bar"
    },
    "temperatureC": 65.0,
    "speed_mm_s": {
      "min": 1.5,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0064",
    "doi": "10.1080/09205063.2017.1286184",
    "components": [
      {
        "material": "Hydroxyapatite",
        "value": 1.25,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.4,
      "max": 0.8,
      "unit": "bar"
    },
    "temperatureC": 65.0,
    "speed_mm_s": {
      "min": 1.5,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0065",
    "doi": "10.1080/09205063.2017.1286184",
    "components": [
      {
        "material": "Hydroxyapatite",
        "value": 2.5,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.4,
      "max": 0.8,
      "unit": "bar"
    },
    "temperatureC": 65.0,
    "speed_mm_s": {
      "min": 1.5,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0066",
    "doi": "10.1080/09205063.2017.1286184",
    "components": [
      {
        "material": "Hydroxyapatite",
        "value": 5.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.4,
      "max": 0.8,
      "unit": "bar"
    },
    "temperatureC": 65.0,
    "speed_mm_s": {
      "min": 1.5,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0777",
    "doi": "10.1016/j.jfma.2020.10.022",
    "components": [
      {
        "material": "Hydroxyapatite",
        "value": 90.0,
        "unit": "%w"
      },
      {
        "material": "PLGA",
        "value": 10.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 240.0,
      "max": 250.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    },
    "needle": null,
    "cells": null
  },
  {
    "id": "cect_0054",
    "doi": "10.1089/ten.tec.2019.0217",
    "components": [
      {
        "material": "Glass Sugar",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 70.0,
      "max": 80.0,
      "unit": "kPa"
    },
    "temperatureC": 155.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 30.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 300.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0059",
    "doi": "10.1021/acsbiomaterials.6b00026",
    "components": [
      {
        "material": "Polypropylene fumarate (PPF) [85 wt%] Diethyl fumarate (DEF) [15 wt%]",
        "value": null,
        "unit": ""
      }
    ],
    "pressure": {
      "min": 2.0,
      "max": 4.0,
      "unit": "bar"
    },
    "temperatureC": 55.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 20.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 250.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0060",
    "doi": "10.1021/acsbiomaterials.6b00026",
    "components": [
      {
        "material": "Polypropylene fumarate (PPF) [90 wt%] Diethyl fumarate (DEF) [10 wt%]",
        "value": null,
        "unit": ""
      }
    ],
    "pressure": {
      "min": 2.0,
      "max": 4.0,
      "unit": "bar"
    },
    "temperatureC": 55.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 250.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0063",
    "doi": "10.1080/09205063.2017.1286184",
    "components": [
      {
        "material": "Polypropylene fumarate (PPF) [75 wt%] Diethyl fumarate (DEF) [15 wt%]",
        "value": null,
        "unit": ""
      }
    ],
    "pressure": {
      "min": 0.3,
      "max": 0.3,
      "unit": "bar"
    },
    "temperatureC": 50.0,
    "speed_mm_s": {
      "min": 12.0,
      "max": 12.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0070",
    "doi": "10.1002/adfm.201907145",
    "components": [
      {
        "material": "PEG Norbornene",
        "value": 5.0,
        "unit": "%w"
      },
      {
        "material": "PEG Thiol",
        "value": 5.0,
        "unit": "%w"
      },
      {
        "material": "Alginate",
        "value": 4.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 3.5,
      "max": 4.5,
      "unit": "bar"
    },
    "temperatureC": 26.0,
    "speed_mm_s": {
      "min": 6.0,
      "max": 6.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0072",
    "doi": "10.1016/j.bprint.2016.08.003",
    "components": [
      {
        "material": "Cellulose Nanofibrillated",
        "value": 2.0,
        "unit": "%w"
      },
      {
        "material": "Alginate",
        "value": 0.5,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 40.0,
      "max": 40.0,
      "unit": "kPa"
    },
    "temperatureC": 23.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 300.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": {
      "cellType": "Primary Human Nasoseptal Cartilage",
      "density_M_per_mL": 20.0
    }
  },
  {
    "id": "cect_0535",
    "doi": "10.1021/acsomega.0c05036",
    "components": [
      {
        "material": "Cellulose Nanofibrillated",
        "value": 1.15,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 100.0,
      "max": 200.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 150.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0079",
    "doi": "10.1016/j.jmbbm.2017.12.018",
    "components": [
      {
        "material": "Alginate",
        "value": 5.0,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 6.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 103.0,
      "max": 103.0,
      "unit": "kPa"
    },
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0081",
    "doi": "10.1016/j.jmbbm.2017.12.018",
    "components": [
      {
        "material": "Alginate",
        "value": 7.0,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 8.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 193.0,
      "max": 193.0,
      "unit": "kPa"
    },
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0082",
    "doi": "10.1016/j.jmbbm.2017.12.018",
    "components": [
      {
        "material": "Alginate",
        "value": 9.0,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 6.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 276.0,
      "max": 276.0,
      "unit": "kPa"
    },
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0085",
    "doi": "10.1002/adhm.201801631",
    "components": [
      {
        "material": "Alginate",
        "value": 3.0,
        "unit": "%w"
      },
      {
        "material": "Methylcellulose",
        "value": 9.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 40.0,
      "max": 50.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 840.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0088",
    "doi": "10.1016/j.jmbbn.2019.06.014",
    "components": [
      {
        "material": "Alginate",
        "value": 2.0,
        "unit": "%w"
      },
      {
        "material": "Kappa Carrageenan",
        "value": 1.5,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 50.0,
      "max": 50.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 2.0,
      "max": 2.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 510.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": {
      "cellType": "Primary Rabbit Adipose-Dervied Mesenchymal Stem Cells",
      "density_M_per_mL": 5.0
    }
  },
  {
    "id": "cect_0094",
    "doi": "10.1002/term.1682",
    "components": [
      {
        "material": "Alginate",
        "value": 4.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 9.0,
      "max": 9.0,
      "unit": "kPa"
    },
    "temperatureC": 22.0,
    "speed_mm_s": {
      "min": 6.666667,
      "max": 6.666667,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 250.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": {
      "cellType": "Primary Human Nasal Septal Cartilage Chondrocyte",
      "density_M_per_mL": 1.0
    }
  },
  {
    "id": "cect_0095",
    "doi": "10.1002/term.1682",
    "components": [
      {
        "material": "Alginate",
        "value": 6.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 20.0,
      "max": 20.0,
      "unit": "kPa"
    },
    "temperatureC": 22.0,
    "speed_mm_s": {
      "min": 6.666667,
      "max": 6.666667,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 250.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": {
      "cellType": "Primary Human Nasal Septal Cartilage Chondrocyte",
      "density_M_per_mL": 1.0
    }
  },
  {
    "id": "cect_0113",
    "doi": "10.1016/j.msec.2019.110205",
    "components": [
      {
        "material": "Alginate",
        "value": 20.0,
        "unit": "mg/mL"
      },
      {
        "material": "Agarose",
        "value": 18.0,
        "unit": "mg/mL"
      }
    ],
    "pressure": {
      "min": 0.3,
      "max": 0.3,
      "unit": "bar"
    },
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 70.0,
      "max": 70.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 1600.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0136",
    "doi": "10.1038/s41598-018-26407-3",
    "components": [
      {
        "material": "Alginate",
        "value": 8.0,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 20.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 200.0,
      "max": 200.0,
      "unit": "kPa"
    },
    "temperatureC": 10.0,
    "speed_mm_s": {
      "min": 6.5,
      "max": 6.5,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 340.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": {
      "cellType": "Primary Mouse Epidermal Stem Cells",
      "density_M_per_mL": 1.0
    }
  },
  {
    "id": "cect_0137",
    "doi": "10.1038/s41598-019-55034-9",
    "components": [
      {
        "material": "Alginate",
        "value": 3.25,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 4.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 35.0,
      "max": 35.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "EGFR T790M Non Small Cell Lung Carcinoma PDX",
      "density_M_per_mL": 10.0
    }
  },
  {
    "id": "cect_0139",
    "doi": "10.1038/s41598-019-55034-9",
    "components": [
      {
        "material": "Alginate",
        "value": 3.5,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 4.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 60.0,
      "max": 60.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "EGFR T790M Non Small Cell Lung Carcinoma PDX",
      "density_M_per_mL": 10.0
    }
  },
  {
    "id": "cect_0143",
    "doi": "10.1038/s41598-019-55034-9",
    "components": [
      {
        "material": "Alginate",
        "value": 3.75,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 4.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 90.0,
      "max": 90.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "EGFR T790M Non Small Cell Lung Carcinoma PDX",
      "density_M_per_mL": 10.0
    }
  },
  {
    "id": "cect_0159",
    "doi": "10.1088/1758-5090/aa90d7",
    "components": [
      {
        "material": "Alginate",
        "value": 2.5,
        "unit": "%w"
      },
      {
        "material": "PLA Fibers",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 1.0,
      "max": 1.0,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Human Chondrocytes",
      "density_M_per_mL": 3.0
    }
  },
  {
    "id": "cect_0186",
    "doi": "10.1088/1758-5090-aa8854",
    "components": [
      {
        "material": "Alginate",
        "value": 2.8,
        "unit": "%w"
      },
      {
        "material": "Agarose",
        "value": 0.9,
        "unit": "%w"
      },
      {
        "material": "Methylcellulose",
        "value": 3.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 80.0,
      "max": 100.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 8.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "gauge",
      "diameter_um": null,
      "gauge": 1,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0199",
    "doi": "10.1088/1758-5090/aacd30",
    "components": [
      {
        "material": "Alginate",
        "value": 1.0,
        "unit": "%w"
      },
      {
        "material": "Hyaluronic Acid",
        "value": 0.5,
        "unit": "%w"
      },
      {
        "material": "Fibrinogen",
        "value": 40.0,
        "unit": "mg/mL"
      }
    ],
    "pressure": {
      "min": 30.0,
      "max": 30.0,
      "unit": "kPa"
    },
    "temperatureC": 22.0,
    "speed_mm_s": {
      "min": 9.0,
      "max": 9.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 200.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": {
      "cellType": "Primary Rat Schwann Cells",
      "density_M_per_mL": 1.0
    }
  },
  {
    "id": "cect_0232",
    "doi": "10.1088/1758-5090/ab94d0",
    "components": [
      {
        "material": "Alginate",
        "value": 0.25,
        "unit": "%w"
      },
      {
        "material": "Cellulose Nanofibrillated",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 2.0,
      "max": 10.0,
      "unit": "psi"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 500.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": {
      "cellType": "C57BL/6 Mouse Embryonic Stem Cells",
      "density_M_per_mL": 1.0
    }
  },
  {
    "id": "cect_0236",
    "doi": "10.1088/1748-605X/ab3c74",
    "components": [
      {
        "material": "Alginate",
        "value": 0.8,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 4.1,
        "unit": "%w"
      },
      {
        "material": "Glycerol",
        "value": 10.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 40.0,
      "max": 60.0,
      "unit": "kPa"
    },
    "temperatureC": 20.0,
    "speed_mm_s": {
      "min": 2.0,
      "max": 2.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Human Mesenchymal Stem Cells",
      "density_M_per_mL": 5.0
    }
  },
  {
    "id": "cect_0237",
    "doi": "10.1088/1748-605X/ab3c74",
    "components": [
      {
        "material": "Alginate",
        "value": 1.3,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 4.1,
        "unit": "%w"
      },
      {
        "material": "Glycerol",
        "value": 10.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 40.0,
      "max": 60.0,
      "unit": "kPa"
    },
    "temperatureC": 20.0,
    "speed_mm_s": {
      "min": 2.0,
      "max": 2.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Human Mesenchymal Stem Cells",
      "density_M_per_mL": 5.0
    }
  },
  {
    "id": "cect_0238",
    "doi": "10.1088/1748-605X/ab3c74",
    "components": [
      {
        "material": "Alginate",
        "value": 1.8,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 4.1,
        "unit": "%w"
      },
      {
        "material": "Glycerol",
        "value": 10.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 40.0,
      "max": 60.0,
      "unit": "kPa"
    },
    "temperatureC": 20.0,
    "speed_mm_s": {
      "min": 2.0,
      "max": 2.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Human Mesenchymal Stem Cells",
      "density_M_per_mL": 5.0
    }
  },
  {
    "id": "cect_0239",
    "doi": "10.1088/1748-605X/ab3c74",
    "components": [
      {
        "material": "Alginate",
        "value": 2.3,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 4.1,
        "unit": "%w"
      },
      {
        "material": "Glycerol",
        "value": 10.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 40.0,
      "max": 60.0,
      "unit": "kPa"
    },
    "temperatureC": 20.0,
    "speed_mm_s": {
      "min": 2.0,
      "max": 2.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Human Mesenchymal Stem Cells",
      "density_M_per_mL": 5.0
    }
  },
  {
    "id": "cect_0255",
    "doi": "10.1016/j.actbio.2019.01.018",
    "components": [
      {
        "material": "Alginate",
        "value": 10.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 20.0,
      "max": 20.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0317",
    "doi": "10.1016/j.jmbbm.2019.02.014",
    "components": [
      {
        "material": "Alginate",
        "value": 1.5,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.1,
      "max": 0.1,
      "unit": "bar"
    },
    "temperatureC": 20.0,
    "speed_mm_s": {
      "min": 26.0,
      "max": 26.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 200.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": {
      "cellType": "Primary Rat Schwann Cells",
      "density_M_per_mL": 0.5
    }
  },
  {
    "id": "cect_0323",
    "doi": "10.1016/j.jmst.2016.01.007",
    "components": [
      {
        "material": "Alginate",
        "value": 40.0,
        "unit": "mg/mL"
      },
      {
        "material": "Gelatin",
        "value": 200.0,
        "unit": "mg/mL"
      }
    ],
    "pressure": {
      "min": 0.2,
      "max": 0.2,
      "unit": "bar"
    },
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 2.0,
      "max": 2.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0326",
    "doi": "10.1002/jbm.a.36333",
    "components": [
      {
        "material": "Alginate",
        "value": 200.0,
        "unit": "mg/mL"
      },
      {
        "material": "Silica Gel",
        "value": 200.0,
        "unit": "mg/mL"
      }
    ],
    "pressure": {
      "min": 0.5,
      "max": 0.5,
      "unit": "bar"
    },
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0434",
    "doi": "10.1016/j.carbpol.2020.116211",
    "components": [
      {
        "material": "Alginate",
        "value": 0.01,
        "unit": "%w"
      },
      {
        "material": "Clay",
        "value": 0.25,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 22.0,
      "max": 25.0,
      "unit": "psi"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 15.0,
      "max": 15.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 1000.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0435",
    "doi": "10.1021/am503878d",
    "components": [
      {
        "material": "Alginate",
        "value": 3.1,
        "unit": "%w"
      },
      {
        "material": "Ethylene Glycol",
        "value": 25.8,
        "unit": ""
      }
    ],
    "pressure": {
      "min": 0.6,
      "max": 0.6,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0462",
    "doi": "10.1007/s10439-016-1685-4",
    "components": [
      {
        "material": "Alginate",
        "value": 16.7,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 400.0,
      "max": 430.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 4.5,
      "max": 4.5,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 250.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0463",
    "doi": "10.1007/s10439-016-1685-4",
    "components": [
      {
        "material": "Alginate",
        "value": 12.548,
        "unit": "%w"
      },
      {
        "material": "Gellan Gum",
        "value": 1.716,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 450.0,
      "max": 450.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0580",
    "doi": "10.1021/acsami.7b03613",
    "components": [
      {
        "material": "Alginate",
        "value": 0.5,
        "unit": "%w"
      },
      {
        "material": "Laponite",
        "value": 6.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 22.0,
      "max": 25.0,
      "unit": "psi"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 0.75,
      "max": 1.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 250.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0629",
    "doi": "10.1088/1758-5090/ab7553",
    "components": [
      {
        "material": "Alginate",
        "value": 30.0,
        "unit": "mg/mL"
      },
      {
        "material": "Methylcellulose",
        "value": 30.0,
        "unit": "mg/mL"
      },
      {
        "material": "Agarose",
        "value": 10.0,
        "unit": "mg/mL"
      }
    ],
    "pressure": {
      "min": 300.0,
      "max": 300.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 830.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0783",
    "doi": "10.1016/j.msec.2020.111299",
    "components": [
      {
        "material": "Alginate",
        "value": 15.0,
        "unit": "%w"
      },
      {
        "material": "Hydroxyapatite",
        "value": 12.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 10.0,
      "max": 10.0,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 9.0,
      "max": 9.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0096",
    "doi": "10.1002/jbm.a.37006",
    "components": [
      {
        "material": "PCU",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 220.0,
    "speed_mm_s": {
      "min": 6.0,
      "max": 6.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 0.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0103",
    "doi": "10.1016/j.bprint.2020.e00076",
    "components": [
      {
        "material": "E-Shell 300",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.3,
      "max": 0.3,
      "unit": "bar"
    },
    "temperatureC": 22.0,
    "speed_mm_s": {
      "min": 20.0,
      "max": 20.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0474",
    "doi": "10.1089/ten.TEC.2020.0050",
    "components": [
      {
        "material": "E-Shell 300",
        "value": 70.0,
        "unit": "%w"
      },
      {
        "material": "Hydroxyapatite",
        "value": 30.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 1.0,
      "max": 1.0,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 12.0,
      "max": 12.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 600.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0105",
    "doi": "10.1002/adfm.201801331",
    "components": [
      {
        "material": "Hyaluronic Acid Adamantane",
        "value": 2.0,
        "unit": "%w"
      },
      {
        "material": "cyclodextrin",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 172.0,
      "max": 172.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 0.416667,
      "max": 0.5,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0106",
    "doi": "10.1002/adfm.201801331",
    "components": [
      {
        "material": "cyclodextrin",
        "value": 1.5,
        "unit": "%w"
      },
      {
        "material": "Hyaluronic Acid Adamantane Norbornene",
        "value": 1.5,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 172.0,
      "max": 172.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 0.416667,
      "max": 0.5,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0111",
    "doi": "10.1021/acsbiomaterials.8b00903",
    "components": [
      {
        "material": "Agarose",
        "value": 3.0,
        "unit": "%w"
      },
      {
        "material": "Alginate",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 65.0,
      "max": 75.0,
      "unit": "psi"
    },
    "temperatureC": 37.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0369",
    "doi": "10.1088/1758-5090/8/4/045002",
    "components": [
      {
        "material": "Agarose",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 200.0,
      "max": 200.0,
      "unit": "kPa"
    },
    "temperatureC": 37.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0112",
    "doi": "10.1016/j.msec.2019.110205",
    "components": [
      {
        "material": "PVA",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 180.0,
    "speed_mm_s": {
      "min": 70.0,
      "max": 70.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0283",
    "doi": "10.3390/ma11061006",
    "components": [
      {
        "material": "PVA",
        "value": 6.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 3.5,
      "max": 3.5,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 2.0,
      "max": 2.0,
      "unit": ""
    },
    "needle": null,
    "cells": null
  },
  {
    "id": "cect_0128",
    "doi": "10.1021/acsami.7b04216",
    "components": [
      {
        "material": "Methylcellulose",
        "value": 1.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.3,
      "max": 0.3,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0130",
    "doi": "10.1021/acsami.7b04216",
    "components": [
      {
        "material": "Methylcellulose",
        "value": 3.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 2.0,
      "max": 2.0,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0132",
    "doi": "10.1021/acsami.7b04216",
    "components": [
      {
        "material": "Methylcellulose",
        "value": 9.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 4.0,
      "max": 4.0,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0444",
    "doi": "10.3389/fbioe.2020.00217",
    "components": [
      {
        "material": "Methylcellulose",
        "value": 10.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 180.0,
      "max": 180.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0522",
    "doi": "10.3390/ma11040579",
    "components": [
      {
        "material": "Methylcellulose",
        "value": 8.0,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 26.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 1.45,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0134",
    "doi": "10.1021/acs.biomac.8b00696",
    "components": [
      {
        "material": "Alginate Norbornene",
        "value": 2.0,
        "unit": "%w"
      },
      {
        "material": "PEG dithiol 1500",
        "value": 10.0,
        "unit": "m"
      }
    ],
    "pressure": {
      "min": 30.0,
      "max": 30.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "L929 Fibroblasts",
      "density_M_per_mL": 3.0
    }
  },
  {
    "id": "cect_0151",
    "doi": "10.1021/acsbiomaterials.9b00167",
    "components": [
      {
        "material": "Alginate Dialdehyde",
        "value": 6.0,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.47,
      "max": 0.47,
      "unit": "bar"
    },
    "temperatureC": 26.0,
    "speed_mm_s": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0152",
    "doi": "10.1021/acsbiomaterials.9b00167",
    "components": [
      {
        "material": "Alginate Dialdehyde",
        "value": 3.0,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.12,
      "max": 0.12,
      "unit": "bar"
    },
    "temperatureC": 26.0,
    "speed_mm_s": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "RSC96 Neuronal Schwann Cells",
      "density_M_per_mL": 1.0
    }
  },
  {
    "id": "cect_0153",
    "doi": "10.1021/acsbiomaterials.9b00167",
    "components": [
      {
        "material": "Alginate Dialdehyde",
        "value": 2.0,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.1,
      "max": 0.1,
      "unit": "bar"
    },
    "temperatureC": 26.0,
    "speed_mm_s": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "RSC96 Neuronal Schwann Cells",
      "density_M_per_mL": 1.0
    }
  },
  {
    "id": "cect_0156",
    "doi": "10.1021/acsbiomaterials.9b00167",
    "components": [
      {
        "material": "Alginate Dialdehyde",
        "value": 3.75,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 3.75,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.75,
      "max": 0.75,
      "unit": "bar"
    },
    "temperatureC": 26.0,
    "speed_mm_s": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0717",
    "doi": "10.1088/1748-605X/abe55e",
    "components": [
      {
        "material": "Alginate Dialdehyde",
        "value": 30.0,
        "unit": "%w"
      },
      {
        "material": "Laponite",
        "value": 12.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 130.0,
      "max": 130.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 2.0,
      "max": 2.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0162",
    "doi": "10.1016/j.bprint.2019.e00045",
    "components": [
      {
        "material": "Alginate RGD/YIGSR",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 30.0,
      "max": 30.0,
      "unit": "kPa"
    },
    "temperatureC": null,
    "speed_mm_s": {
      "min": 18.0,
      "max": 18.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 200.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": {
      "cellType": "Primary Rat Schwann Cells",
      "density_M_per_mL": 0.2
    }
  },
  {
    "id": "cect_0165",
    "doi": "10.1039/c9tb00669a",
    "components": [
      {
        "material": "Alginate RGD",
        "value": 1.0,
        "unit": "%w"
      },
      {
        "material": "Hyaluronic Acid",
        "value": 0.5,
        "unit": "%w"
      },
      {
        "material": "Fibrinogen",
        "value": 10.0,
        "unit": "mg/mL"
      }
    ],
    "pressure": {
      "min": 10.0,
      "max": 10.0,
      "unit": "kPa"
    },
    "temperatureC": 23.0,
    "speed_mm_s": {
      "min": 4.0,
      "max": 9.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 200.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": {
      "cellType": "Primary Rat Schwann Cells",
      "density_M_per_mL": 1.0
    }
  },
  {
    "id": "cect_0181",
    "doi": "10.3390/pharmaceutics12060550",
    "components": [
      {
        "material": "Chitosan",
        "value": 1.2,
        "unit": "%w"
      },
      {
        "material": "Genipin",
        "value": 1.0,
        "unit": "%w"
      },
      {
        "material": "PEG",
        "value": 1.2,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 25.0,
      "max": 25.0,
      "unit": "kPa"
    },
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0200",
    "doi": "10.1021/acs.biomaterials.8b00804",
    "components": [
      {
        "material": "Chitosan",
        "value": 4.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.4,
      "max": 0.7,
      "unit": "bar"
    },
    "temperatureC": 20.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 20.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 580.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0233",
    "doi": "10.1002/jbm.b.34602",
    "components": [
      {
        "material": "Chitosan",
        "value": 4.5,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 25.0,
      "max": 25.0,
      "unit": "kPa"
    },
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0235",
    "doi": "10.1002/jbm.b.34602",
    "components": [
      {
        "material": "Chitosan",
        "value": 6.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 40.0,
      "max": 40.0,
      "unit": "kPa"
    },
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0441",
    "doi": "10.1016/jijbiomac.2020.08.180",
    "components": [
      {
        "material": "Chitosan",
        "value": 10.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 3.5,
      "max": 3.5,
      "unit": "bar"
    },
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 250.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0485",
    "doi": "10.1016/j.msec.2019.109873",
    "components": [
      {
        "material": "Chitosan",
        "value": 2.0,
        "unit": "%w"
      },
      {
        "material": "Pectin",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 10.7,
      "max": 15.1,
      "unit": "psi"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 6.0,
      "max": 6.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 254.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0518",
    "doi": "10.3390/jfb10010012",
    "components": [
      {
        "material": "Chitosan",
        "value": 5.0,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 6.0,
      "max": 6.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 420.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0183",
    "doi": "10.1021/acsami.6b11669",
    "components": [
      {
        "material": "Collagen",
        "value": 5.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 110.0,
      "max": 300.0,
      "unit": "kPa"
    },
    "temperatureC": 10.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 310.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": {
      "cellType": "MG63 Osteoblast-like Cells",
      "density_M_per_mL": 2.0
    }
  },
  {
    "id": "cect_0426",
    "doi": "10.1007/s10856-019-6233-y",
    "components": [
      {
        "material": "Collagen",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 15.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "NIH 3T3 Fibroblasts",
      "density_M_per_mL": 0.5
    }
  },
  {
    "id": "cect_0427",
    "doi": "10.1007/s10856-019-6233-y",
    "components": [
      {
        "material": "Collagen",
        "value": 3.0,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 15.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "NIH 3T3 Fibroblasts",
      "density_M_per_mL": 0.5
    }
  },
  {
    "id": "cect_0428",
    "doi": "10.1007/s10856-019-6233-y",
    "components": [
      {
        "material": "Collagen",
        "value": 4.0,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 15.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "NIH 3T3 Fibroblasts",
      "density_M_per_mL": 0.5
    }
  },
  {
    "id": "cect_0700",
    "doi": "10.1088/1758-5090/8/1/015015",
    "components": [
      {
        "material": "Collagen",
        "value": 14.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 1.0,
      "max": 1.0,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 0.3,
      "max": 0.3,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 610.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0187",
    "doi": "10.1016/j.actbio.2019.02.038",
    "components": [
      {
        "material": "Alginate Methacrylated",
        "value": 9.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 138.0,
      "max": 138.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 210.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": {
      "cellType": "Human Mesenchymal Stem Cells",
      "density_M_per_mL": 2.0
    }
  },
  {
    "id": "cect_0669",
    "doi": "10.1021/acsami.0c18608",
    "components": [
      {
        "material": "Alginate Methacrylated",
        "value": 5.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.4,
      "max": 0.4,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 330.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0188",
    "doi": "10.1016/j.actbio.2019.02.038",
    "components": [
      {
        "material": "Hyaluronic Acid Methacrylated",
        "value": 15.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 552.0,
      "max": 552.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 210.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": {
      "cellType": "Human Mesenchymal Stem Cells",
      "density_M_per_mL": 2.0
    }
  },
  {
    "id": "cect_0259",
    "doi": "10.1038/s41467-020-16192",
    "components": [
      {
        "material": "Hyaluronic Acid Methacrylated",
        "value": 2.0,
        "unit": "%w"
      },
      {
        "material": "GelMA",
        "value": 10.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 80.0,
      "max": 80.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 28.0,
      "max": 28.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0290",
    "doi": "10.1039/c7ra04372d",
    "components": [
      {
        "material": "Hyaluronic Acid Methacrylated",
        "value": 1.0,
        "unit": "%w"
      },
      {
        "material": "GelMA",
        "value": 4.0,
        "unit": "%w"
      },
      {
        "material": "Hyaluronic Acid",
        "value": 3.0,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 25.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Primary Porcine Stromal Vascular Fraction Cells",
      "density_M_per_mL": 4.0
    }
  },
  {
    "id": "cect_0311",
    "doi": "10.1002/adfm.201908349",
    "components": [
      {
        "material": "Hyaluronic Acid Methacrylated",
        "value": 5.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.7,
      "max": 1.1,
      "unit": "bar"
    },
    "temperatureC": 24.0,
    "speed_mm_s": {
      "min": 3.0,
      "max": 6.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0345",
    "doi": "10.1021/acsbiomaterials.8b01277",
    "components": [
      {
        "material": "Hyaluronic Acid Methacrylated",
        "value": 1.5,
        "unit": "%w"
      },
      {
        "material": "Hyaluronic Acid",
        "value": 3.0,
        "unit": "%w"
      },
      {
        "material": "GelMA",
        "value": 1.5,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 3.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 3.0,
      "max": 3.5,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 1.8,
      "max": 2.2,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "21 PT Breast Cancer Cells",
      "density_M_per_mL": 5.0
    }
  },
  {
    "id": "cect_0566",
    "doi": "10.1021/acsbiomaterials.0c00940",
    "components": [
      {
        "material": "Hyaluronic Acid Methacrylated",
        "value": 10.0,
        "unit": "mg/mL"
      },
      {
        "material": "Collagen",
        "value": 3.0,
        "unit": "mg/mL"
      }
    ],
    "pressure": {
      "min": 50.0,
      "max": 70.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0207",
    "doi": "10.1021/acs.biomac.9b01204",
    "components": [
      {
        "material": "Gelatin Norbornene",
        "value": 10.0,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 22.5,
    "speed_mm_s": {
      "min": 15.0,
      "max": 15.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "NIH 3T3 Fibroblasts",
      "density_M_per_mL": 2.0
    }
  },
  {
    "id": "cect_0557",
    "doi": "10.1016/j.actbio.2019.05.062",
    "components": [
      {
        "material": "Gelatin Norbornene",
        "value": 5.0,
        "unit": "%w"
      },
      {
        "material": "Gelatin Thiolated",
        "value": 5.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 2.3,
      "max": 2.3,
      "unit": "bar"
    },
    "temperatureC": 27.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 200.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0226",
    "doi": "10.1016/j.matdes.2018.09.040",
    "components": [
      {
        "material": "Gellan Gum",
        "value": 1.5,
        "unit": "%w"
      },
      {
        "material": "PEGDA",
        "value": 10.0,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Cell Line MC3T3-E1 Osteoblasts",
      "density_M_per_mL": 2.0
    }
  },
  {
    "id": "cect_0429",
    "doi": "10.1088/1758-5090/abc39b",
    "components": [
      {
        "material": "Gellan Gum",
        "value": 3.0,
        "unit": "%w"
      },
      {
        "material": "Alginate",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 26.0,
      "max": 26.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 13.34,
      "max": 13.34,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0430",
    "doi": "10.1088/1758-5090/abc39b",
    "components": [
      {
        "material": "Gellan Gum",
        "value": 4.0,
        "unit": "%w"
      },
      {
        "material": "Alginate",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 26.0,
      "max": 26.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 13.34,
      "max": 13.34,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0234",
    "doi": "10.1002/jbm.b.34602",
    "components": [
      {
        "material": "Poly(gamma glutamic acid) [2 wt%]",
        "value": null,
        "unit": ""
      }
    ],
    "pressure": {
      "min": 5.0,
      "max": 10.0,
      "unit": "kPa"
    },
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0246",
    "doi": "10.1016/j.actbio.2014.09.033",
    "components": [
      {
        "material": "Hyaluronic Acid pNIPAAM",
        "value": 15.0,
        "unit": "%w"
      },
      {
        "material": "Hyaluronic Acid Methacrylated",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 1.5,
      "max": 1.5,
      "unit": "bar"
    },
    "temperatureC": 23.0,
    "speed_mm_s": {
      "min": 8.333,
      "max": 8.333,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 300.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0247",
    "doi": "10.1088/1758-5090/ab02c9",
    "components": [
      {
        "material": "Pluronic F127 Thiolated",
        "value": 12.0,
        "unit": "%w"
      },
      {
        "material": "Hyaluronic Acid Dopamine Conjugated",
        "value": 1.0,
        "unit": "%w"
      },
      {
        "material": "Gelatin Dopamine Conjugated",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 2.0,
      "max": 10.0,
      "unit": "psi"
    },
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "S16Y Schwann Cells",
      "density_M_per_mL": 3.2
    }
  },
  {
    "id": "cect_0257",
    "doi": "10.1088/1748-605X/aa7692",
    "components": [
      {
        "material": "Chitosan Raffinose Modified",
        "value": 6.0,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 2.0,
    "speed_mm_s": {
      "min": 3.0,
      "max": 3.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 260.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0258",
    "doi": "10.1088/1748-605X/aa7692",
    "components": [
      {
        "material": "PLA",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 180.0,
    "speed_mm_s": {
      "min": 2.0,
      "max": 2.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 350.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0343",
    "doi": "10.1016/j.jbiotec.2018.08.019",
    "components": [
      {
        "material": "PLA",
        "value": 75.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 5.0,
      "max": 5.0,
      "unit": "bar"
    },
    "temperatureC": 230.0,
    "speed_mm_s": {
      "min": 3.0,
      "max": 3.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 600.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0292",
    "doi": "10.1016/j.bprint.2017.04.003",
    "components": [
      {
        "material": "Silicone",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 5.0,
      "max": 5.0,
      "unit": "bar"
    },
    "temperatureC": 8.0,
    "speed_mm_s": {
      "min": 6.2,
      "max": 6.2,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 200.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0312",
    "doi": "10.1002/adfm.201908349",
    "components": [
      {
        "material": "Hyaluronic Acid Norbornene",
        "value": 5.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.7,
      "max": 1.1,
      "unit": "bar"
    },
    "temperatureC": 24.0,
    "speed_mm_s": {
      "min": 3.0,
      "max": 6.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0313",
    "doi": "10.1002/apj.2360",
    "components": [
      {
        "material": "Beta Tricalcium Phosphate",
        "value": 77.0,
        "unit": "%w"
      },
      {
        "material": "Hydroxyapatite",
        "value": 19.2,
        "unit": "%w"
      },
      {
        "material": "Tripolyphosphate",
        "value": 3.2,
        "unit": "%w"
      },
      {
        "material": "Carboxymethyl Cellulose",
        "value": 0.04,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 2.0,
      "max": 2.0,
      "unit": "bar"
    },
    "temperatureC": 22.0,
    "speed_mm_s": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    },
    "needle": null,
    "cells": null
  },
  {
    "id": "cect_0333",
    "doi": "10.1089/ten.tec/2017.0346",
    "components": [
      {
        "material": "Collagen Methacrylated",
        "value": 2.34,
        "unit": "%w"
      },
      {
        "material": "Carbon Nanotubes",
        "value": 0.117,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 15.0,
    "speed_mm_s": {
      "min": 25.0,
      "max": 32.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 200.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": {
      "cellType": "Human Coronary Artery Endothelial Cells",
      "density_M_per_mL": 1.0
    }
  },
  {
    "id": "cect_0406",
    "doi": "10.1088/1758-5090/aae543",
    "components": [
      {
        "material": "Collagen Methacrylated",
        "value": 4.0,
        "unit": "mg/mL"
      },
      {
        "material": "Hyaluronic Acid Thiolated",
        "value": 0.67,
        "unit": "mg/mL"
      }
    ],
    "pressure": {
      "min": 4.0,
      "max": 4.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 50.0,
      "max": 50.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Primary Human Hepatocytes",
      "density_M_per_mL": 5.0
    }
  },
  {
    "id": "cect_0407",
    "doi": "10.1088/1758-5090/aae543",
    "components": [
      {
        "material": "Collagen Methacrylated",
        "value": 4.5,
        "unit": "mg/mL"
      },
      {
        "material": "Hyaluronic Acid Thiolated",
        "value": 0.5,
        "unit": "mg/mL"
      }
    ],
    "pressure": {
      "min": 4.0,
      "max": 4.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 50.0,
      "max": 50.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0408",
    "doi": "10.1088/1758-5090/aae543",
    "components": [
      {
        "material": "Collagen Methacrylated",
        "value": 4.8,
        "unit": "mg/mL"
      },
      {
        "material": "Hyaluronic Acid Thiolated",
        "value": 0.4,
        "unit": "mg/mL"
      }
    ],
    "pressure": {
      "min": 4.0,
      "max": 4.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 50.0,
      "max": 50.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0339",
    "doi": "10.1021/acs.biomac.9b01112",
    "components": [
      {
        "material": "PLLA",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 5.0,
      "max": 8.5,
      "unit": "bar"
    },
    "temperatureC": 220.0,
    "speed_mm_s": {
      "min": 4.0,
      "max": 45.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0340",
    "doi": "10.1021/acs.biomac.9b01112",
    "components": [
      {
        "material": "PCLA",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 7.0,
      "max": 8.5,
      "unit": "bar"
    },
    "temperatureC": 205.0,
    "speed_mm_s": {
      "min": 2.0,
      "max": 20.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0342",
    "doi": "10.1021/acs.biomac.9b01112",
    "components": [
      {
        "material": "PDLGA",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 7.0,
      "max": 8.5,
      "unit": "bar"
    },
    "temperatureC": 200.0,
    "speed_mm_s": {
      "min": 6.0,
      "max": 14.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0361",
    "doi": "10.1088/1758-5082/5/3/035001",
    "components": [
      {
        "material": "PEGDA",
        "value": 20.0,
        "unit": "%w"
      },
      {
        "material": "Alginate",
        "value": 10.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 7.0,
      "max": 13.0,
      "unit": "kPa"
    },
    "temperatureC": null,
    "speed_mm_s": {
      "min": 7.5,
      "max": 7.5,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 610.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0579",
    "doi": "10.1021/acsami.7b03613",
    "components": [
      {
        "material": "PEGDA",
        "value": 6.0,
        "unit": "%w"
      },
      {
        "material": "Laponite",
        "value": 10.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 22.0,
      "max": 25.0,
      "unit": "psi"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 0.75,
      "max": 1.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 250.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0620",
    "doi": "10.1021/acsami.9b19272",
    "components": [
      {
        "material": "PEGDA",
        "value": 7.5,
        "unit": "m"
      },
      {
        "material": "Ferric Chloride",
        "value": 22.5,
        "unit": "m"
      }
    ],
    "pressure": {
      "min": 300.0,
      "max": 300.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 2.0,
      "max": 2.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 600.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0367",
    "doi": "10.1088/1758-5090/aa6265",
    "components": [
      {
        "material": "pHPMA-lac-PEG Methacrylated",
        "value": 19.5,
        "unit": "%w"
      },
      {
        "material": "Hyaluronic Acid Methacrylated",
        "value": 0.5,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 100.0,
      "max": 130.0,
      "unit": "kPa"
    },
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 40.0,
      "max": 40.0,
      "unit": ""
    },
    "needle": null,
    "cells": null
  },
  {
    "id": "cect_0371",
    "doi": "10.1088/1758-5090/8/4/045002",
    "components": [
      {
        "material": "BioINK",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 140.0,
      "max": 140.0,
      "unit": "kPa"
    },
    "temperatureC": 21.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Bone Marrow Derived Mesenchymal Stem Cells",
      "density_M_per_mL": 20.0
    }
  },
  {
    "id": "cect_0374",
    "doi": "10.1088/1758-5090/aa8cb7",
    "components": [
      {
        "material": "Allyl Functionalized",
        "value": 5.0,
        "unit": "%w"
      },
      {
        "material": "Hyaluronic Acid Thiolated",
        "value": 5.0,
        "unit": "%w"
      },
      {
        "material": "Hyaluronic Acid",
        "value": 1.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 1.0,
      "max": 1.0,
      "unit": "bar"
    },
    "temperatureC": null,
    "speed_mm_s": null,
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 330.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": {
      "cellType": "Human Mesenchymal Stem Cells",
      "density_M_per_mL": 6.0
    }
  },
  {
    "id": "cect_0381",
    "doi": "10.1021/acsami.7b13602",
    "components": [
      {
        "material": "Nanosilicates",
        "value": 6.0,
        "unit": "%w"
      },
      {
        "material": "Kappa Carrageenan",
        "value": 2.5,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 40.0,
    "speed_mm_s": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "MC3T3-E1 Osteoblasts",
      "density_M_per_mL": null
    }
  },
  {
    "id": "cect_0386",
    "doi": "10.1088/1758-5090/aacfc3",
    "components": [
      {
        "material": "Hydroxypropyl Chitin",
        "value": 3.0,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 260.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": {
      "cellType": "Human Induced Pluripotent Stem Cells",
      "density_M_per_mL": 1.0
    }
  },
  {
    "id": "cect_0399",
    "doi": "10.1088/1758-5090/ab1452",
    "components": [
      {
        "material": "Cellink RGD Bionk",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 5.0,
      "max": 15.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 175.0,
      "max": 200.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 437.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": {
      "cellType": "Primary Juvenile Mice Interstitial Cells",
      "density_M_per_mL": 10.0
    }
  },
  {
    "id": "cect_0401",
    "doi": "10.1088/1758-5090/ab03ed",
    "components": [
      {
        "material": "Hyaluronic Acid Glycidyl Methacrylated",
        "value": 4.0,
        "unit": "%w"
      },
      {
        "material": "Alginate",
        "value": 0.5,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.5,
      "max": 0.5,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 510.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": {
      "cellType": "L929 Fibroblasts",
      "density_M_per_mL": 1.5
    }
  },
  {
    "id": "cect_0417",
    "doi": "10.1088/1758-5090/aa9ef1",
    "components": [
      {
        "material": "PEG terephthalate",
        "value": 55.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 5.0,
      "max": 5.0,
      "unit": "bar"
    },
    "temperatureC": 200.0,
    "speed_mm_s": {
      "min": 8.333,
      "max": 8.333,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0421",
    "doi": "10.1021/acs.biomac.9b00527",
    "components": [
      {
        "material": "Cellulose Nanofibrils",
        "value": 1.88,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 43.0,
      "max": 43.0,
      "unit": "kPa"
    },
    "temperatureC": null,
    "speed_mm_s": {
      "min": 12.0,
      "max": 12.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 840.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0422",
    "doi": "10.1021/acs.biomac.9b00527",
    "components": [
      {
        "material": "Nanocellulose TEMPO Oxidized",
        "value": 1.7,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 55.0,
      "max": 55.0,
      "unit": "kPa"
    },
    "temperatureC": null,
    "speed_mm_s": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 630.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0423",
    "doi": "10.1021/acs.biomac.9b00527",
    "components": [
      {
        "material": "Nanocellulose Acetylated",
        "value": 0.5,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 35.0,
      "max": 35.0,
      "unit": "kPa"
    },
    "temperatureC": null,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0438",
    "doi": "10.1088/1758-5090/ab15a9",
    "components": [
      {
        "material": "dECM Small Intestinal Submucosa",
        "value": 2.5,
        "unit": "%w"
      },
      {
        "material": "Pepsin",
        "value": 0.25,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 25.0,
      "max": 25.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 360.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0442",
    "doi": "10.1002/adma.201703404",
    "components": [
      {
        "material": "Gelatin Allylated",
        "value": 30.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 2.1,
      "max": 2.1,
      "unit": "bar"
    },
    "temperatureC": 7.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Human Articular Chondrocytes",
      "density_M_per_mL": 3.0
    }
  },
  {
    "id": "cect_0443",
    "doi": "10.3389/fbioe.2020.00217",
    "components": [
      {
        "material": "Calcium Phosphate Cement",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 150.0,
      "max": 150.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 230.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0445",
    "doi": "10.1088/1758-5090/ab1d44",
    "components": [
      {
        "material": "Poly(DTD DD) [100 wt%]",
        "value": null,
        "unit": ""
      }
    ],
    "pressure": {
      "min": 9.0,
      "max": 9.0,
      "unit": "bar"
    },
    "temperatureC": 150.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 2.5,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0447",
    "doi": "10.1016/j.msec.2019.110510",
    "components": [
      {
        "material": "Gellan Gum Methacrylated",
        "value": 4.0,
        "unit": "%w"
      },
      {
        "material": "Hyaluronic Acid Methacrylated",
        "value": 1.5,
        "unit": "%w"
      },
      {
        "material": "Hydroxyapatite",
        "value": 25.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 103.0,
      "max": 103.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 3.5833,
      "max": 3.5833,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0450",
    "doi": "10.1088/1758-5090/ab69d9",
    "components": [
      {
        "material": "Alpha Tricalcium Phosphate",
        "value": 66.0,
        "unit": "%w"
      },
      {
        "material": "Hydroxyapatite",
        "value": 4.0,
        "unit": "%w"
      },
      {
        "material": "Pluronic F127",
        "value": 40.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 200.0,
      "max": 200.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 2.0,
      "max": 2.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 250.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0461",
    "doi": "10.1007/s10439-016-1685-4",
    "components": [
      {
        "material": "Alpha Tricalcium Phosphate",
        "value": 60.0,
        "unit": "%w"
      },
      {
        "material": "Calcium Hydrogen Phosphate",
        "value": 26.0,
        "unit": "%w"
      },
      {
        "material": "Calcium Carbonate",
        "value": 10.0,
        "unit": "%w"
      },
      {
        "material": "Hyaluronic Acid",
        "value": 4.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 250.0,
      "max": 250.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 12.0,
      "max": 12.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 330.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0452",
    "doi": "10.1088/1758-5090/aba2f7",
    "components": [
      {
        "material": "Hyaluronic Acid Mono-Aldehyde",
        "value": 50.0,
        "unit": "%w"
      },
      {
        "material": "Carboxymethyl Cellulose Carbohydrazide",
        "value": 50.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 250.0,
      "max": 250.0,
      "unit": "kPa"
    },
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 2.5,
      "max": 2.5,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0458",
    "doi": "10.1088/1758-5090/aba411",
    "components": [
      {
        "material": "dECM Porcine Tendon",
        "value": 3.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 230.0,
      "max": 230.0,
      "unit": "kPa"
    },
    "temperatureC": 16.0,
    "speed_mm_s": {
      "min": 15.0,
      "max": 15.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 200.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": {
      "cellType": "Primary Rat Bone Marrow Mesenchymal Stem Cells",
      "density_M_per_mL": 3.0
    }
  },
  {
    "id": "cect_0467",
    "doi": "10.1016/j.xphs.2018.08.026",
    "components": [
      {
        "material": "Hydroxypropyl Methylcellulose",
        "value": 30.0,
        "unit": "%w"
      },
      {
        "material": "Mannitol",
        "value": 55.0,
        "unit": "%w"
      },
      {
        "material": "Polyethylene Glycol",
        "value": 10.0,
        "unit": "%w"
      },
      {
        "material": "Kollidon",
        "value": 5.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 30.0,
      "max": 60.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0468",
    "doi": "10.1016/j.xphs.2018.08.026",
    "components": [
      {
        "material": "Hydroxypropyl Methylcellulose",
        "value": 40.0,
        "unit": "%w"
      },
      {
        "material": "Mannitol",
        "value": 45.0,
        "unit": "%w"
      },
      {
        "material": "Polyethylene Glycol",
        "value": 10.0,
        "unit": "%w"
      },
      {
        "material": "Kollidon",
        "value": 5.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 30.0,
      "max": 60.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0469",
    "doi": "10.1016/j.xphs.2018.08.026",
    "components": [
      {
        "material": "Hydroxypropyl Methylcellulose",
        "value": 50.0,
        "unit": "%w"
      },
      {
        "material": "Mannitol",
        "value": 35.0,
        "unit": "%w"
      },
      {
        "material": "Polyethylene Glycol",
        "value": 10.0,
        "unit": "%w"
      },
      {
        "material": "Kollidon",
        "value": 5.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 30.0,
      "max": 60.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0503",
    "doi": "10.1248/bpb.b19-00481",
    "components": [
      {
        "material": "Hydroxypropyl Methylcellulose",
        "value": 3.0,
        "unit": "%w"
      },
      {
        "material": "Mannitol",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 20.0,
      "max": 20.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0504",
    "doi": "10.1248/bpb.b19-00481",
    "components": [
      {
        "material": "Hydroxypropyl Methylcellulose",
        "value": 4.0,
        "unit": "%w"
      },
      {
        "material": "Mannitol",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 50.0,
      "max": 50.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0505",
    "doi": "10.1248/bpb.b19-00481",
    "components": [
      {
        "material": "Hydroxypropyl Methylcellulose",
        "value": 5.0,
        "unit": "%w"
      },
      {
        "material": "Mannitol",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 70.0,
      "max": 70.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0470",
    "doi": "10.3390/pharmaceutics11070334",
    "components": [
      {
        "material": "Hydroxypropyl Cellulose",
        "value": 7.5,
        "unit": "%w"
      },
      {
        "material": "Warfarin Sodium",
        "value": 0.75,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 25.0,
      "max": 25.0,
      "unit": "psi"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0622",
    "doi": "10.1016/j.actbio.2020.11.022",
    "components": [
      {
        "material": "Hydroxypropyl Cellulose",
        "value": 5.0,
        "unit": "%w"
      },
      {
        "material": "Iron Powder",
        "value": 35.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 200.0,
      "max": 200.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0473",
    "doi": "10.1021/acsami.7b02398",
    "components": [
      {
        "material": "SU-8 2050",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 20.0,
      "max": 20.0,
      "unit": "psi"
    },
    "temperatureC": null,
    "speed_mm_s": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 250.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0477",
    "doi": "10.1021/acsami.8b00806",
    "components": [
      {
        "material": "Laponite",
        "value": 6.0,
        "unit": "%w"
      },
      {
        "material": "N-isopropylacrylamide",
        "value": 18.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 11.0,
      "max": 11.0,
      "unit": "psi"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 330.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0606",
    "doi": "10.1007/978-1-0716-0611-7_6",
    "components": [
      {
        "material": "Laponite",
        "value": 3.0,
        "unit": "%w"
      },
      {
        "material": "Alginate",
        "value": 3.0,
        "unit": "%w"
      },
      {
        "material": "Methylcellulose",
        "value": 3.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 80.0,
      "max": 95.0,
      "unit": "kPa"
    },
    "temperatureC": null,
    "speed_mm_s": null,
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0479",
    "doi": "10.1002/adma.201604827",
    "components": [
      {
        "material": "Acrylamide",
        "value": 9.05,
        "unit": "%w"
      },
      {
        "material": "MBAA",
        "value": 0.072,
        "unit": "%w"
      },
      {
        "material": "ketoglutaric acid",
        "value": 4.95,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 7.5,
      "max": 7.5,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 337.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0482",
    "doi": "10.3390/gels4030069",
    "components": [
      {
        "material": "Poloxamer 407",
        "value": 22.5,
        "unit": "%w"
      },
      {
        "material": "PEGDA",
        "value": 20.0,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 22.5,
    "speed_mm_s": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 510.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0484",
    "doi": "10.3390/bioengineering7020030",
    "components": [
      {
        "material": "Cellulose",
        "value": 20.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 14.0,
      "max": 14.0,
      "unit": "psi"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 425.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0493",
    "doi": "10.3390/gels6020013",
    "components": [
      {
        "material": "Alginate Polypyrrole",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 5.0,
      "max": 5.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 2.33,
      "max": 2.33,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 100.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0509",
    "doi": "10.1016/j.carbpol.2020.116496",
    "components": [
      {
        "material": "Hyaluronic Acid Oxidized",
        "value": 1.5,
        "unit": "%w"
      },
      {
        "material": "Glycol Chitosan",
        "value": 0.3,
        "unit": "%w"
      },
      {
        "material": "Iron Oxide Nanoparticles",
        "value": 5.0,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0513",
    "doi": "10.1016/j.actbio.2020.11.006",
    "components": [
      {
        "material": "dECM Cardiac",
        "value": 4.6,
        "unit": "%w"
      },
      {
        "material": "Laponite",
        "value": 2.3,
        "unit": "%w"
      },
      {
        "material": "PEGDA",
        "value": 6.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 9.0,
      "max": 9.0,
      "unit": "psi"
    },
    "temperatureC": 25.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 260.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0537",
    "doi": "10.1016/j.actbio.2019.04.026",
    "components": [
      {
        "material": "dECM Cardiac",
        "value": 0.6,
        "unit": "%w"
      },
      {
        "material": "Collagen",
        "value": 0.6,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 10.0,
    "speed_mm_s": null,
    "needle": null,
    "cells": {
      "cellType": "Primary Neonatal Rat Cardiomyocytes",
      "density_M_per_mL": 20.0
    }
  },
  {
    "id": "cect_0538",
    "doi": "10.1016/j.actbio.2019.04.026",
    "components": [
      {
        "material": "dECM Cardiac",
        "value": 1.2,
        "unit": "%w"
      },
      {
        "material": "Collagen",
        "value": 1.2,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 10.0,
    "speed_mm_s": null,
    "needle": null,
    "cells": {
      "cellType": "Primary Neonatal Rat Cardiomyocytes",
      "density_M_per_mL": 20.0
    }
  },
  {
    "id": "cect_0516",
    "doi": "10.1016/j.msec.2020.111008",
    "components": [
      {
        "material": "Carboxymethyl Cellulose",
        "value": 50.0,
        "unit": "mg/mL"
      },
      {
        "material": "Glycol Chitosan",
        "value": 50.0,
        "unit": "mg/mL"
      }
    ],
    "pressure": {
      "min": 50.0,
      "max": 50.0,
      "unit": "kPa"
    },
    "temperatureC": 35.0,
    "speed_mm_s": {
      "min": 3.0,
      "max": 3.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0519",
    "doi": "10.1021/acs.biomac.9b01266",
    "components": [
      {
        "material": "PEOXA",
        "value": 2.5,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 18.0,
      "max": 21.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0521",
    "doi": "10.1016/j.biomaterials.2020.120476",
    "components": [
      {
        "material": "Glycosaminoglycan Nanoparticles",
        "value": 0.25,
        "unit": "mg/mL"
      },
      {
        "material": "Laponite",
        "value": 30.0,
        "unit": "mg/mL"
      }
    ],
    "pressure": {
      "min": 50.0,
      "max": 85.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 12.0,
      "max": 12.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0523",
    "doi": "10.1021/acsomega.9b03100",
    "components": [
      {
        "material": "Hydroxypropyl Methylcellulose Sillylated",
        "value": 13.5,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 40.0,
      "max": 50.0,
      "unit": "psi"
    },
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0527",
    "doi": "10.1177/2041731420967294",
    "components": [
      {
        "material": "SPE monomer",
        "value": 10.0,
        "unit": "%w"
      },
      {
        "material": "Laponite",
        "value": 6.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.8,
      "max": 0.8,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 1000.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0536",
    "doi": "10.1016/j.actbio.2019.04.026",
    "components": [
      {
        "material": "Poly(ethylene vinyl acetate) [100 wt%]",
        "value": null,
        "unit": ""
      }
    ],
    "pressure": {
      "min": 350.0,
      "max": 350.0,
      "unit": "kPa"
    },
    "temperatureC": 140.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 250.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0539",
    "doi": "10.1039/c9bm00480g",
    "components": [
      {
        "material": "Xylorhamno-Uronic Acid Methacrylated",
        "value": 10.0,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 5.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 3.5,
      "max": 3.5,
      "unit": "bar"
    },
    "temperatureC": 23.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 200.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0567",
    "doi": "10.1039/c5tb01645b",
    "components": [
      {
        "material": "PEG-NIPAAm-HPMACys",
        "value": 7.5,
        "unit": "%w"
      },
      {
        "material": "PEG NHS",
        "value": 3.8,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 3.4,
      "max": 3.4,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 250.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0569",
    "doi": "10.1039/c5tb01645b",
    "components": [
      {
        "material": "pHMGCL-NHS",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 400.0,
      "max": 400.0,
      "unit": "kPa"
    },
    "temperatureC": 140.0,
    "speed_mm_s": {
      "min": 4.1667,
      "max": 4.1667,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0570",
    "doi": "10.1016/j.mtbio.2020.100078",
    "components": [
      {
        "material": "Hyaluronic Acid Phenolic Hydroxyl Functionalized",
        "value": 1.5,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 22.0,
      "max": 22.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "10T1/2 Murine Fibroblasts",
      "density_M_per_mL": 5.0
    }
  },
  {
    "id": "cect_0571",
    "doi": "10.1016/j.mtbio.2020.100078",
    "components": [
      {
        "material": "Hyaluronic Acid Phenolic Hydroxyl Functionalized",
        "value": 0.1,
        "unit": "%w"
      },
      {
        "material": "Hyaluronic Acid",
        "value": 0.9,
        "unit": "%w"
      },
      {
        "material": "Gelatin Phenolic Hydroxyl Functionalized",
        "value": 1.0,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 22.0,
      "max": 22.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "10T1/2 Murine Fibroblasts",
      "density_M_per_mL": 5.0
    }
  },
  {
    "id": "cect_0574",
    "doi": "10.1021/bm801463q",
    "components": [
      {
        "material": "Pluronic F127 di(alpha-bromoesters) [25 wt%]",
        "value": null,
        "unit": ""
      }
    ],
    "pressure": {
      "min": 2.0,
      "max": 2.0,
      "unit": "bar"
    },
    "temperatureC": 4.0,
    "speed_mm_s": {
      "min": 16.0,
      "max": 16.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 210.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0582",
    "doi": "10.1016/j.mtbio.2020.100058",
    "components": [
      {
        "material": "Hyaluronic Acid Tyramine Functionalized",
        "value": 25.0,
        "unit": "mg/mL"
      },
      {
        "material": "Collagen",
        "value": 5.0,
        "unit": "mg/mL"
      }
    ],
    "pressure": {
      "min": 0.2,
      "max": 0.2,
      "unit": "bar"
    },
    "temperatureC": 22.0,
    "speed_mm_s": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0610",
    "doi": "10.1021/acsbiomaterials.8b00416",
    "components": [
      {
        "material": "Hyaluronic Acid Tyramine Functionalized",
        "value": 3.5,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 4.0,
      "max": 4.0,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 250.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0587",
    "doi": "10.1002/adfm.201801850",
    "components": [
      {
        "material": "Matrigel",
        "value": 50.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.5,
      "max": 1.0,
      "unit": "psi"
    },
    "temperatureC": 4.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 3.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 100.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0595",
    "doi": "10.1002/adfm.201801850",
    "components": [
      {
        "material": "Loctite",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 80.0,
      "max": 200.0,
      "unit": "psi"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 3.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 100.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0603",
    "doi": "10.1007/s10439-016-1704-5",
    "components": [
      {
        "material": "Alginate Sulfate",
        "value": 1.0,
        "unit": "%w"
      },
      {
        "material": "Nanocellulose",
        "value": 1.36,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 6.0,
      "max": 6.0,
      "unit": "kPa"
    },
    "temperatureC": null,
    "speed_mm_s": null,
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 413.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": {
      "cellType": "Primary Bovine Chondrocytes",
      "density_M_per_mL": 6.0
    }
  },
  {
    "id": "cect_0617",
    "doi": "10.1039/c9fd00019d",
    "components": [
      {
        "material": "triblock copolymer",
        "value": 20.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 20.0,
      "max": 20.0,
      "unit": "psi"
    },
    "temperatureC": 21.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0631",
    "doi": "10.1088/1758-5090/ab10ae",
    "components": [
      {
        "material": "Carbopol",
        "value": 0.7,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 40.0,
      "max": 80.0,
      "unit": "kPa"
    },
    "temperatureC": 23.0,
    "speed_mm_s": {
      "min": 2.0,
      "max": 4.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 250.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0636",
    "doi": "10.1088/1758-5090/ab98e4",
    "components": [
      {
        "material": "Alginate Oxidized",
        "value": 3.75,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 7.5,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 30.0,
      "max": 40.0,
      "unit": "kPa"
    },
    "temperatureC": 30.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 330.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0651",
    "doi": "10.1088/2057-1976/ab8fc6",
    "components": [
      {
        "material": "Cellulose Nanofibers",
        "value": 5.34,
        "unit": "%w"
      },
      {
        "material": "Alginate",
        "value": 2.67,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 120.0,
      "max": 120.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 300.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0652",
    "doi": "10.1088/2057-1976/ab8fc6",
    "components": [
      {
        "material": "Cellulose Nanofibers",
        "value": 7.4,
        "unit": "%w"
      },
      {
        "material": "Alginate",
        "value": 0.74,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 80.0,
      "max": 80.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 300.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0653",
    "doi": "10.1088/2057-1976/ab8fc6",
    "components": [
      {
        "material": "Cellulose Nanocrystals",
        "value": 10.0,
        "unit": "%w"
      },
      {
        "material": "Alginate",
        "value": 5.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 140.0,
      "max": 140.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 300.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0654",
    "doi": "10.1088/2057-1976/ab8fc6",
    "components": [
      {
        "material": "Cellulose Nanocrystals",
        "value": 16.67,
        "unit": "%w"
      },
      {
        "material": "Alginate",
        "value": 1.667,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 80.0,
      "max": 80.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 300.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0656",
    "doi": "10.1038/s41598-020-64049-6",
    "components": [
      {
        "material": "dECM Esophageal",
        "value": 1.5,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 20.0,
      "max": 40.0,
      "unit": "kPa"
    },
    "temperatureC": 4.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Human Esophageal Epithelial Cells",
      "density_M_per_mL": 3.5
    }
  },
  {
    "id": "cect_0657",
    "doi": "10.1038/s41598-020-64049-6",
    "components": [
      {
        "material": "dECM Esophageal",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 20.0,
      "max": 40.0,
      "unit": "kPa"
    },
    "temperatureC": 4.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Human Esophageal Epithelial Cells",
      "density_M_per_mL": 3.5
    }
  },
  {
    "id": "cect_0666",
    "doi": "10.1021/acsami.0c05096",
    "components": [
      {
        "material": "Gelatin Carbohydrazide",
        "value": 6.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 12.0,
      "max": 15.0,
      "unit": "kPa"
    },
    "temperatureC": 37.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Human Umbilical Vein Endothelial Cells",
      "density_M_per_mL": 1.0
    }
  },
  {
    "id": "cect_0668",
    "doi": "10.3390/jfb9040057",
    "components": [
      {
        "material": "Calcium Phosphate",
        "value": 4.27,
        "unit": "%w"
      },
      {
        "material": "Kappa Carrageenan",
        "value": 2.8,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.5,
      "max": 2.0,
      "unit": "bar"
    },
    "temperatureC": null,
    "speed_mm_s": {
      "min": 7.0,
      "max": 7.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0670",
    "doi": "10.1021/acsbiomaterials.6b00170",
    "components": [
      {
        "material": "PDMS",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 20.0,
      "max": 20.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0681",
    "doi": "10.1021/acsnano.5b01179",
    "components": [
      {
        "material": "Graphene",
        "value": 75.0,
        "unit": "%w"
      },
      {
        "material": "PLG",
        "value": 25.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 5.0,
      "max": 5.0,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 45.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 100.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0683",
    "doi": "10.1021/acsbiomaterials.8b00964",
    "components": [
      {
        "material": "SC 5050 Polyester",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 2.7,
      "max": 2.7,
      "unit": "bar"
    },
    "temperatureC": 30.0,
    "speed_mm_s": {
      "min": 0.5,
      "max": 0.5,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0684",
    "doi": "10.1021/acsbiomaterials.8b00964",
    "components": [
      {
        "material": "SC 5050 Polyester",
        "value": 98.0,
        "unit": "%w"
      },
      {
        "material": "Dexamethosone",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 4.3,
      "max": 4.3,
      "unit": "bar"
    },
    "temperatureC": 48.0,
    "speed_mm_s": {
      "min": 0.5,
      "max": 0.5,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0685",
    "doi": "10.1021/acsbiomaterials.8b00964",
    "components": [
      {
        "material": "SC 5050 Polyester",
        "value": 94.0,
        "unit": "%w"
      },
      {
        "material": "Dexamethosone",
        "value": 6.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 4.7,
      "max": 4.7,
      "unit": "bar"
    },
    "temperatureC": 52.0,
    "speed_mm_s": {
      "min": 0.5,
      "max": 0.5,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0687",
    "doi": "10.1039/d0bm01784a",
    "components": [
      {
        "material": "Ulvan Methacrylated",
        "value": 2.0,
        "unit": "%w"
      },
      {
        "material": "GelMA",
        "value": 4.0,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 3.6,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 3.5,
      "max": 3.5,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Human Dermal Fibroblasts",
      "density_M_per_mL": 1.0
    }
  },
  {
    "id": "cect_0688",
    "doi": "10.1039/d0bm01784a",
    "components": [
      {
        "material": "Ulvan Methacrylated",
        "value": 4.0,
        "unit": "%w"
      },
      {
        "material": "GelMA",
        "value": 2.0,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 3.6,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 3.5,
      "max": 3.5,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Human Dermal Fibroblasts",
      "density_M_per_mL": 1.0
    }
  },
  {
    "id": "cect_0689",
    "doi": "10.1039/d0bm01784a",
    "components": [
      {
        "material": "Ulvan Methacrylated",
        "value": 6.0,
        "unit": "%w"
      },
      {
        "material": "Gelatin",
        "value": 3.6,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 3.0,
      "max": 3.0,
      "unit": "bar"
    },
    "temperatureC": 22.0,
    "speed_mm_s": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": {
      "cellType": "Human Dermal Fibroblasts",
      "density_M_per_mL": 1.0
    }
  },
  {
    "id": "cect_0690",
    "doi": "10.1089/ten.TEC.2012.0383",
    "components": [
      {
        "material": "Soy Protein",
        "value": 20.0,
        "unit": "%w"
      },
      {
        "material": "Glycerol",
        "value": 4.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 0.8,
      "max": 2.0,
      "unit": "bar"
    },
    "temperatureC": 27.0,
    "speed_mm_s": {
      "min": 35.0,
      "max": 35.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 200.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0695",
    "doi": "10.1016/j.dental.2016.11.012",
    "components": [
      {
        "material": "Tricalcium Phosphate",
        "value": 83.0,
        "unit": "%w"
      },
      {
        "material": "Stearic Acid",
        "value": 17.0,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 80.0,
    "speed_mm_s": {
      "min": 15.0,
      "max": 15.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 1000.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0696",
    "doi": "10.1088/1758-5090/abec2d",
    "components": [
      {
        "material": "Xanthan Gum",
        "value": 5.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 35.0,
      "max": 40.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 2.0,
      "max": 2.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0697",
    "doi": "10.1088/1758-5090/abec2d",
    "components": [
      {
        "material": "Xanthan Gum",
        "value": 8.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 60.0,
      "max": 80.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 2.0,
      "max": 2.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0698",
    "doi": "10.1088/1758-5090/abec2d",
    "components": [
      {
        "material": "Xanthan Gum Methacrylated",
        "value": 3.0,
        "unit": "%w"
      },
      {
        "material": "GelMA",
        "value": 3.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 70.0,
      "max": 90.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 2.0,
      "max": 2.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0699",
    "doi": "10.1088/1758-5090/abec2d",
    "components": [
      {
        "material": "Xanthan Gum Methacrylated",
        "value": 5.0,
        "unit": "%w"
      },
      {
        "material": "GelMA",
        "value": 5.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 100.0,
      "max": 120.0,
      "unit": "kPa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 2.0,
      "max": 2.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 410.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0713",
    "doi": "10.1016/j.ijpharm.2021.120330",
    "components": [
      {
        "material": "Lidocaine",
        "value": 30.0,
        "unit": "%w"
      },
      {
        "material": "PCL",
        "value": 70.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 125.0,
      "max": 125.0,
      "unit": "kPa"
    },
    "temperatureC": 110.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    },
    "needle": {
      "kind": "gauge",
      "diameter_um": null,
      "gauge": 0,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0714",
    "doi": "10.1016/j.ijpharm.2021.120330",
    "components": [
      {
        "material": "Lidocaine",
        "value": 5.0,
        "unit": "%w"
      },
      {
        "material": "PCL",
        "value": 95.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 125.0,
      "max": 125.0,
      "unit": "kPa"
    },
    "temperatureC": 110.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    },
    "needle": {
      "kind": "gauge",
      "diameter_um": null,
      "gauge": 0,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0732",
    "doi": "10.1007/s10856-018-6071-3",
    "components": [
      {
        "material": "Polyethylene oxide Terephthalate",
        "value": 55.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 5.0,
      "max": 5.0,
      "unit": "bar"
    },
    "temperatureC": 200.0,
    "speed_mm_s": {
      "min": 3.26667,
      "max": 3.26667,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 250.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0737",
    "doi": "10.1088/1758-5090/abcf8d",
    "components": [
      {
        "material": "Strontium Iron Hydroxyapatite Nanoparticles",
        "value": 20.0,
        "unit": "%w"
      },
      {
        "material": "PCL",
        "value": 25.0,
        "unit": "%w"
      }
    ],
    "pressure": null,
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 1500.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0738",
    "doi": "10.1039/c9nr05894j",
    "components": [
      {
        "material": "Silver Nanoparticles",
        "value": 46.0,
        "unit": "%w"
      },
      {
        "material": "Silver Microflakes",
        "value": 46.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 40.0,
      "max": 40.0,
      "unit": "psi"
    },
    "temperatureC": 25.0,
    "speed_mm_s": null,
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 200.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0740",
    "doi": "10.1016/j.ijpharm.2018.11.044",
    "components": [
      {
        "material": "Diclofenac Sodium",
        "value": 20.0,
        "unit": "%w"
      },
      {
        "material": "Lactose",
        "value": 10.0,
        "unit": "%w"
      },
      {
        "material": "Polyplasdone",
        "value": 2.0,
        "unit": "%w"
      },
      {
        "material": "Carbopol",
        "value": 1.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 2.58,
      "max": 2.58,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0748",
    "doi": "10.1016/j.ijpharm.2018.11.044",
    "components": [
      {
        "material": "Diclofenac Sodium",
        "value": 35.0,
        "unit": "%w"
      },
      {
        "material": "Lactose",
        "value": 20.0,
        "unit": "%w"
      },
      {
        "material": "Polyplasdone",
        "value": 5.0,
        "unit": "%w"
      },
      {
        "material": "Carbopol",
        "value": 2.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 2.17,
      "max": 2.17,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 500.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0751",
    "doi": "10.1016/j.ijpharm.2018.11.044",
    "components": [
      {
        "material": "Diclofenac Sodium",
        "value": 50.0,
        "unit": "%w"
      },
      {
        "material": "Lactose",
        "value": 10.0,
        "unit": "%w"
      },
      {
        "material": "Polyplasdone",
        "value": 2.0,
        "unit": "%w"
      },
      {
        "material": "Carbopol",
        "value": 1.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 1.54,
      "max": 1.54,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 600.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0759",
    "doi": "10.1016/j.ejps.2020.105266",
    "components": [
      {
        "material": "Levetiracetam",
        "value": 23.4,
        "unit": "%w"
      },
      {
        "material": "Polyvinyl acetate / Polyvinyl Pyrrolidone",
        "value": 25.9,
        "unit": "%w"
      },
      {
        "material": "Silicon dioxide",
        "value": 10.0,
        "unit": "%w"
      },
      {
        "material": "Hydroxypropyl Methylcellulose",
        "value": 5.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 1.8,
      "max": 1.8,
      "unit": "bar"
    },
    "temperatureC": 27.0,
    "speed_mm_s": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "needle": {
      "kind": "unknown",
      "diameter_um": null,
      "gauge": null,
      "geometry": null
    },
    "cells": null
  },
  {
    "id": "cect_0762",
    "doi": "10.1039/c8nr06369a",
    "components": [
      {
        "material": "Graphene Oxide",
        "value": 1.0,
        "unit": "mg/mL"
      },
      {
        "material": "Silver Nanowire",
        "value": 1.0,
        "unit": "mg/mL"
      }
    ],
    "pressure": {
      "min": 0.6,
      "max": 2.0,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 4.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0763",
    "doi": "10.1039/c8nr06369a",
    "components": [
      {
        "material": "Mxene",
        "value": 1.0,
        "unit": "mg/mL"
      },
      {
        "material": "Silver Nanowire",
        "value": 1.0,
        "unit": "mg/mL"
      }
    ],
    "pressure": {
      "min": 0.6,
      "max": 2.0,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 4.0,
      "max": 10.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0779",
    "doi": "10.1021/acsnano.9b07325",
    "components": [
      {
        "material": "Mxene",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 4.0,
      "max": 4.0,
      "unit": "psi"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 3.0,
      "max": 3.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 600.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0767",
    "doi": "10.1016/j.ijpharm.2018.01.024",
    "components": [
      {
        "material": "Paracetamol",
        "value": 48.48,
        "unit": "%w"
      },
      {
        "material": "Polyvinyl Pyrrolidone",
        "value": 6.82,
        "unit": "%w"
      },
      {
        "material": "Croscarmellose Sodium",
        "value": 5.3,
        "unit": ""
      }
    ],
    "pressure": {
      "min": 1.8,
      "max": 1.8,
      "unit": "bar"
    },
    "temperatureC": 23.0,
    "speed_mm_s": {
      "min": 6.0,
      "max": 6.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0775",
    "doi": "10.1208/s12249-018-1107-z",
    "components": [
      {
        "material": "Paracetamol",
        "value": 58.94,
        "unit": "%w"
      },
      {
        "material": "Polyvinyl Pyrrolidone",
        "value": 7.27,
        "unit": "%w"
      },
      {
        "material": "Starch",
        "value": 6.06,
        "unit": "%w"
      },
      {
        "material": "Croscarmellose Sodium",
        "value": 0.45,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 1.8,
      "max": 1.8,
      "unit": "bar"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 6.0,
      "max": 6.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 600.0,
      "gauge": null,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0769",
    "doi": "10.1016/j.ijpharm.2017.11.016",
    "components": [
      {
        "material": "Silopren UV LSR 2030 PDMS",
        "value": 99.5,
        "unit": "%w"
      },
      {
        "material": "Prednisolone",
        "value": 0.5,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 414.0,
      "max": 414.0,
      "unit": "kpa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 514.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0770",
    "doi": "10.1016/j.ijpharm.2017.11.016",
    "components": [
      {
        "material": "Silopren UV LSR 2030 PDMS",
        "value": 99.0,
        "unit": "%w"
      },
      {
        "material": "Prednisolone",
        "value": 1.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 414.0,
      "max": 414.0,
      "unit": "kpa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 514.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0771",
    "doi": "10.1016/j.ijpharm.2017.11.016",
    "components": [
      {
        "material": "Silopren UV LSR 2030 PDMS",
        "value": 98.5,
        "unit": "%w"
      },
      {
        "material": "Prednisolone",
        "value": 1.5,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 414.0,
      "max": 414.0,
      "unit": "kpa"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 514.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0772",
    "doi": "10.1016/j.ejps.2020.105291",
    "components": [
      {
        "material": "Chocolate",
        "value": 50.0,
        "unit": "%w"
      },
      {
        "material": "Corn syrup",
        "value": 50.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 204.8,
      "max": 204.8,
      "unit": "kPa"
    },
    "temperatureC": 45.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 2000.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0773",
    "doi": "10.1016/j.ejps.2020.105291",
    "components": [
      {
        "material": "Chocolate",
        "value": 48.85,
        "unit": "%w"
      },
      {
        "material": "Corn syrup",
        "value": 48.85,
        "unit": "%w"
      },
      {
        "material": "Paracetamol",
        "value": 2.3,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 204.8,
      "max": 204.8,
      "unit": "kPa"
    },
    "temperatureC": 45.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 2000.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0774",
    "doi": "10.1016/j.ejps.2020.105291",
    "components": [
      {
        "material": "Chocolate",
        "value": 49.02,
        "unit": "%w"
      },
      {
        "material": "Corn syrup",
        "value": 49.02,
        "unit": "%w"
      },
      {
        "material": "Ibuprofen",
        "value": 1.96,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 204.8,
      "max": 204.8,
      "unit": "kPa"
    },
    "temperatureC": 45.0,
    "speed_mm_s": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 2000.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0776",
    "doi": "10.1016/j.ijpharm.2020.119405",
    "components": [
      {
        "material": "Óxido de polietileno [82",
        "value": null,
        "unit": ""
      }
    ],
    "pressure": {
      "min": 3.0,
      "max": 68.0,
      "unit": ""
    },
    "temperatureC": 2.0,
    "speed_mm_s": {
      "min": 3.0,
      "max": 8.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0781",
    "doi": "10.1021/acsami.7b07717",
    "components": [
      {
        "material": "Óxido de grafeno [17",
        "value": null,
        "unit": ""
      }
    ],
    "pressure": {
      "min": 25.0,
      "max": 25.0,
      "unit": "g"
    },
    "temperatureC": null,
    "speed_mm_s": {
      "min": 23.0,
      "max": 23.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 510.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0782",
    "doi": "10.1002/adma.201705651",
    "components": [
      {
        "material": "Óxido de grafeno",
        "value": 100.0,
        "unit": "mg/mL"
      }
    ],
    "pressure": null,
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 1.203,
      "max": 1.203,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 2.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0787",
    "doi": "10.1002/jbm.b.34628",
    "components": [
      {
        "material": "Alginato [3",
        "value": null,
        "unit": ""
      }
    ],
    "pressure": {
      "min": 4.0,
      "max": 25.0,
      "unit": "G"
    },
    "temperatureC": 18.0,
    "speed_mm_s": {
      "min": 23.0,
      "max": 24.0,
      "unit": ""
    },
    "needle": {
      "kind": "gauge",
      "diameter_um": null,
      "gauge": 22,
      "geometry": "conical"
    },
    "cells": null
  },
  {
    "id": "cect_0788",
    "doi": "10.3390/farmacêutica12080692",
    "components": [
      {
        "material": "Óxido de polietileno",
        "value": 100.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 450.0,
      "max": 500.0,
      "unit": "kPa"
    },
    "temperatureC": 100.0,
    "speed_mm_s": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0789",
    "doi": "10.3390/farmacêutica12080692",
    "components": [
      {
        "material": "Óxido de polietileno",
        "value": 90.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 450.0,
      "max": 500.0,
      "unit": "kPa"
    },
    "temperatureC": 130.0,
    "speed_mm_s": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0790",
    "doi": "10.3390/farmacêutica12080692",
    "components": [
      {
        "material": "Óxido de polietileno",
        "value": 80.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 450.0,
      "max": 500.0,
      "unit": "kPa"
    },
    "temperatureC": 140.0,
    "speed_mm_s": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0791",
    "doi": "10.3390/farmacêutica12080692",
    "components": [
      {
        "material": "Óxido de polietileno",
        "value": 70.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 450.0,
      "max": 500.0,
      "unit": "kPa"
    },
    "temperatureC": 150.0,
    "speed_mm_s": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0792",
    "doi": "10.3390/farmacêutica12080692",
    "components": [
      {
        "material": "Óxido de polietileno",
        "value": 75.0,
        "unit": "%w"
      },
      {
        "material": "Olanzapina",
        "value": 5.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 450.0,
      "max": 500.0,
      "unit": "kPa"
    },
    "temperatureC": 160.0,
    "speed_mm_s": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    },
    "needle": {
      "kind": "diameter_um",
      "diameter_um": 400.0,
      "gauge": null,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0796",
    "doi": "10.1016/j.ijpharm.2019.04.018",
    "components": [
      {
        "material": "Álcool polivinílico",
        "value": 15.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 15.0,
      "max": 15.0,
      "unit": "psi"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    },
    "needle": {
      "kind": "gauge",
      "diameter_um": null,
      "gauge": 21,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0798",
    "doi": "10.1016/j.ijpharm.2019.04.018",
    "components": [
      {
        "material": "Álcool polivinílico",
        "value": 18.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 15.0,
      "max": 15.0,
      "unit": "psi"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    },
    "needle": {
      "kind": "gauge",
      "diameter_um": null,
      "gauge": 21,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0799",
    "doi": "10.1016/j.ijpharm.2019.04.018",
    "components": [
      {
        "material": "Álcool polivinílico",
        "value": 19.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 15.0,
      "max": 15.0,
      "unit": "psi"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    },
    "needle": {
      "kind": "gauge",
      "diameter_um": null,
      "gauge": 21,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0797",
    "doi": "10.1016/j.ijpharm.2019.04.018",
    "components": [
      {
        "material": "Álcool polivinílico [17",
        "value": null,
        "unit": ""
      }
    ],
    "pressure": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    },
    "temperatureC": 15.0,
    "speed_mm_s": {
      "min": 25.8,
      "max": 25.8,
      "unit": ""
    },
    "needle": {
      "kind": "gauge",
      "diameter_um": null,
      "gauge": 21,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0800",
    "doi": "10.1016/j.ijpharm.2019.04.018",
    "components": [
      {
        "material": "Hidroxipropilcelulose",
        "value": 12.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 10.0,
      "max": 10.0,
      "unit": "psi"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    },
    "needle": {
      "kind": "gauge",
      "diameter_um": null,
      "gauge": 21,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0801",
    "doi": "10.1016/j.ijpharm.2019.04.018",
    "components": [
      {
        "material": "Hidroxipropilcelulose",
        "value": 14.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 10.0,
      "max": 10.0,
      "unit": "psi"
    },
    "temperatureC": 25.0,
    "speed_mm_s": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    },
    "needle": {
      "kind": "gauge",
      "diameter_um": null,
      "gauge": 21,
      "geometry": "cylindrical"
    },
    "cells": null
  },
  {
    "id": "cect_0802",
    "doi": "10.1016/j.ijpharm.2019.04.018",
    "components": [
      {
        "material": "Hidroxipropilcelulose",
        "value": 16.0,
        "unit": "%w"
      }
    ],
    "pressure": {
      "min": 3.0,
      "max": 3.0,
      "unit": ""
    },
    "temperatureC": 10.4,
    "speed_mm_s": {
      "min": 25.8,
      "max": 25.8,
      "unit": ""
    },
    "needle": {
      "kind": "gauge",
      "diameter_um": null,
      "gauge": 21,
      "geometry": "cylindrical"
    },
    "cells": null
  }
]

export const MATERIAL_SUMMARY: MaterialSummary[] = [
  {
    "material": "Alginate",
    "count": 152,
    "entryIds": [
      "cect_0079",
      "cect_0080",
      "cect_0081",
      "cect_0082",
      "cect_0083",
      "cect_0084",
      "cect_0085",
      "cect_0088",
      "cect_0089",
      "cect_0090",
      "cect_0094",
      "cect_0095",
      "cect_0113",
      "cect_0114",
      "cect_0121",
      "cect_0127",
      "cect_0129",
      "cect_0131",
      "cect_0133",
      "cect_0136",
      "cect_0137",
      "cect_0138",
      "cect_0139",
      "cect_0140",
      "cect_0141",
      "cect_0142",
      "cect_0143",
      "cect_0144",
      "cect_0145",
      "cect_0146",
      "cect_0147",
      "cect_0148",
      "cect_0149",
      "cect_0150",
      "cect_0157",
      "cect_0158",
      "cect_0159",
      "cect_0161",
      "cect_0163",
      "cect_0174",
      "cect_0175",
      "cect_0180",
      "cect_0182",
      "cect_0185",
      "cect_0186",
      "cect_0196",
      "cect_0197",
      "cect_0198",
      "cect_0199",
      "cect_0222",
      "cect_0223",
      "cect_0228",
      "cect_0229",
      "cect_0230",
      "cect_0231",
      "cect_0232",
      "cect_0236",
      "cect_0237",
      "cect_0238",
      "cect_0239",
      "cect_0240",
      "cect_0241",
      "cect_0242",
      "cect_0243",
      "cect_0253",
      "cect_0255",
      "cect_0267",
      "cect_0268",
      "cect_0303",
      "cect_0316",
      "cect_0317",
      "cect_0322",
      "cect_0323",
      "cect_0324",
      "cect_0325",
      "cect_0326",
      "cect_0327",
      "cect_0328",
      "cect_0329",
      "cect_0330",
      "cect_0331",
      "cect_0332",
      "cect_0335",
      "cect_0336",
      "cect_0337",
      "cect_0338",
      "cect_0356",
      "cect_0370",
      "cect_0383",
      "cect_0390",
      "cect_0392",
      "cect_0393",
      "cect_0396",
      "cect_0397",
      "cect_0403",
      "cect_0404",
      "cect_0405",
      "cect_0415",
      "cect_0424",
      "cect_0434",
      "cect_0435",
      "cect_0436",
      "cect_0439",
      "cect_0440",
      "cect_0451",
      "cect_0462",
      "cect_0463",
      "cect_0464",
      "cect_0471",
      "cect_0490",
      "cect_0491",
      "cect_0492",
      "cect_0495",
      "cect_0496",
      "cect_0497",
      "cect_0510",
      "cect_0511",
      "cect_0512",
      "cect_0515",
      "cect_0517",
      "cect_0524",
      "cect_0531",
      "cect_0551",
      "cect_0552",
      "cect_0553",
      "cect_0575",
      "cect_0580",
      "cect_0594",
      "cect_0605",
      "cect_0611",
      "cect_0612",
      "cect_0613",
      "cect_0615",
      "cect_0616",
      "cect_0621",
      "cect_0629",
      "cect_0630",
      "cect_0661",
      "cect_0664",
      "cect_0665",
      "cect_0673",
      "cect_0674",
      "cect_0675",
      "cect_0676",
      "cect_0701",
      "cect_0711",
      "cect_0712",
      "cect_0720",
      "cect_0783",
      "cect_0784",
      "cect_0785",
      "cect_0786"
    ],
    "pressureKPa": {
      "min": 9.0,
      "max": 1379.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 5.0,
      "max": 37.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 0.75,
      "max": 70.0,
      "unit": ""
    }
  },
  {
    "material": "PCL",
    "count": 134,
    "entryIds": [
      "cect_0008",
      "cect_0009",
      "cect_0010",
      "cect_0011",
      "cect_0012",
      "cect_0013",
      "cect_0014",
      "cect_0015",
      "cect_0016",
      "cect_0017",
      "cect_0018",
      "cect_0019",
      "cect_0020",
      "cect_0021",
      "cect_0022",
      "cect_0023",
      "cect_0024",
      "cect_0041",
      "cect_0044",
      "cect_0047",
      "cect_0056",
      "cect_0057",
      "cect_0058",
      "cect_0093",
      "cect_0102",
      "cect_0108",
      "cect_0109",
      "cect_0110",
      "cect_0171",
      "cect_0172",
      "cect_0173",
      "cect_0192",
      "cect_0193",
      "cect_0194",
      "cect_0195",
      "cect_0219",
      "cect_0224",
      "cect_0260",
      "cect_0261",
      "cect_0262",
      "cect_0263",
      "cect_0264",
      "cect_0265",
      "cect_0266",
      "cect_0269",
      "cect_0271",
      "cect_0272",
      "cect_0274",
      "cect_0275",
      "cect_0276",
      "cect_0277",
      "cect_0278",
      "cect_0279",
      "cect_0280",
      "cect_0281",
      "cect_0282",
      "cect_0284",
      "cect_0285",
      "cect_0286",
      "cect_0287",
      "cect_0288",
      "cect_0289",
      "cect_0291",
      "cect_0293",
      "cect_0294",
      "cect_0295",
      "cect_0296",
      "cect_0297",
      "cect_0298",
      "cect_0299",
      "cect_0300",
      "cect_0301",
      "cect_0302",
      "cect_0304",
      "cect_0305",
      "cect_0306",
      "cect_0307",
      "cect_0353",
      "cect_0368",
      "cect_0373",
      "cect_0375",
      "cect_0377",
      "cect_0391",
      "cect_0400",
      "cect_0402",
      "cect_0409",
      "cect_0410",
      "cect_0411",
      "cect_0412",
      "cect_0413",
      "cect_0414",
      "cect_0453",
      "cect_0454",
      "cect_0554",
      "cect_0623",
      "cect_0624",
      "cect_0625",
      "cect_0626",
      "cect_0627",
      "cect_0628",
      "cect_0633",
      "cect_0634",
      "cect_0635",
      "cect_0641",
      "cect_0642",
      "cect_0643",
      "cect_0644",
      "cect_0645",
      "cect_0646",
      "cect_0647",
      "cect_0648",
      "cect_0655",
      "cect_0662",
      "cect_0672",
      "cect_0680",
      "cect_0691",
      "cect_0692",
      "cect_0693",
      "cect_0694",
      "cect_0715",
      "cect_0724",
      "cect_0725",
      "cect_0726",
      "cect_0727",
      "cect_0728",
      "cect_0729",
      "cect_0730",
      "cect_0731",
      "cect_0734",
      "cect_0735",
      "cect_0736",
      "cect_0739",
      "cect_0778",
      "cect_0795"
    ],
    "pressureKPa": {
      "min": 1.5,
      "max": 900.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 180.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 0.33,
      "max": 20.0,
      "unit": ""
    }
  },
  {
    "material": "GelMA",
    "count": 86,
    "entryIds": [
      "cect_0002",
      "cect_0003",
      "cect_0004",
      "cect_0005",
      "cect_0055",
      "cect_0069",
      "cect_0071",
      "cect_0074",
      "cect_0075",
      "cect_0076",
      "cect_0077",
      "cect_0078",
      "cect_0086",
      "cect_0087",
      "cect_0104",
      "cect_0107",
      "cect_0122",
      "cect_0123",
      "cect_0124",
      "cect_0125",
      "cect_0126",
      "cect_0176",
      "cect_0177",
      "cect_0178",
      "cect_0179",
      "cect_0208",
      "cect_0209",
      "cect_0210",
      "cect_0211",
      "cect_0212",
      "cect_0213",
      "cect_0244",
      "cect_0245",
      "cect_0270",
      "cect_0309",
      "cect_0310",
      "cect_0346",
      "cect_0347",
      "cect_0348",
      "cect_0349",
      "cect_0350",
      "cect_0351",
      "cect_0352",
      "cect_0359",
      "cect_0376",
      "cect_0380",
      "cect_0382",
      "cect_0387",
      "cect_0388",
      "cect_0389",
      "cect_0394",
      "cect_0395",
      "cect_0418",
      "cect_0419",
      "cect_0420",
      "cect_0433",
      "cect_0457",
      "cect_0466",
      "cect_0480",
      "cect_0481",
      "cect_0501",
      "cect_0526",
      "cect_0529",
      "cect_0530",
      "cect_0550",
      "cect_0558",
      "cect_0560",
      "cect_0562",
      "cect_0563",
      "cect_0564",
      "cect_0590",
      "cect_0591",
      "cect_0592",
      "cect_0596",
      "cect_0609",
      "cect_0619",
      "cect_0660",
      "cect_0663",
      "cect_0677",
      "cect_0678",
      "cect_0679",
      "cect_0686",
      "cect_0716",
      "cect_0721",
      "cect_0722",
      "cect_0723"
    ],
    "pressureKPa": {
      "min": 3.45,
      "max": 896.35,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 4.0,
      "max": 40.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 0.17,
      "max": 30.0,
      "unit": ""
    }
  },
  {
    "material": "Gelatin",
    "count": 71,
    "entryIds": [
      "cect_0038",
      "cect_0039",
      "cect_0040",
      "cect_0046",
      "cect_0115",
      "cect_0116",
      "cect_0117",
      "cect_0118",
      "cect_0119",
      "cect_0120",
      "cect_0160",
      "cect_0167",
      "cect_0168",
      "cect_0169",
      "cect_0170",
      "cect_0204",
      "cect_0205",
      "cect_0206",
      "cect_0214",
      "cect_0220",
      "cect_0221",
      "cect_0254",
      "cect_0308",
      "cect_0314",
      "cect_0315",
      "cect_0318",
      "cect_0319",
      "cect_0320",
      "cect_0321",
      "cect_0360",
      "cect_0363",
      "cect_0364",
      "cect_0365",
      "cect_0366",
      "cect_0372",
      "cect_0378",
      "cect_0379",
      "cect_0385",
      "cect_0432",
      "cect_0437",
      "cect_0449",
      "cect_0472",
      "cect_0494",
      "cect_0498",
      "cect_0499",
      "cect_0500",
      "cect_0532",
      "cect_0533",
      "cect_0534",
      "cect_0540",
      "cect_0541",
      "cect_0542",
      "cect_0543",
      "cect_0544",
      "cect_0545",
      "cect_0546",
      "cect_0547",
      "cect_0548",
      "cect_0549",
      "cect_0555",
      "cect_0559",
      "cect_0565",
      "cect_0581",
      "cect_0584",
      "cect_0585",
      "cect_0586",
      "cect_0618",
      "cect_0640",
      "cect_0649",
      "cect_0650",
      "cect_0768"
    ],
    "pressureKPa": {
      "min": 1.0,
      "max": 700.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 4.0,
      "max": 70.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 0.03,
      "max": 65.0,
      "unit": ""
    }
  },
  {
    "material": "Pluronic F127",
    "count": 25,
    "entryIds": [
      "cect_0042",
      "cect_0073",
      "cect_0189",
      "cect_0190",
      "cect_0191",
      "cect_0225",
      "cect_0273",
      "cect_0358",
      "cect_0416",
      "cect_0425",
      "cect_0483",
      "cect_0489",
      "cect_0556",
      "cect_0561",
      "cect_0576",
      "cect_0577",
      "cect_0578",
      "cect_0597",
      "cect_0598",
      "cect_0599",
      "cect_0600",
      "cect_0601",
      "cect_0602",
      "cect_0608",
      "cect_0614"
    ],
    "pressureKPa": {
      "min": 50.0,
      "max": 420.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 18.0,
      "max": 37.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 0.02,
      "max": 25.0,
      "unit": ""
    }
  },
  {
    "material": "PLGA",
    "count": 21,
    "entryIds": [
      "cect_0025",
      "cect_0026",
      "cect_0027",
      "cect_0028",
      "cect_0029",
      "cect_0030",
      "cect_0031",
      "cect_0032",
      "cect_0033",
      "cect_0034",
      "cect_0035",
      "cect_0341",
      "cect_0354",
      "cect_0357",
      "cect_0362",
      "cect_0703",
      "cect_0704",
      "cect_0706",
      "cect_0707",
      "cect_0709",
      "cect_0710"
    ],
    "pressureKPa": {
      "min": 10.0,
      "max": 900.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 37.0,
      "max": 200.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 0.2,
      "max": 19.0,
      "unit": ""
    }
  },
  {
    "material": "Diclofenac Sodium",
    "count": 19,
    "entryIds": [
      "cect_0740",
      "cect_0741",
      "cect_0742",
      "cect_0743",
      "cect_0744",
      "cect_0745",
      "cect_0746",
      "cect_0747",
      "cect_0748",
      "cect_0749",
      "cect_0750",
      "cect_0751",
      "cect_0752",
      "cect_0753",
      "cect_0754",
      "cect_0755",
      "cect_0756",
      "cect_0757",
      "cect_0758"
    ],
    "pressureKPa": {
      "min": 57.0,
      "max": 369.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    }
  },
  {
    "material": "Chitosan",
    "count": 18,
    "entryIds": [
      "cect_0181",
      "cect_0200",
      "cect_0201",
      "cect_0202",
      "cect_0203",
      "cect_0233",
      "cect_0235",
      "cect_0256",
      "cect_0441",
      "cect_0485",
      "cect_0486",
      "cect_0487",
      "cect_0488",
      "cect_0502",
      "cect_0518",
      "cect_0632",
      "cect_0718",
      "cect_0719"
    ],
    "pressureKPa": {
      "min": 25.0,
      "max": 350.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 2.0,
      "max": 37.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 2.0,
      "max": 20.0,
      "unit": ""
    }
  },
  {
    "material": "Hydroxyapatite",
    "count": 9,
    "entryIds": [
      "cect_0051",
      "cect_0052",
      "cect_0061",
      "cect_0062",
      "cect_0064",
      "cect_0065",
      "cect_0066",
      "cect_0067",
      "cect_0777"
    ],
    "pressureKPa": {
      "min": 40.0,
      "max": 600.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 65.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 1.0,
      "max": 10.0,
      "unit": ""
    }
  },
  {
    "material": "Hydroxypropyl Methylcellulose",
    "count": 9,
    "entryIds": [
      "cect_0467",
      "cect_0468",
      "cect_0469",
      "cect_0503",
      "cect_0504",
      "cect_0505",
      "cect_0506",
      "cect_0507",
      "cect_0508"
    ],
    "pressureKPa": {
      "min": 20.0,
      "max": 70.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    }
  },
  {
    "material": "Hyaluronic Acid",
    "count": 8,
    "entryIds": [
      "cect_0048",
      "cect_0049",
      "cect_0091",
      "cect_0092",
      "cect_0249",
      "cect_0250",
      "cect_0251",
      "cect_0252"
    ],
    "pressureKPa": {
      "min": 60.0,
      "max": 300.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 18.0,
      "max": 37.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 1.0,
      "max": 3.0,
      "unit": ""
    }
  },
  {
    "material": "Alginate Dialdehyde",
    "count": 7,
    "entryIds": [
      "cect_0151",
      "cect_0152",
      "cect_0153",
      "cect_0154",
      "cect_0155",
      "cect_0156",
      "cect_0717"
    ],
    "pressureKPa": {
      "min": 10.0,
      "max": 215.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 26.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 2.0,
      "max": 25.0,
      "unit": ""
    }
  },
  {
    "material": "Collagen",
    "count": 7,
    "entryIds": [
      "cect_0183",
      "cect_0184",
      "cect_0426",
      "cect_0427",
      "cect_0428",
      "cect_0671",
      "cect_0700"
    ],
    "pressureKPa": {
      "min": 15.0,
      "max": 300.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 4.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 0.3,
      "max": 13.75,
      "unit": ""
    }
  },
  {
    "material": "Hyaluronic Acid Methacrylated",
    "count": 7,
    "entryIds": [
      "cect_0188",
      "cect_0259",
      "cect_0290",
      "cect_0311",
      "cect_0344",
      "cect_0345",
      "cect_0566"
    ],
    "pressureKPa": {
      "min": 50.0,
      "max": 552.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 24.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 1.8,
      "max": 28.0,
      "unit": ""
    }
  },
  {
    "material": "Óxido de polietileno",
    "count": 7,
    "entryIds": [
      "cect_0788",
      "cect_0789",
      "cect_0790",
      "cect_0791",
      "cect_0792",
      "cect_0793",
      "cect_0794"
    ],
    "pressureKPa": {
      "min": 450.0,
      "max": 500.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 100.0,
      "max": 160.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    }
  },
  {
    "material": "Fibrinogen",
    "count": 6,
    "entryIds": [
      "cect_0006",
      "cect_0007",
      "cect_0043",
      "cect_0045",
      "cect_0215",
      "cect_0216"
    ],
    "pressureKPa": {
      "min": 50.0,
      "max": 200.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 18.0,
      "max": 26.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 1.0,
      "max": 10.0,
      "unit": ""
    }
  },
  {
    "material": "PCU",
    "count": 6,
    "entryIds": [
      "cect_0096",
      "cect_0097",
      "cect_0098",
      "cect_0099",
      "cect_0100",
      "cect_0101"
    ],
    "pressureKPa": null,
    "temperatureC": {
      "min": 212.0,
      "max": 220.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 6.0,
      "max": 6.0,
      "unit": ""
    }
  },
  {
    "material": "PEGDA",
    "count": 6,
    "entryIds": [
      "cect_0361",
      "cect_0455",
      "cect_0456",
      "cect_0579",
      "cect_0593",
      "cect_0620"
    ],
    "pressureKPa": {
      "min": 7.0,
      "max": 1379.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 0.75,
      "max": 7.5,
      "unit": ""
    }
  },
  {
    "material": "dECM Cardiac",
    "count": 6,
    "entryIds": [
      "cect_0513",
      "cect_0514",
      "cect_0537",
      "cect_0538",
      "cect_0638",
      "cect_0639"
    ],
    "pressureKPa": {
      "min": 55.16,
      "max": 62.05,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 10.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": null
  },
  {
    "material": "Methylcellulose",
    "count": 5,
    "entryIds": [
      "cect_0128",
      "cect_0130",
      "cect_0132",
      "cect_0444",
      "cect_0522"
    ],
    "pressureKPa": {
      "min": 30.0,
      "max": 400.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 24.0,
      "max": 26.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 1.0,
      "max": 10.0,
      "unit": ""
    }
  },
  {
    "material": "Gellan Gum",
    "count": 5,
    "entryIds": [
      "cect_0226",
      "cect_0227",
      "cect_0429",
      "cect_0430",
      "cect_0431"
    ],
    "pressureKPa": {
      "min": 26.0,
      "max": 26.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 37.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 10.0,
      "max": 13.34,
      "unit": ""
    }
  },
  {
    "material": "Collagen Methacrylated",
    "count": 5,
    "entryIds": [
      "cect_0333",
      "cect_0334",
      "cect_0406",
      "cect_0407",
      "cect_0408"
    ],
    "pressureKPa": {
      "min": 4.0,
      "max": 4.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 15.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 25.0,
      "max": 50.0,
      "unit": ""
    }
  },
  {
    "material": "Polyurethane",
    "count": 4,
    "entryIds": [
      "cect_0037",
      "cect_0050",
      "cect_0384",
      "cect_0528"
    ],
    "pressureKPa": {
      "min": 80.0,
      "max": 1500.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 160.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 1.67,
      "max": 8.0,
      "unit": ""
    }
  },
  {
    "material": "Polypropylene fumarate (PPF) [90 wt%] Diethyl fumarate (DEF) [10 wt%]",
    "count": 4,
    "entryIds": [
      "cect_0060",
      "cect_0702",
      "cect_0705",
      "cect_0708"
    ],
    "pressureKPa": {
      "min": 20.0,
      "max": 700.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 37.0,
      "max": 90.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 0.1,
      "max": 10.0,
      "unit": ""
    }
  },
  {
    "material": "E-Shell 300",
    "count": 4,
    "entryIds": [
      "cect_0103",
      "cect_0474",
      "cect_0475",
      "cect_0476"
    ],
    "pressureKPa": {
      "min": 30.0,
      "max": 100.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 22.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 12.0,
      "max": 20.0,
      "unit": ""
    }
  },
  {
    "material": "PLA",
    "count": 4,
    "entryIds": [
      "cect_0258",
      "cect_0343",
      "cect_0355",
      "cect_0398"
    ],
    "pressureKPa": {
      "min": 500.0,
      "max": 700.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 180.0,
      "max": 230.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 2.0,
      "max": 90.0,
      "unit": ""
    }
  },
  {
    "material": "Laponite",
    "count": 4,
    "entryIds": [
      "cect_0477",
      "cect_0478",
      "cect_0606",
      "cect_0607"
    ],
    "pressureKPa": {
      "min": 75.84,
      "max": 103.42,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 0.75,
      "max": 10.0,
      "unit": ""
    }
  },
  {
    "material": "Hyaluronic Acid Phenolic Hydroxyl Functionalized",
    "count": 4,
    "entryIds": [
      "cect_0570",
      "cect_0571",
      "cect_0572",
      "cect_0573"
    ],
    "pressureKPa": null,
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 22.0,
      "max": 22.0,
      "unit": ""
    }
  },
  {
    "material": "dECM Esophageal",
    "count": 4,
    "entryIds": [
      "cect_0656",
      "cect_0657",
      "cect_0658",
      "cect_0659"
    ],
    "pressureKPa": {
      "min": 20.0,
      "max": 40.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    },
    "speedMmS": null
  },
  {
    "material": "PLCL",
    "count": 3,
    "entryIds": [
      "cect_0036",
      "cect_0217",
      "cect_0218"
    ],
    "pressureKPa": {
      "min": 550.0,
      "max": 760.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 150.0,
      "max": 160.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 1.67,
      "max": 8.34,
      "unit": ""
    }
  },
  {
    "material": "Alpha Tricalcium Phosphate",
    "count": 3,
    "entryIds": [
      "cect_0450",
      "cect_0461",
      "cect_0465"
    ],
    "pressureKPa": {
      "min": 200.0,
      "max": 250.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 20.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 2.0,
      "max": 12.0,
      "unit": ""
    }
  },
  {
    "material": "dECM Porcine Tendon",
    "count": 3,
    "entryIds": [
      "cect_0458",
      "cect_0459",
      "cect_0460"
    ],
    "pressureKPa": {
      "min": 10.0,
      "max": 230.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 16.0,
      "max": 16.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 15.0,
      "max": 15.0,
      "unit": ""
    }
  },
  {
    "material": "Hyaluronic Acid Tyramine Functionalized",
    "count": 3,
    "entryIds": [
      "cect_0582",
      "cect_0583",
      "cect_0610"
    ],
    "pressureKPa": {
      "min": 20.0,
      "max": 400.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 20.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 4.0,
      "max": 8.0,
      "unit": ""
    }
  },
  {
    "material": "Matrigel",
    "count": 3,
    "entryIds": [
      "cect_0587",
      "cect_0588",
      "cect_0589"
    ],
    "pressureKPa": {
      "min": 3.45,
      "max": 6.89,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 1.0,
      "max": 3.0,
      "unit": ""
    }
  },
  {
    "material": "PDMS",
    "count": 3,
    "entryIds": [
      "cect_0670",
      "cect_0764",
      "cect_0765"
    ],
    "pressureKPa": {
      "min": 137.9,
      "max": 172.38,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 1.0,
      "max": 20.0,
      "unit": ""
    }
  },
  {
    "material": "SC 5050 Polyester",
    "count": 3,
    "entryIds": [
      "cect_0683",
      "cect_0684",
      "cect_0685"
    ],
    "pressureKPa": {
      "min": 270.0,
      "max": 470.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 30.0,
      "max": 52.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 0.5,
      "max": 0.5,
      "unit": ""
    }
  },
  {
    "material": "Ulvan Methacrylated",
    "count": 3,
    "entryIds": [
      "cect_0687",
      "cect_0688",
      "cect_0689"
    ],
    "pressureKPa": {
      "min": 300.0,
      "max": 350.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 22.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    }
  },
  {
    "material": "Levetiracetam",
    "count": 3,
    "entryIds": [
      "cect_0759",
      "cect_0760",
      "cect_0761"
    ],
    "pressureKPa": {
      "min": 180.0,
      "max": 280.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 27.0,
      "max": 27.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    }
  },
  {
    "material": "Mxene",
    "count": 3,
    "entryIds": [
      "cect_0763",
      "cect_0779",
      "cect_0780"
    ],
    "pressureKPa": {
      "min": 27.58,
      "max": 200.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 3.0,
      "max": 10.0,
      "unit": ""
    }
  },
  {
    "material": "Silopren UV LSR 2030 PDMS",
    "count": 3,
    "entryIds": [
      "cect_0769",
      "cect_0770",
      "cect_0771"
    ],
    "pressureKPa": {
      "min": 414.0,
      "max": 414.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    }
  },
  {
    "material": "Chocolate",
    "count": 3,
    "entryIds": [
      "cect_0772",
      "cect_0773",
      "cect_0774"
    ],
    "pressureKPa": {
      "min": 204.8,
      "max": 204.8,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 45.0,
      "max": 45.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    }
  },
  {
    "material": "Álcool polivinílico",
    "count": 3,
    "entryIds": [
      "cect_0796",
      "cect_0798",
      "cect_0799"
    ],
    "pressureKPa": {
      "min": 103.42,
      "max": 103.42,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    }
  },
  {
    "material": "Hidroxipropilcelulose",
    "count": 3,
    "entryIds": [
      "cect_0800",
      "cect_0801",
      "cect_0802"
    ],
    "pressureKPa": {
      "min": 3.0,
      "max": 68.95,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 10.4,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 8.0,
      "max": 25.8,
      "unit": ""
    }
  },
  {
    "material": "Polystyrene",
    "count": 2,
    "entryIds": [
      "cect_0000",
      "cect_0053"
    ],
    "pressureKPa": {
      "min": 900.0,
      "max": 900.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 155.0,
      "max": 155.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 3.0,
      "max": 5.0,
      "unit": ""
    }
  },
  {
    "material": "Polypropylene fumarate (PPF) [85 wt%] Diethyl fumarate (DEF) [15 wt%]",
    "count": 2,
    "entryIds": [
      "cect_0059",
      "cect_0068"
    ],
    "pressureKPa": {
      "min": 80.0,
      "max": 400.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 55.0,
      "max": 55.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 5.0,
      "max": 20.0,
      "unit": ""
    }
  },
  {
    "material": "Cellulose Nanofibrillated",
    "count": 2,
    "entryIds": [
      "cect_0072",
      "cect_0535"
    ],
    "pressureKPa": {
      "min": 40.0,
      "max": 200.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 23.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 5.0,
      "max": 10.0,
      "unit": ""
    }
  },
  {
    "material": "Agarose",
    "count": 2,
    "entryIds": [
      "cect_0111",
      "cect_0369"
    ],
    "pressureKPa": {
      "min": 200.0,
      "max": 517.12,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 37.0,
      "max": 37.0,
      "unit": ""
    },
    "speedMmS": null
  },
  {
    "material": "PVA",
    "count": 2,
    "entryIds": [
      "cect_0112",
      "cect_0283"
    ],
    "pressureKPa": {
      "min": 350.0,
      "max": 350.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 180.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 2.0,
      "max": 70.0,
      "unit": ""
    }
  },
  {
    "material": "Alginate Norbornene",
    "count": 2,
    "entryIds": [
      "cect_0134",
      "cect_0135"
    ],
    "pressureKPa": {
      "min": 30.0,
      "max": 30.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 5.0,
      "max": 10.0,
      "unit": ""
    }
  },
  {
    "material": "Alginate RGD/YIGSR",
    "count": 2,
    "entryIds": [
      "cect_0162",
      "cect_0164"
    ],
    "pressureKPa": {
      "min": 20.0,
      "max": 30.0,
      "unit": "kPa"
    },
    "temperatureC": null,
    "speedMmS": {
      "min": 6.0,
      "max": 18.0,
      "unit": ""
    }
  },
  {
    "material": "Alginate RGD",
    "count": 2,
    "entryIds": [
      "cect_0165",
      "cect_0166"
    ],
    "pressureKPa": {
      "min": 10.0,
      "max": 30.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 23.0,
      "max": 23.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 4.0,
      "max": 9.0,
      "unit": ""
    }
  },
  {
    "material": "Alginate Methacrylated",
    "count": 2,
    "entryIds": [
      "cect_0187",
      "cect_0669"
    ],
    "pressureKPa": {
      "min": 40.0,
      "max": 138.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 5.0,
      "max": 10.0,
      "unit": ""
    }
  },
  {
    "material": "Gelatin Norbornene",
    "count": 2,
    "entryIds": [
      "cect_0207",
      "cect_0557"
    ],
    "pressureKPa": {
      "min": 230.0,
      "max": 230.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 22.5,
      "max": 27.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 5.0,
      "max": 15.0,
      "unit": ""
    }
  },
  {
    "material": "Pluronic F127 Thiolated",
    "count": 2,
    "entryIds": [
      "cect_0247",
      "cect_0248"
    ],
    "pressureKPa": {
      "min": 13.79,
      "max": 68.95,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 37.0,
      "max": 37.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    }
  },
  {
    "material": "PLLA",
    "count": 2,
    "entryIds": [
      "cect_0339",
      "cect_0446"
    ],
    "pressureKPa": {
      "min": 500.0,
      "max": 900.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 200.0,
      "max": 220.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 2.0,
      "max": 45.0,
      "unit": ""
    }
  },
  {
    "material": "Calcium Phosphate Cement",
    "count": 2,
    "entryIds": [
      "cect_0443",
      "cect_0525"
    ],
    "pressureKPa": {
      "min": 100.0,
      "max": 150.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 10.0,
      "max": 11.0,
      "unit": ""
    }
  },
  {
    "material": "Gellan Gum Methacrylated",
    "count": 2,
    "entryIds": [
      "cect_0447",
      "cect_0448"
    ],
    "pressureKPa": {
      "min": 25.0,
      "max": 103.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 3.58,
      "max": 6.67,
      "unit": ""
    }
  },
  {
    "material": "Hydroxypropyl Cellulose",
    "count": 2,
    "entryIds": [
      "cect_0470",
      "cect_0622"
    ],
    "pressureKPa": {
      "min": 172.38,
      "max": 200.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 5.0,
      "max": 8.0,
      "unit": ""
    }
  },
  {
    "material": "SU-8 2050",
    "count": 2,
    "entryIds": [
      "cect_0473",
      "cect_0766"
    ],
    "pressureKPa": {
      "min": 137.9,
      "max": 206.85,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 0.5,
      "max": 1.0,
      "unit": ""
    }
  },
  {
    "material": "PEOXA",
    "count": 2,
    "entryIds": [
      "cect_0519",
      "cect_0520"
    ],
    "pressureKPa": {
      "min": 18.0,
      "max": 28.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": null
  },
  {
    "material": "PEG-NIPAAm-HPMACys",
    "count": 2,
    "entryIds": [
      "cect_0567",
      "cect_0568"
    ],
    "pressureKPa": {
      "min": 340.0,
      "max": 340.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    }
  },
  {
    "material": "Alginate Sulfate",
    "count": 2,
    "entryIds": [
      "cect_0603",
      "cect_0604"
    ],
    "pressureKPa": {
      "min": 6.0,
      "max": 6.0,
      "unit": "kPa"
    },
    "temperatureC": null,
    "speedMmS": null
  },
  {
    "material": "Alginate Oxidized",
    "count": 2,
    "entryIds": [
      "cect_0636",
      "cect_0637"
    ],
    "pressureKPa": {
      "min": 30.0,
      "max": 60.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 30.0,
      "max": 30.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    }
  },
  {
    "material": "Cellulose Nanofibers",
    "count": 2,
    "entryIds": [
      "cect_0651",
      "cect_0652"
    ],
    "pressureKPa": {
      "min": 80.0,
      "max": 120.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    }
  },
  {
    "material": "Cellulose Nanocrystals",
    "count": 2,
    "entryIds": [
      "cect_0653",
      "cect_0654"
    ],
    "pressureKPa": {
      "min": 80.0,
      "max": 140.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    }
  },
  {
    "material": "Gelatin Carbohydrazide",
    "count": 2,
    "entryIds": [
      "cect_0666",
      "cect_0667"
    ],
    "pressureKPa": {
      "min": 12.0,
      "max": 15.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 37.0,
      "max": 37.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 5.0,
      "max": 10.0,
      "unit": ""
    }
  },
  {
    "material": "Graphene",
    "count": 2,
    "entryIds": [
      "cect_0681",
      "cect_0682"
    ],
    "pressureKPa": {
      "min": 50.0,
      "max": 500.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 10.0,
      "max": 45.0,
      "unit": ""
    }
  },
  {
    "material": "Xanthan Gum",
    "count": 2,
    "entryIds": [
      "cect_0696",
      "cect_0697"
    ],
    "pressureKPa": {
      "min": 35.0,
      "max": 80.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 2.0,
      "max": 2.0,
      "unit": ""
    }
  },
  {
    "material": "Xanthan Gum Methacrylated",
    "count": 2,
    "entryIds": [
      "cect_0698",
      "cect_0699"
    ],
    "pressureKPa": {
      "min": 70.0,
      "max": 120.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 2.0,
      "max": 2.0,
      "unit": ""
    }
  },
  {
    "material": "Lidocaine",
    "count": 2,
    "entryIds": [
      "cect_0713",
      "cect_0714"
    ],
    "pressureKPa": {
      "min": 125.0,
      "max": 125.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 110.0,
      "max": 110.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    }
  },
  {
    "material": "Polyethylene oxide Terephthalate",
    "count": 2,
    "entryIds": [
      "cect_0732",
      "cect_0733"
    ],
    "pressureKPa": {
      "min": 500.0,
      "max": 500.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 200.0,
      "max": 200.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 0.93,
      "max": 3.27,
      "unit": ""
    }
  },
  {
    "material": "Paracetamol",
    "count": 2,
    "entryIds": [
      "cect_0767",
      "cect_0775"
    ],
    "pressureKPa": {
      "min": 180.0,
      "max": 180.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 23.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 6.0,
      "max": 6.0,
      "unit": ""
    }
  },
  {
    "material": "Sugar Glass",
    "count": 1,
    "entryIds": [
      "cect_0001"
    ],
    "pressureKPa": {
      "min": 70.0,
      "max": 80.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 150.0,
      "max": 150.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 10.0,
      "max": 30.0,
      "unit": ""
    }
  },
  {
    "material": "Glass Sugar",
    "count": 1,
    "entryIds": [
      "cect_0054"
    ],
    "pressureKPa": {
      "min": 70.0,
      "max": 80.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 155.0,
      "max": 155.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 10.0,
      "max": 30.0,
      "unit": ""
    }
  },
  {
    "material": "Polypropylene fumarate (PPF) [75 wt%] Diethyl fumarate (DEF) [15 wt%]",
    "count": 1,
    "entryIds": [
      "cect_0063"
    ],
    "pressureKPa": {
      "min": 30.0,
      "max": 30.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 50.0,
      "max": 50.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 12.0,
      "max": 12.0,
      "unit": ""
    }
  },
  {
    "material": "PEG Norbornene",
    "count": 1,
    "entryIds": [
      "cect_0070"
    ],
    "pressureKPa": {
      "min": 350.0,
      "max": 450.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 26.0,
      "max": 26.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 6.0,
      "max": 6.0,
      "unit": ""
    }
  },
  {
    "material": "Hyaluronic Acid Adamantane",
    "count": 1,
    "entryIds": [
      "cect_0105"
    ],
    "pressureKPa": {
      "min": 172.0,
      "max": 172.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 0.42,
      "max": 0.5,
      "unit": ""
    }
  },
  {
    "material": "cyclodextrin",
    "count": 1,
    "entryIds": [
      "cect_0106"
    ],
    "pressureKPa": {
      "min": 172.0,
      "max": 172.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 0.42,
      "max": 0.5,
      "unit": ""
    }
  },
  {
    "material": "Poly(gamma glutamic acid) [2 wt%]",
    "count": 1,
    "entryIds": [
      "cect_0234"
    ],
    "pressureKPa": {
      "min": 5.0,
      "max": 10.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 37.0,
      "max": 37.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    }
  },
  {
    "material": "Hyaluronic Acid pNIPAAM",
    "count": 1,
    "entryIds": [
      "cect_0246"
    ],
    "pressureKPa": {
      "min": 150.0,
      "max": 150.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 23.0,
      "max": 23.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 8.33,
      "max": 8.33,
      "unit": ""
    }
  },
  {
    "material": "Chitosan Raffinose Modified",
    "count": 1,
    "entryIds": [
      "cect_0257"
    ],
    "pressureKPa": null,
    "temperatureC": {
      "min": 2.0,
      "max": 2.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 3.0,
      "max": 3.0,
      "unit": ""
    }
  },
  {
    "material": "Silicone",
    "count": 1,
    "entryIds": [
      "cect_0292"
    ],
    "pressureKPa": {
      "min": 500.0,
      "max": 500.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 6.2,
      "max": 6.2,
      "unit": ""
    }
  },
  {
    "material": "Hyaluronic Acid Norbornene",
    "count": 1,
    "entryIds": [
      "cect_0312"
    ],
    "pressureKPa": {
      "min": 70.0,
      "max": 110.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 24.0,
      "max": 24.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 3.0,
      "max": 6.0,
      "unit": ""
    }
  },
  {
    "material": "Beta Tricalcium Phosphate",
    "count": 1,
    "entryIds": [
      "cect_0313"
    ],
    "pressureKPa": {
      "min": 200.0,
      "max": 200.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 22.0,
      "max": 22.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    }
  },
  {
    "material": "PCLA",
    "count": 1,
    "entryIds": [
      "cect_0340"
    ],
    "pressureKPa": {
      "min": 700.0,
      "max": 850.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 205.0,
      "max": 205.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 2.0,
      "max": 20.0,
      "unit": ""
    }
  },
  {
    "material": "PDLGA",
    "count": 1,
    "entryIds": [
      "cect_0342"
    ],
    "pressureKPa": {
      "min": 700.0,
      "max": 850.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 200.0,
      "max": 200.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 6.0,
      "max": 14.0,
      "unit": ""
    }
  },
  {
    "material": "pHPMA-lac-PEG Methacrylated",
    "count": 1,
    "entryIds": [
      "cect_0367"
    ],
    "pressureKPa": {
      "min": 100.0,
      "max": 130.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 37.0,
      "max": 37.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 40.0,
      "max": 40.0,
      "unit": ""
    }
  },
  {
    "material": "BioINK",
    "count": 1,
    "entryIds": [
      "cect_0371"
    ],
    "pressureKPa": {
      "min": 140.0,
      "max": 140.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 21.0,
      "max": 21.0,
      "unit": ""
    },
    "speedMmS": null
  },
  {
    "material": "Allyl Functionalized",
    "count": 1,
    "entryIds": [
      "cect_0374"
    ],
    "pressureKPa": {
      "min": 100.0,
      "max": 100.0,
      "unit": "kPa"
    },
    "temperatureC": null,
    "speedMmS": null
  },
  {
    "material": "Nanosilicates",
    "count": 1,
    "entryIds": [
      "cect_0381"
    ],
    "pressureKPa": null,
    "temperatureC": {
      "min": 40.0,
      "max": 40.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    }
  },
  {
    "material": "Hydroxypropyl Chitin",
    "count": 1,
    "entryIds": [
      "cect_0386"
    ],
    "pressureKPa": null,
    "temperatureC": {
      "min": 37.0,
      "max": 37.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    }
  },
  {
    "material": "Cellink RGD Bionk",
    "count": 1,
    "entryIds": [
      "cect_0399"
    ],
    "pressureKPa": {
      "min": 5.0,
      "max": 15.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 175.0,
      "max": 200.0,
      "unit": ""
    }
  },
  {
    "material": "Hyaluronic Acid Glycidyl Methacrylated",
    "count": 1,
    "entryIds": [
      "cect_0401"
    ],
    "pressureKPa": {
      "min": 50.0,
      "max": 50.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    }
  },
  {
    "material": "PEG terephthalate",
    "count": 1,
    "entryIds": [
      "cect_0417"
    ],
    "pressureKPa": {
      "min": 500.0,
      "max": 500.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 200.0,
      "max": 200.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 8.33,
      "max": 8.33,
      "unit": ""
    }
  },
  {
    "material": "Cellulose Nanofibrils",
    "count": 1,
    "entryIds": [
      "cect_0421"
    ],
    "pressureKPa": {
      "min": 43.0,
      "max": 43.0,
      "unit": "kPa"
    },
    "temperatureC": null,
    "speedMmS": {
      "min": 12.0,
      "max": 12.0,
      "unit": ""
    }
  },
  {
    "material": "Nanocellulose TEMPO Oxidized",
    "count": 1,
    "entryIds": [
      "cect_0422"
    ],
    "pressureKPa": {
      "min": 55.0,
      "max": 55.0,
      "unit": "kPa"
    },
    "temperatureC": null,
    "speedMmS": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    }
  },
  {
    "material": "Nanocellulose Acetylated",
    "count": 1,
    "entryIds": [
      "cect_0423"
    ],
    "pressureKPa": {
      "min": 35.0,
      "max": 35.0,
      "unit": "kPa"
    },
    "temperatureC": null,
    "speedMmS": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    }
  },
  {
    "material": "dECM Small Intestinal Submucosa",
    "count": 1,
    "entryIds": [
      "cect_0438"
    ],
    "pressureKPa": {
      "min": 25.0,
      "max": 25.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    }
  },
  {
    "material": "Gelatin Allylated",
    "count": 1,
    "entryIds": [
      "cect_0442"
    ],
    "pressureKPa": {
      "min": 210.0,
      "max": 210.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 4.0,
      "max": 7.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    }
  },
  {
    "material": "Poly(DTD DD) [100 wt%]",
    "count": 1,
    "entryIds": [
      "cect_0445"
    ],
    "pressureKPa": {
      "min": 900.0,
      "max": 900.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 150.0,
      "max": 150.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 1.0,
      "max": 2.5,
      "unit": ""
    }
  },
  {
    "material": "Hyaluronic Acid Mono-Aldehyde",
    "count": 1,
    "entryIds": [
      "cect_0452"
    ],
    "pressureKPa": {
      "min": 250.0,
      "max": 250.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 37.0,
      "max": 37.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 2.5,
      "max": 2.5,
      "unit": ""
    }
  },
  {
    "material": "Acrylamide",
    "count": 1,
    "entryIds": [
      "cect_0479"
    ],
    "pressureKPa": null,
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 7.5,
      "max": 7.5,
      "unit": ""
    }
  },
  {
    "material": "Poloxamer 407",
    "count": 1,
    "entryIds": [
      "cect_0482"
    ],
    "pressureKPa": null,
    "temperatureC": {
      "min": 22.5,
      "max": 22.5,
      "unit": ""
    },
    "speedMmS": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    }
  },
  {
    "material": "Cellulose",
    "count": 1,
    "entryIds": [
      "cect_0484"
    ],
    "pressureKPa": {
      "min": 96.53,
      "max": 96.53,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    }
  },
  {
    "material": "Alginate Polypyrrole",
    "count": 1,
    "entryIds": [
      "cect_0493"
    ],
    "pressureKPa": {
      "min": 5.0,
      "max": 5.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 2.33,
      "max": 2.33,
      "unit": ""
    }
  },
  {
    "material": "Hyaluronic Acid Oxidized",
    "count": 1,
    "entryIds": [
      "cect_0509"
    ],
    "pressureKPa": null,
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    }
  },
  {
    "material": "Carboxymethyl Cellulose",
    "count": 1,
    "entryIds": [
      "cect_0516"
    ],
    "pressureKPa": {
      "min": 50.0,
      "max": 50.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 35.0,
      "max": 35.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 3.0,
      "max": 3.0,
      "unit": ""
    }
  },
  {
    "material": "Glycosaminoglycan Nanoparticles",
    "count": 1,
    "entryIds": [
      "cect_0521"
    ],
    "pressureKPa": {
      "min": 50.0,
      "max": 85.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 12.0,
      "max": 12.0,
      "unit": ""
    }
  },
  {
    "material": "Hydroxypropyl Methylcellulose Sillylated",
    "count": 1,
    "entryIds": [
      "cect_0523"
    ],
    "pressureKPa": {
      "min": 275.8,
      "max": 344.75,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 37.0,
      "max": 37.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    }
  },
  {
    "material": "SPE monomer",
    "count": 1,
    "entryIds": [
      "cect_0527"
    ],
    "pressureKPa": {
      "min": 80.0,
      "max": 80.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    }
  },
  {
    "material": "Poly(ethylene vinyl acetate) [100 wt%]",
    "count": 1,
    "entryIds": [
      "cect_0536"
    ],
    "pressureKPa": {
      "min": 350.0,
      "max": 350.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 130.0,
      "max": 140.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 1.0,
      "max": 1.0,
      "unit": ""
    }
  },
  {
    "material": "Xylorhamno-Uronic Acid Methacrylated",
    "count": 1,
    "entryIds": [
      "cect_0539"
    ],
    "pressureKPa": {
      "min": 350.0,
      "max": 350.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 23.0,
      "max": 23.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 10.0,
      "max": 10.0,
      "unit": ""
    }
  },
  {
    "material": "pHMGCL-NHS",
    "count": 1,
    "entryIds": [
      "cect_0569"
    ],
    "pressureKPa": {
      "min": 400.0,
      "max": 400.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 140.0,
      "max": 140.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 4.17,
      "max": 4.17,
      "unit": ""
    }
  },
  {
    "material": "Pluronic F127 di(alpha-bromoesters) [25 wt%]",
    "count": 1,
    "entryIds": [
      "cect_0574"
    ],
    "pressureKPa": {
      "min": 200.0,
      "max": 200.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 4.0,
      "max": 4.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 16.0,
      "max": 16.0,
      "unit": ""
    }
  },
  {
    "material": "Loctite",
    "count": 1,
    "entryIds": [
      "cect_0595"
    ],
    "pressureKPa": {
      "min": 551.6,
      "max": 1379.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 1.0,
      "max": 3.0,
      "unit": ""
    }
  },
  {
    "material": "triblock copolymer",
    "count": 1,
    "entryIds": [
      "cect_0617"
    ],
    "pressureKPa": {
      "min": 137.9,
      "max": 137.9,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 21.0,
      "max": 21.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 5.0,
      "max": 5.0,
      "unit": ""
    }
  },
  {
    "material": "Carbopol",
    "count": 1,
    "entryIds": [
      "cect_0631"
    ],
    "pressureKPa": {
      "min": 40.0,
      "max": 80.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 23.0,
      "max": 23.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 2.0,
      "max": 4.0,
      "unit": ""
    }
  },
  {
    "material": "Calcium Phosphate",
    "count": 1,
    "entryIds": [
      "cect_0668"
    ],
    "pressureKPa": {
      "min": 50.0,
      "max": 200.0,
      "unit": "kPa"
    },
    "temperatureC": null,
    "speedMmS": {
      "min": 7.0,
      "max": 7.0,
      "unit": ""
    }
  },
  {
    "material": "Soy Protein",
    "count": 1,
    "entryIds": [
      "cect_0690"
    ],
    "pressureKPa": {
      "min": 80.0,
      "max": 200.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 27.0,
      "max": 27.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 35.0,
      "max": 35.0,
      "unit": ""
    }
  },
  {
    "material": "Tricalcium Phosphate",
    "count": 1,
    "entryIds": [
      "cect_0695"
    ],
    "pressureKPa": null,
    "temperatureC": {
      "min": 80.0,
      "max": 80.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 15.0,
      "max": 15.0,
      "unit": ""
    }
  },
  {
    "material": "Strontium Iron Hydroxyapatite Nanoparticles",
    "count": 1,
    "entryIds": [
      "cect_0737"
    ],
    "pressureKPa": null,
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 8.0,
      "max": 8.0,
      "unit": ""
    }
  },
  {
    "material": "Silver Nanoparticles",
    "count": 1,
    "entryIds": [
      "cect_0738"
    ],
    "pressureKPa": {
      "min": 275.8,
      "max": 275.8,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": null
  },
  {
    "material": "Graphene Oxide",
    "count": 1,
    "entryIds": [
      "cect_0762"
    ],
    "pressureKPa": {
      "min": 60.0,
      "max": 200.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 4.0,
      "max": 10.0,
      "unit": ""
    }
  },
  {
    "material": "Óxido de polietileno [82",
    "count": 1,
    "entryIds": [
      "cect_0776"
    ],
    "pressureKPa": {
      "min": 3.0,
      "max": 68.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 1.0,
      "max": 2.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 3.0,
      "max": 8.0,
      "unit": ""
    }
  },
  {
    "material": "Óxido de grafeno [17",
    "count": 1,
    "entryIds": [
      "cect_0781"
    ],
    "pressureKPa": {
      "min": 25.0,
      "max": 25.0,
      "unit": "kPa"
    },
    "temperatureC": null,
    "speedMmS": {
      "min": 23.0,
      "max": 23.0,
      "unit": ""
    }
  },
  {
    "material": "Óxido de grafeno",
    "count": 1,
    "entryIds": [
      "cect_0782"
    ],
    "pressureKPa": null,
    "temperatureC": {
      "min": 25.0,
      "max": 25.0,
      "unit": ""
    },
    "speedMmS": {
      "min": 1.2,
      "max": 1.2,
      "unit": ""
    }
  },
  {
    "material": "Alginato [3",
    "count": 1,
    "entryIds": [
      "cect_0787"
    ],
    "pressureKPa": {
      "min": 4.0,
      "max": 25.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 14.0,
      "max": 18.0,
      "unit": "kPa"
    },
    "speedMmS": {
      "min": 23.0,
      "max": 24.0,
      "unit": ""
    }
  },
  {
    "material": "Álcool polivinílico [17",
    "count": 1,
    "entryIds": [
      "cect_0797"
    ],
    "pressureKPa": {
      "min": 5.0,
      "max": 5.0,
      "unit": "kPa"
    },
    "temperatureC": {
      "min": 15.0,
      "max": 15.0,
      "unit": "psi"
    },
    "speedMmS": {
      "min": 25.8,
      "max": 25.8,
      "unit": ""
    }
  }
]

// ============================================================================
// Helpers
// ============================================================================

export function listUniqueMaterials(): string[] {
  return MATERIAL_SUMMARY.map(m => m.material)
}

export function findMaterialSummary(name: string): MaterialSummary | undefined {
  const n = name.toLowerCase().trim()
  return MATERIAL_SUMMARY.find(m => m.material.toLowerCase() === n)
}

export function findEntriesByComponent(componentName: string): MaterialEntry[] {
  const n = componentName.toLowerCase().trim()
  return MATERIAL_DATABASE.filter(e =>
    e.components.some(c => c.material.toLowerCase().includes(n))
  )
}

export function pressureToKPa(range: RangeValue | null): RangeValue | null {
  if (!range) return null
  const u = range.unit.toLowerCase()
  if (u === 'kpa') return range
  if (u === 'bar' || u === 'barras') return { min: range.min * 100, max: range.max * 100, unit: 'kPa' }
  if (u === 'mpa') return { min: range.min * 1000, max: range.max * 1000, unit: 'kPa' }
  if (u === 'psi') return { min: range.min * 6.895, max: range.max * 6.895, unit: 'kPa' }
  return range
}

const GAUGE_TO_UM: Record<number, number> = {
  14: 1600, 15: 1370, 16: 1194, 17: 1067, 18: 838, 19: 686, 20: 603,
  21: 514, 22: 413, 23: 337, 24: 311, 25: 260, 26: 260, 27: 210, 28: 184,
  29: 184, 30: 159, 31: 133, 32: 108, 33: 108, 34: 82,
}

export function gaugeToDiameterUm(gauge: number): number {
  return GAUGE_TO_UM[gauge] ?? 400
}

export function needleToDiameterUm(needle: NeedleSpec | null): number | null {
  if (!needle) return null
  if (needle.kind === 'diameter_um' && needle.diameter_um) return needle.diameter_um
  if (needle.kind === 'gauge' && needle.gauge) return gaugeToDiameterUm(needle.gauge)
  return null
}

export interface RecommendedParams {
  pressureKPa: RangeValue | null
  temperatureC: RangeValue | null
  speedMmS: RangeValue | null
  entryCount: number
  sourceDois: string[]
}

export function getRecommendedParams(materialName: string): RecommendedParams | null {
  const summary = findMaterialSummary(materialName)
  if (!summary) return null
  const sourceDois = summary.entryIds
    .slice(0, 5)
    .map(id => MATERIAL_DATABASE.find(e => e.id === id)?.doi)
    .filter((d): d is string => Boolean(d))
  return {
    pressureKPa: summary.pressureKPa,
    temperatureC: summary.temperatureC,
    speedMmS: summary.speedMmS,
    entryCount: summary.count,
    sourceDois,
  }
}

/**
 * Retorna a top-N lista de materiais mais frequentes (por # de entradas na base).
 * Útil para popular dropdown de UI ordenado por relevância.
 */
export function topMaterials(n: number = 20): MaterialSummary[] {
  return MATERIAL_SUMMARY.slice(0, n)
}
