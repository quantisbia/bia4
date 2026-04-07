// BIA v4 — Biofabrication Database
// Source: CECT 3D Printing DB — 807 validated entries from peer-reviewed literature
// Auto-processed from cect-3d-printing-db-all-materials.csv
//
// Each material entry contains:
//   n           — number of literature entries
//   pressure    — printing pressure in kPa (min/max/typical)
//   temp        — nozzle temperature in °C
//   speed       — print speed in mm/s
//   needle_um   — nozzle diameter in µm
//   with_cells  — entries that include viable cells
//   concs       — concentration ranges found in literature
//   dois        — sample DOIs from source papers

export interface BiomaterialDBEntry {
  n: number
  pressure_kpa: { min: number|null; max: number|null; typical: number|null }
  temp_c: { min: number|null; max: number|null; typical: number|null }
  speed_mms: { min: number|null; max: number|null; typical: number|null }
  needle_um: { min: number|null; max: number|null; typical: number|null }
  with_cells: number
  concs: string[]
  dois: string[]
  sample_comps: string[]
}

export const BIOPRINT_DB: Record<string, BiomaterialDBEntry> = {
  "Alginate": {
    "n": 175,
    "pressure_kpa": {
      "min": 5.0,
      "max": 1000,
      "typical": 60
    },
    "temp_c": {
      "min": 5.0,
      "max": 37.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 0.75,
      "max": 70.0,
      "typical": 8.0
    },
    "needle_um": {
      "min": 100,
      "max": 1600,
      "typical": 260
    },
    "with_cells": 102,
    "dois": [
      "https://10.1016/j.jmbbm.2017.12.018"
    ],
    "sample_comps": [
      "Alginate [5 wt%] Gelatin [6 wt%]",
      "Alginate [7 wt%] Gelatin [8 wt%]",
      "Alginate [5 wt%] Gelatin [8 wt%]"
    ],
    "concs": [
      "3 wt%",
      "0.25 wt%",
      "40 mg/mL",
      "3.5 wt%",
      "2.8 wt%",
      "30 wt%",
      "0.01 wt%",
      "3.75 wt%"
    ]
  },
  "PCL": {
    "n": 135,
    "pressure_kpa": {
      "min": 70,
      "max": 900,
      "typical": 500.0
    },
    "temp_c": {
      "min": 25.0,
      "max": 205.0,
      "typical": 100.0
    },
    "speed_mms": {
      "min": 0.33,
      "max": 20.0,
      "typical": 1.5
    },
    "needle_um": {
      "min": 100,
      "max": 1070,
      "typical": 400
    },
    "with_cells": 0,
    "dois": [
      "https://10.1088/1758-5090/ab078a",
      "https://10.1089/ten.tec.2019.0112"
    ],
    "sample_comps": [
      "PCL [100 wt%]"
    ],
    "concs": [
      "97 wt%",
      "90 wt%",
      "40 wt%",
      "98 wt%",
      "100 wt%",
      "80 wt%",
      "85 wt%",
      "50 wt%"
    ]
  },
  "GelMA": {
    "n": 86,
    "pressure_kpa": {
      "min": 3,
      "max": 896,
      "typical": 100.0
    },
    "temp_c": {
      "min": 4.0,
      "max": 40.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 0.17,
      "max": 30.0,
      "typical": 6.67
    },
    "needle_um": {
      "min": 100,
      "max": 860,
      "typical": 210
    },
    "with_cells": 53,
    "dois": [
      "https://10.1021/acsbiomaterials.6b00031",
      "https://10.1016/j.bprint.2020.e00076",
      "https://10.1002/bit.26850",
      "https://10.1002/jbm.a.36350"
    ],
    "sample_comps": [
      "Gelatin Methacrylated [10 wt%]",
      "Gelatin Methacrylated [5 wt%]"
    ],
    "concs": [
      "3 wt%",
      "13 wt%",
      "5 wt%",
      "7.5 wt%",
      "12.5 wt%",
      "6 wt%",
      "10 wt%",
      "20 wt%"
    ]
  },
  "Gelatin": {
    "n": 77,
    "pressure_kpa": {
      "min": 1.0,
      "max": 260,
      "typical": 70.0
    },
    "temp_c": {
      "min": 4.0,
      "max": 70.0,
      "typical": 26.0
    },
    "speed_mms": {
      "min": 0.03,
      "max": 65.0,
      "typical": 7.0
    },
    "needle_um": {
      "min": 100,
      "max": 838,
      "typical": 260
    },
    "with_cells": 40,
    "dois": [
      "https://10.1038/nbt.3413",
      "https://10.1038/s41598-018-29968-5",
      "https://10.1088/1758-5090/aacdc7"
    ],
    "sample_comps": [
      "Gelatin [35 mg/mL] Fibrinogen [20 mg/mL] Hyaluronic Acid [3 mg/mL] Glycerol [10 %]",
      "Gelatin [45 mg/mL] Fibrinogen [30 mg/mL] Hyaluronic Acid [3 mg/mL] Glycerol [10 %]"
    ],
    "concs": [
      "10 wt%",
      "7 wt%",
      "50 wt%",
      "100 wt%",
      "8 wt%",
      "35 mg/mL",
      "7.5 wt%",
      "45 mg/mL"
    ]
  },
  "Pluronic F127": {
    "n": 28,
    "pressure_kpa": {
      "min": 14,
      "max": 420,
      "typical": 125.0
    },
    "temp_c": {
      "min": 4.0,
      "max": 37.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 0.02,
      "max": 25.0,
      "typical": 6.0
    },
    "needle_um": {
      "min": 80,
      "max": 1070,
      "typical": 300
    },
    "with_cells": 4,
    "dois": [
      "https://10.1007/s10856-019-6258-2",
      "https://10.1016/j.actbio.2019.02.038",
      "https://10.1038/nbt.3413"
    ],
    "sample_comps": [
      "Pluronic F127 [60 wt%] Collagen [6 wt%]",
      "Pluronic F127 [40 wt%]",
      "Pluronic F127 [33 wt%] Glycerol [10 %]"
    ],
    "concs": [
      "12 wt%",
      "26 wt%",
      "24.5 wt%",
      "60 wt%",
      "33 wt%",
      "25 wt%",
      "30 wt%",
      "27 wt%"
    ]
  },
  "Hyaluronic Acid": {
    "n": 28,
    "pressure_kpa": {
      "min": 20,
      "max": 552.0,
      "typical": 160.0
    },
    "temp_c": {
      "min": 18.0,
      "max": 37.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 0.42,
      "max": 28.0,
      "typical": 3.0
    },
    "needle_um": {
      "min": 159,
      "max": 838,
      "typical": 260
    },
    "with_cells": 15,
    "dois": [
      "https://10.1007/s42242-020-00076-6",
      "https://10.1016/j.bprint.2018.e00028",
      "https://10.1002/adfm.201801331"
    ],
    "sample_comps": [
      "Hyaluronic Acid [3 mg/mL] Gelatin [30 mg/mL] Fibrinogen [20 mg/mL] Glycerol [10 %]",
      "Hyaluronic Acid [2 wt%] Alginate [1 wt%] Gelatin [3.75 wt%]"
    ],
    "concs": [
      "1 wt%",
      "3 wt%",
      "10 wt%",
      "0.1 wt%",
      "50 wt%",
      "1.5 wt%",
      "3.5 wt%",
      "25 wt%"
    ]
  },
  "Chitosan": {
    "n": 20,
    "pressure_kpa": {
      "min": 25.0,
      "max": 350,
      "typical": 74
    },
    "temp_c": {
      "min": 2.0,
      "max": 37.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 2.0,
      "max": 20.0,
      "typical": 10.0
    },
    "needle_um": {
      "min": 210,
      "max": 580,
      "typical": 330
    },
    "with_cells": 3,
    "dois": [
      "https://10.1021/acs.biomaterials.8b00804",
      "https://http://ijb.whioce.com/index.php/int-j-bioprinting/article/view/02009",
      "https://10.3390/pharmaceutics12060550"
    ],
    "sample_comps": [
      "Chitosan [4 wt%]",
      "Chitosan [1.2 wt%] Genipin [1 wt%] PEG [1.2 wt%]",
      "Chitosan [2.5 wt%] Gelatin [5 wt%]"
    ],
    "concs": [
      "2.5 wt%",
      "1.2 wt%",
      "5 wt%",
      "2 wt%",
      "6 wt%",
      "10 wt%",
      "4.5 wt%",
      "4 wt%"
    ]
  },
  "Polypropylene fumarate (PPF)": {
    "n": 19,
    "pressure_kpa": {
      "min": 10,
      "max": 700,
      "typical": 40
    },
    "temp_c": {
      "min": 37.0,
      "max": 90.0,
      "typical": 55.0
    },
    "speed_mms": {
      "min": 0.1,
      "max": 20.0,
      "typical": 2.2
    },
    "needle_um": {
      "min": 250,
      "max": 838,
      "typical": 413
    },
    "with_cells": 0,
    "dois": [
      "https://10.1021/acsbiomaterials.6b00026",
      "https://10.1080/09205063.2017.1286184"
    ],
    "sample_comps": [
      "Polypropylene fumarate (PPF) [75 wt%] Diethyl fumarate (DEF) [12 wt%] Hydroxyapatite [10 wt%] SDS/DMSO [3 wt%]",
      "Polypropylene fumarate (PPF) [90 wt%] Diethyl fumarate (DEF) [10 wt%]",
      "Polypropylene fumarate (PPF) [85 wt%] Diethyl fumarate (DEF) [15 wt%]"
    ],
    "concs": [
      "90 wt%",
      "76 wt%",
      "82 wt%",
      "79 wt%",
      "85 wt%",
      "88 wt%",
      "75 wt%"
    ]
  },
  "Diclofenac Sodium": {
    "n": 19,
    "pressure_kpa": {
      "min": 57,
      "max": 369,
      "typical": 217
    },
    "temp_c": {
      "min": 25.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 10.0,
      "max": 10.0,
      "typical": 10.0
    },
    "needle_um": {
      "min": 400,
      "max": 600,
      "typical": 500
    },
    "with_cells": 0,
    "dois": [
      "https://10.1016/j.ijpharm.2018.11.044"
    ],
    "sample_comps": [
      "Diclofenac Sodium [20 wt%] Lactose [10 wt%] Polyplasdone [2 wt%] Carbopol [3 wt%]",
      "Diclofenac Sodium [20 wt%] Lactose [10 wt%] Polyplasdone [2 wt%] Carbopol [1 wt%]",
      "Diclofenac Sodium [20 wt%] Lactose [10 wt%] Polyplasdone [8 wt%] Carbopol [1 wt%]"
    ],
    "concs": [
      "20 wt%",
      "35 wt%",
      "50 wt%"
    ]
  },
  "PLGA": {
    "n": 15,
    "pressure_kpa": {
      "min": 150,
      "max": 900,
      "typical": 800
    },
    "temp_c": {
      "min": 45.0,
      "max": 200.0,
      "typical": 140.0
    },
    "speed_mms": {
      "min": 0.5,
      "max": 19.0,
      "typical": 1.5
    },
    "needle_um": {
      "min": 200,
      "max": 400,
      "typical": 260
    },
    "with_cells": 0,
    "dois": [
      "https://10.1088/1758-5090/aa6370"
    ],
    "sample_comps": [
      "PLGA [100 wt%]"
    ],
    "concs": [
      "66 wt%",
      "100 wt%",
      "60 wt%"
    ]
  },
  "Methylcellulose": {
    "n": 15,
    "pressure_kpa": {
      "min": 20.0,
      "max": 400,
      "typical": 50.0
    },
    "temp_c": {
      "min": 24.0,
      "max": 37.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 1.0,
      "max": 10.0,
      "typical": 10.0
    },
    "needle_um": {
      "min": 210,
      "max": 838,
      "typical": 260
    },
    "with_cells": 0,
    "dois": [
      "https://10.1021/acsami.7b04216",
      "https://10.3389/fbioe.2020.00217",
      "https://10.1016/j.xphs.2018.08.026"
    ],
    "sample_comps": [
      "Methylcellulose [3 wt%]",
      "Methylcellulose [9 wt%]",
      "Methylcellulose [1 wt%]"
    ],
    "concs": [
      "1 wt%",
      "3 wt%",
      "50 wt%",
      "8 wt%",
      "9 wt%",
      "5 wt%",
      "30 wt%",
      "10 wt%"
    ]
  },
  "dECM": {
    "n": 14,
    "pressure_kpa": {
      "min": 10.0,
      "max": 230.0,
      "typical": 40.0
    },
    "temp_c": {
      "min": 4.0,
      "max": 25.0,
      "typical": 16.0
    },
    "speed_mms": {
      "min": 5.0,
      "max": 15.0,
      "typical": 15.0
    },
    "needle_um": {
      "min": 200,
      "max": 413,
      "typical": 260
    },
    "with_cells": 9,
    "dois": [
      "https://10.1088/1758-5090/aba411",
      "https://10.1088/1758-5090/ab15a9",
      "https://10.1016/j.actbio.2020.11.006"
    ],
    "sample_comps": [
      "dECM Porcine Tendon [3 wt%]",
      "dECM Small Intestinal Submucosa [2.5 wt%] Pepsin [0.25 wt%]"
    ],
    "concs": [
      "3 wt%",
      "2.5 wt%",
      "1.2 wt%",
      "0.6 wt%",
      "1.5 wt%",
      "2 wt%",
      "4.6 wt%"
    ]
  },
  "Collagen": {
    "n": 12,
    "pressure_kpa": {
      "min": 4.0,
      "max": 110.0,
      "typical": 15.0
    },
    "temp_c": {
      "min": 4.0,
      "max": 25.0,
      "typical": 15.0
    },
    "speed_mms": {
      "min": 0.3,
      "max": 50.0,
      "typical": 25.0
    },
    "needle_um": {
      "min": 184,
      "max": 610,
      "typical": 210
    },
    "with_cells": 9,
    "dois": [
      "https://10.1088/1758-5090/aae543",
      "https://10.1021/acsami.6b11669",
      "https://10.1089/ten.tec/2017.0346"
    ],
    "sample_comps": [
      "Collagen Methacrylated [2.34 wt%] Carbon Nanotubes [0.117 wt%]",
      "Collagen [5 wt%]"
    ],
    "concs": [
      "4.8 mg/mL",
      "3 wt%",
      "14 wt%",
      "5 wt%",
      "4.5 mg/mL",
      "2 wt%",
      "4 mg/mL",
      "2.34 wt%"
    ]
  },
  "Polyethylene oxide": {
    "n": 8,
    "pressure_kpa": {
      "min": 350.0,
      "max": 450.0,
      "typical": 450.0
    },
    "temp_c": {
      "min": 100.0,
      "max": 160.0,
      "typical": 140.0
    },
    "speed_mms": {
      "min": 4.0,
      "max": 5.0,
      "typical": 4.0
    },
    "needle_um": {
      "min": 400,
      "max": 400,
      "typical": 400
    },
    "with_cells": 0,
    "dois": [
      "https://10.3390/pharmaceutics12080692",
      "https://10.1016/j.ijpharm.2020.119405"
    ],
    "sample_comps": [
      "Polyethylene oxide [82.3 wt%] Pluronic F68 [8.2 wt%] Citric acid [1.3 wt%] Aripiprazole [8.2 wt%]",
      "Polyethylene oxide [100 wt%]",
      "Polyethylene oxide [90 wt%] Poly(vinylpyrrolidone-co-vinyl acetate) [10 wt%]"
    ],
    "concs": [
      "90 wt%",
      "100 wt%",
      "80 wt%",
      "70 wt%",
      "82.3 wt%",
      "75 wt%"
    ]
  },
  "Gellan Gum": {
    "n": 7,
    "pressure_kpa": {
      "min": 25.0,
      "max": 103.0,
      "typical": 26.0
    },
    "temp_c": {
      "min": 25.0,
      "max": 37.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 3.58,
      "max": 13.34,
      "typical": 10.0
    },
    "needle_um": {
      "min": 260,
      "max": 410,
      "typical": 410
    },
    "with_cells": 3,
    "dois": [
      "https://10.1088/1758-5090/abc39b",
      "https://10.1016/j.matdes.2018.09.040"
    ],
    "sample_comps": [
      "Gellan Gum [3 wt%] Alginate [2 wt%]",
      "Gellan Gum [1.5 wt%] PEGDA [10 wt%]"
    ],
    "concs": [
      "1.5 wt%",
      "3 wt%",
      "4 wt%"
    ]
  },
  "Fibrinogen": {
    "n": 6,
    "pressure_kpa": {
      "min": 50,
      "max": 100.0,
      "typical": 60.0
    },
    "temp_c": {
      "min": 18.0,
      "max": 26.0,
      "typical": 22.0
    },
    "speed_mms": {
      "min": 1.0,
      "max": 10.0,
      "typical": 2.0
    },
    "needle_um": {
      "min": 200,
      "max": 400,
      "typical": 300
    },
    "with_cells": 6,
    "dois": [
      "https://10.1088/1758-5090/ab078a",
      "https://10.1016/j.actbio.2016.12.008",
      "https://10.1038/s41598-018-29968-5",
      "https://10.1016/j.actbio.2018.02.007"
    ],
    "sample_comps": [
      "Fibrinogen [10 wt%] Gelatin [5 wt%]",
      "Fibrinogen [20 mg/mL] Gelatin [30 mg/mL] Hyaluronic Acid [3 mg/mL] Glycerol [10 %]"
    ],
    "concs": [
      "20 mg/mL",
      "30 wt%",
      "10 wt%"
    ]
  },
  "PCU": {
    "n": 6,
    "pressure_kpa": {
      "min": null,
      "max": null,
      "typical": null
    },
    "temp_c": {
      "min": 212.0,
      "max": 220.0,
      "typical": 215.0
    },
    "speed_mms": {
      "min": 6.0,
      "max": 6.0,
      "typical": 6.0
    },
    "needle_um": {
      "min": 400,
      "max": 400,
      "typical": 400
    },
    "with_cells": 0,
    "dois": [
      "https://10.1002/jbm.a.37006"
    ],
    "sample_comps": [
      "PCU [100 wt%]"
    ],
    "concs": [
      "100 wt%"
    ]
  },
  "PEGDA": {
    "n": 6,
    "pressure_kpa": {
      "min": 7.0,
      "max": 552,
      "typical": 152
    },
    "temp_c": {
      "min": 25.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 0.75,
      "max": 7.5,
      "typical": 2.0
    },
    "needle_um": {
      "min": 100,
      "max": 610,
      "typical": 250
    },
    "with_cells": 0,
    "dois": [
      "https://10.1021/acsami.7b03613",
      "https://10.1088/1758-5082/5/3/035001",
      "https://10.1002/adfm.201801850",
      "https://10.1088/1758-5090/aa869f"
    ],
    "sample_comps": [
      "PEGDA [20 wt%] Xanthan Gum [0.5 wt%]",
      "PEGDA [20 wt%] Alginate [1 wt%]",
      "PEGDA [20 wt%] Alginate [10 wt%]"
    ],
    "concs": [
      "20 wt%",
      "6 wt%",
      "7.5 mM"
    ]
  },
  "Hydroxypropyl Cellulose": {
    "n": 5,
    "pressure_kpa": {
      "min": 69,
      "max": 200.0,
      "typical": 72
    },
    "temp_c": {
      "min": 25.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 5.0,
      "max": 8.0,
      "typical": 8.0
    },
    "needle_um": {
      "min": 260,
      "max": 514,
      "typical": 514
    },
    "with_cells": 0,
    "dois": [
      "https://10.1016/j.ijpharm.2019.04.018",
      "https://10.3390/pharmaceutics11070334",
      "https://10.1016/j.actbio.2020.11.022"
    ],
    "sample_comps": [
      "Hydroxypropyl Cellulose [5 wt%] Iron Powder [35 wt%]",
      "Hydroxypropyl Cellulose [12 wt%]",
      "Hydroxypropyl Cellulose [7.5 wt%] Warfarin Sodium [0.75 wt%]"
    ],
    "concs": [
      "12 wt%",
      "14 wt%",
      "16 wt%",
      "7.5 wt%",
      "5 wt%"
    ]
  },
  "Polyurethane": {
    "n": 4,
    "pressure_kpa": {
      "min": 80.0,
      "max": 1500.0,
      "typical": 250.0
    },
    "temp_c": {
      "min": 25.0,
      "max": 160.0,
      "typical": 37.0
    },
    "speed_mms": {
      "min": 1.67,
      "max": 8.0,
      "typical": 6.67
    },
    "needle_um": {
      "min": 200,
      "max": 410,
      "typical": 200
    },
    "with_cells": 2,
    "dois": [
      "https://10.1088/1758-5090/8/4/045015",
      "https://10.1016/j.bprint.2018.e00028",
      "https://10.1016/j.actbio.2018.01.044"
    ],
    "sample_comps": [
      "Polyurethane [25 wt%]",
      "Polyurethane [40 wt%]",
      "Polyurethane [100 wt%]"
    ],
    "concs": [
      "40 wt%",
      "25 wt%",
      "100 wt%"
    ]
  },
  "Hydroxyapatite": {
    "n": 4,
    "pressure_kpa": {
      "min": 240.0,
      "max": 600.0,
      "typical": 600.0
    },
    "temp_c": {
      "min": 25.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 1.0,
      "max": 8.0,
      "typical": 1.67
    },
    "needle_um": {
      "min": 610,
      "max": 1500,
      "typical": 610
    },
    "with_cells": 0,
    "dois": [
      "https://10.1088/1758-5090/abcf8d",
      "https://10.1016/j.jfma.2020.10.022",
      "https://10.1002/bit.26514"
    ],
    "sample_comps": [
      "Strontium Iron Hydroxyapatite Nanoparticles [20 wt%] PCL [25 wt%]",
      "Hydroxyapatite [60 wt%] Beta Tricalcium Phosphate [40 wt%]",
      "Hydroxyapatite [60 wt%] Beta Tricalcium Phosphate [40 wt%] Zirconium oxide [10 wt%]"
    ],
    "concs": [
      "20 wt%",
      "90 wt%",
      "60 wt%"
    ]
  },
  "E-Shell 300": {
    "n": 4,
    "pressure_kpa": {
      "min": 30,
      "max": 100,
      "typical": 100
    },
    "temp_c": {
      "min": 22.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 12.0,
      "max": 20.0,
      "typical": 12.0
    },
    "needle_um": {
      "min": 210,
      "max": 600,
      "typical": 600
    },
    "with_cells": 0,
    "dois": [
      "https://10.1016/j.bprint.2020.e00076",
      "https://10.1089/ten.TEC.2020.0050"
    ],
    "sample_comps": [
      "E-Shell 300 [70 wt%] Hydroxyapatite [30 wt%]",
      "E-Shell 300 [70 wt%] Beta Tricalcium Phosphate [30 wt%]",
      "E-Shell 300 [100 wt%]"
    ],
    "concs": [
      "70 wt%",
      "100 wt%"
    ]
  },
  "PLA": {
    "n": 4,
    "pressure_kpa": {
      "min": 500,
      "max": 700.0,
      "typical": 700.0
    },
    "temp_c": {
      "min": 180.0,
      "max": 230.0,
      "typical": 190.0
    },
    "speed_mms": {
      "min": 2.0,
      "max": 90.0,
      "typical": 7.5
    },
    "needle_um": {
      "min": 200,
      "max": 600,
      "typical": 350
    },
    "with_cells": 0,
    "dois": [
      "https://10.1088/1758-5090/8/3/035013",
      "https://10.1088/1748-605X/aa7692",
      "https://10.1016/j.jbiotec.2018.08.019",
      "https://10.1088/1758-5090/ab0f59"
    ],
    "sample_comps": [
      "PLA [75 wt%] Poly(3-hydroxybutyrate) (PHB) [25 wt%]",
      "PLA [100 wt%]"
    ],
    "concs": [
      "100 wt%",
      "75 wt%"
    ]
  },
  "Laponite": {
    "n": 4,
    "pressure_kpa": {
      "min": 76,
      "max": 103,
      "typical": 80.0
    },
    "temp_c": {
      "min": 25.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 0.75,
      "max": 10.0,
      "typical": 8.0
    },
    "needle_um": {
      "min": 330,
      "max": 410,
      "typical": 410
    },
    "with_cells": 2,
    "dois": [
      "https://10.1088/1758-5090/aa7e96",
      "https://10.1021/acsami.8b00806",
      "https://10.1007/978-1-0716-0611-7_6"
    ],
    "sample_comps": [
      "Laponite [3 wt%] Alginate [3 wt%] Methylcellulose [3 wt%]",
      "Laponite [6 wt%] N-isopropylacrylamide [18 wt%]",
      "Laponite [6 wt%] N-isopropylacrylamide [18 wt%] Graphene Oxide [0.44 wt%]"
    ],
    "concs": [
      "3 wt%",
      "6 wt%"
    ]
  },
  "Polyvinyl Alcohol": {
    "n": 4,
    "pressure_kpa": {
      "min": 103,
      "max": 103,
      "typical": 103
    },
    "temp_c": {
      "min": 25.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 8.0,
      "max": 8.0,
      "typical": 8.0
    },
    "needle_um": {
      "min": 514,
      "max": 514,
      "typical": 514
    },
    "with_cells": 0,
    "dois": [
      "https://10.1016/j.ijpharm.2019.04.018"
    ],
    "sample_comps": [
      "Polyvinyl Alcohol [18 wt%]",
      "Polyvinyl Alcohol [15 wt%]",
      "Polyvinyl Alcohol [17.5 wt%]"
    ],
    "concs": [
      "19 wt%",
      "17.5 wt%",
      "15 wt%",
      "18 wt%"
    ]
  },
  "PLCL": {
    "n": 3,
    "pressure_kpa": {
      "min": 550.0,
      "max": 760.0,
      "typical": 650
    },
    "temp_c": {
      "min": 150.0,
      "max": 160.0,
      "typical": 155.0
    },
    "speed_mms": {
      "min": 1.67,
      "max": 8.34,
      "typical": 4.2
    },
    "needle_um": {
      "min": 200,
      "max": 200,
      "typical": 200
    },
    "with_cells": 0,
    "dois": [
      "https://10.1016/j.biomaterials.2018.09.022",
      "https://10.1016/j.actbio.2016.12.008"
    ],
    "sample_comps": [
      "PLCL [85 wt%] PLGA [15 wt%]",
      "PLCL [50 wt%] PCL [50 wt%]",
      "PLCL [100 wt%]"
    ],
    "concs": [
      "85 wt%",
      "100 wt%",
      "50 wt%"
    ]
  },
  "Alpha Tricalcium Phosphate": {
    "n": 3,
    "pressure_kpa": {
      "min": 200.0,
      "max": 250.0,
      "typical": 250.0
    },
    "temp_c": {
      "min": 20.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 2.0,
      "max": 12.0,
      "typical": 9.0
    },
    "needle_um": {
      "min": 230,
      "max": 330,
      "typical": 250
    },
    "with_cells": 0,
    "dois": [
      "https://10.1088/1758-5090/ab69d9",
      "https://10.1007/s10439-016-1685-4"
    ],
    "sample_comps": [
      "Alpha Tricalcium Phosphate [60 wt%] Calcium Hydrogen Phosphate [26 wt%] Calcium Carbonate [10 wt%] Hyaluronic Acid Precipitated [4 wt%]",
      "Alpha Tricalcium Phosphate [60 wt%] Calcium Hydrogen Phosphate [26 wt%] Calcium Carbonate [10 wt%] Hyaluronic Acid [4 wt%]",
      "Alpha Tricalcium Phosphate [66 wt%] Hydroxyapatite [4 wt%] Pluronic F127 [40 wt%]"
    ],
    "concs": [
      "60 wt%",
      "66 wt%"
    ]
  },
  "Matrigel": {
    "n": 3,
    "pressure_kpa": {
      "min": 3,
      "max": 3,
      "typical": 3
    },
    "temp_c": {
      "min": 4.0,
      "max": 4.0,
      "typical": 4.0
    },
    "speed_mms": {
      "min": 1.0,
      "max": 3.0,
      "typical": 3.0
    },
    "needle_um": {
      "min": 100,
      "max": 100,
      "typical": 100
    },
    "with_cells": 3,
    "dois": [
      "https://10.1002/adfm.201801850"
    ],
    "sample_comps": [
      "Matrigel [50 wt%]"
    ],
    "concs": [
      "50 wt%"
    ]
  },
  "PDMS": {
    "n": 3,
    "pressure_kpa": {
      "min": 138,
      "max": 172,
      "typical": 172
    },
    "temp_c": {
      "min": 25.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 1.0,
      "max": 20.0,
      "typical": 3.0
    },
    "needle_um": {
      "min": 150,
      "max": 400,
      "typical": 250
    },
    "with_cells": 0,
    "dois": [
      "https://10.1021/acsami.9b07433",
      "https://10.1021/acsbiomaterials.6b00170"
    ],
    "sample_comps": [
      "PDMS [100 wt%]"
    ],
    "concs": [
      "100 wt%"
    ]
  },
  "SC 5050 Polyester": {
    "n": 3,
    "pressure_kpa": {
      "min": 270,
      "max": 470,
      "typical": 430
    },
    "temp_c": {
      "min": 30.0,
      "max": 52.0,
      "typical": 48.0
    },
    "speed_mms": {
      "min": 0.5,
      "max": 0.5,
      "typical": 0.5
    },
    "needle_um": {
      "min": 410,
      "max": 410,
      "typical": 410
    },
    "with_cells": 0,
    "dois": [
      "https://10.1021/acsbiomaterials.8b00964"
    ],
    "sample_comps": [
      "SC 5050 Polyester [94 wt%] Dexamethosone [6 wt%]",
      "SC 5050 Polyester [100 wt%]",
      "SC 5050 Polyester [98 wt%] Dexamethosone [2 wt%]"
    ],
    "concs": [
      "98 wt%",
      "94 wt%",
      "100 wt%"
    ]
  },
  "Ulvan Methacrylated": {
    "n": 3,
    "pressure_kpa": {
      "min": 300,
      "max": 350,
      "typical": 350
    },
    "temp_c": {
      "min": 22.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 8.0,
      "max": 8.0,
      "typical": 8.0
    },
    "needle_um": {
      "min": 210,
      "max": 210,
      "typical": 210
    },
    "with_cells": 3,
    "dois": [
      "https://10.1039/d0bm01784a"
    ],
    "sample_comps": [
      "Ulvan Methacrylated [4 wt%] Gelatin Methacrylated [2 wt%] Gelatin [3.6 wt%]",
      "Ulvan Methacrylated [2 wt%] Gelatin Methacrylated [4 wt%] Gelatin [3.6 wt%]",
      "Ulvan Methacrylated [6 wt%] Gelatin [3.6 wt%]"
    ],
    "concs": [
      "2 wt%",
      "6 wt%",
      "4 wt%"
    ]
  },
  "Levetiracetam": {
    "n": 3,
    "pressure_kpa": {
      "min": 180,
      "max": 280,
      "typical": 220
    },
    "temp_c": {
      "min": 27.0,
      "max": 27.0,
      "typical": 27.0
    },
    "speed_mms": {
      "min": 25.0,
      "max": 25.0,
      "typical": 25.0
    },
    "needle_um": {
      "min": null,
      "max": null,
      "typical": null
    },
    "with_cells": 0,
    "dois": [
      "https://10.1016/j.ejps.2020.105266"
    ],
    "sample_comps": [
      "Levetiracetam [23.4 wt%] Polyvinyl acetate / Polyvinyl Pyrrolidone [15.9 wt%] Silicon dioxide [10 wt%] Hydroxypropyl Methylcellulose [15 wt%]",
      "Levetiracetam [23.4 wt%] Polyvinyl acetate / Polyvinyl Pyrrolidone [20.9 wt%] Silicon dioxide [10 wt%] Hydroxypropyl Methylcellulose [10 wt%]",
      "Levetiracetam [23.4 wt%] Polyvinyl acetate / Polyvinyl Pyrrolidone [25.9 wt%] Silicon dioxide [10 wt%] Hydroxypropyl Methylcellulose [5 wt%]"
    ],
    "concs": [
      "23.4 wt%"
    ]
  },
  "Graphene Oxide": {
    "n": 3,
    "pressure_kpa": {
      "min": 60,
      "max": 60,
      "typical": 60
    },
    "temp_c": {
      "min": 23.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 1.0,
      "max": 12.0,
      "typical": 6.0
    },
    "needle_um": {
      "min": 2,
      "max": 510,
      "typical": 400
    },
    "with_cells": 0,
    "dois": [
      "https://10.1039/c8nr06369a",
      "https://10.1002/adma.201705651",
      "https://10.1021/acsami.7b07717"
    ],
    "sample_comps": [
      "Graphene Oxide [100 mg/mL]",
      "Graphene Oxide [17.25 mg/mL]",
      "Graphene Oxide [1 mg/ml] Silver Nanowire [1 mg/ml]"
    ],
    "concs": [
      "1 wt%",
      "100 mg/mL",
      "17.25 mg/mL"
    ]
  },
  "Mxene": {
    "n": 3,
    "pressure_kpa": {
      "min": 28,
      "max": 60,
      "typical": 28
    },
    "temp_c": {
      "min": 25.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 3.0,
      "max": 10.0,
      "typical": 4.0
    },
    "needle_um": {
      "min": 230,
      "max": 600,
      "typical": 400
    },
    "with_cells": 0,
    "dois": [
      "https://10.1021/acsnano.9b07325",
      "https://10.1039/c8nr06369a"
    ],
    "sample_comps": [
      "Mxene [100 wt%]",
      "Mxene [1 mg/ml] Silver Nanowire [1 mg/ml]"
    ],
    "concs": [
      "1 wt%",
      "100 wt%"
    ]
  },
  "Silopren UV LSR 2030 PDMS": {
    "n": 3,
    "pressure_kpa": {
      "min": 414.0,
      "max": 414.0,
      "typical": 414.0
    },
    "temp_c": {
      "min": 25.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 1.0,
      "max": 1.0,
      "typical": 1.0
    },
    "needle_um": {
      "min": 514,
      "max": 514,
      "typical": 514
    },
    "with_cells": 0,
    "dois": [
      "https://10.1016/j.ijpharm.2017.11.016"
    ],
    "sample_comps": [
      "Silopren UV LSR 2030 PDMS [98.5 wt%] Prednisolone [1.5 wt%]",
      "Silopren UV LSR 2030 PDMS [99.5 wt%] Prednisolone [0.5 wt%]",
      "Silopren UV LSR 2030 PDMS [99 wt%] Prednisolone [1 wt%]"
    ],
    "concs": [
      "99 wt%",
      "98.5 wt%",
      "99.5 wt%"
    ]
  },
  "Chocolate": {
    "n": 3,
    "pressure_kpa": {
      "min": 204.8,
      "max": 204.8,
      "typical": 204.8
    },
    "temp_c": {
      "min": 45.0,
      "max": 45.0,
      "typical": 45.0
    },
    "speed_mms": {
      "min": 5.0,
      "max": 5.0,
      "typical": 5.0
    },
    "needle_um": {
      "min": 2000,
      "max": 2000,
      "typical": 2000
    },
    "with_cells": 0,
    "dois": [
      "https://10.1016/j.ejps.2020.105291"
    ],
    "sample_comps": [
      "Chocolate [50 wt%] Corn syrup [50 wt%]",
      "Chocolate [49.02 wt%] Corn syrup [49.02 wt%] Ibuprofen [1.96 wt%]",
      "Chocolate [48.85 wt%] Corn syrup [48.85 wt%] Paracetamol [2.3 wt%]"
    ],
    "concs": [
      "48.85 wt%",
      "49.02 wt%",
      "50 wt%"
    ]
  },
  "Polystyrene": {
    "n": 2,
    "pressure_kpa": {
      "min": 900.0,
      "max": 900.0,
      "typical": 900.0
    },
    "temp_c": {
      "min": 155.0,
      "max": 155.0,
      "typical": 155.0
    },
    "speed_mms": {
      "min": 3.0,
      "max": 5.0,
      "typical": 5.0
    },
    "needle_um": {
      "min": 400,
      "max": 400,
      "typical": 400
    },
    "with_cells": 0,
    "dois": [
      "https://10.1089/ten.tec.2019.0217",
      "https://10.1002/jbm.b.34347"
    ],
    "sample_comps": [
      "Polystyrene [100 wt%]"
    ],
    "concs": [
      "100 wt%"
    ]
  },
  "Glass Sugar": {
    "n": 2,
    "pressure_kpa": {
      "min": 70.0,
      "max": 70.0,
      "typical": 70.0
    },
    "temp_c": {
      "min": 150.0,
      "max": 155.0,
      "typical": 155.0
    },
    "speed_mms": {
      "min": 10.0,
      "max": 30.0,
      "typical": 30.0
    },
    "needle_um": {
      "min": 300,
      "max": 300,
      "typical": 300
    },
    "with_cells": 0,
    "dois": [
      "https://10.1089/ten.tec.2019.0217",
      "https://10.1002/jbm.b.34347"
    ],
    "sample_comps": [
      "Glass Sugar [100 wt%]"
    ],
    "concs": [
      "100 wt%"
    ]
  },
  "Cellulose Nanofibrillated": {
    "n": 2,
    "pressure_kpa": {
      "min": 40.0,
      "max": 100.0,
      "typical": 100.0
    },
    "temp_c": {
      "min": 23.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 5.0,
      "max": 10.0,
      "typical": 10.0
    },
    "needle_um": {
      "min": 150,
      "max": 300,
      "typical": 300
    },
    "with_cells": 1,
    "dois": [
      "https://10.1016/j.bprint.2016.08.003",
      "https://10.1021/acsomega.0c05036"
    ],
    "sample_comps": [
      "Cellulose Nanofibrillated [1.15 wt%]",
      "Cellulose Nanofibrillated [2 wt%] Alginate [0.5 wt%]"
    ],
    "concs": [
      "2 wt%",
      "1.15 wt%"
    ]
  },
  "Agarose": {
    "n": 2,
    "pressure_kpa": {
      "min": 200.0,
      "max": 448,
      "typical": 448
    },
    "temp_c": {
      "min": 37.0,
      "max": 37.0,
      "typical": 37.0
    },
    "speed_mms": {
      "min": null,
      "max": null,
      "typical": null
    },
    "needle_um": {
      "min": 159,
      "max": 159,
      "typical": 159
    },
    "with_cells": 1,
    "dois": [
      "https://10.1021/acsbiomaterials.8b00903",
      "https://10.1088/1758-5090/8/4/045002"
    ],
    "sample_comps": [
      "Agarose [2 wt%]",
      "Agarose [3 wt%] Alginate [2 wt%]"
    ],
    "concs": [
      "3 wt%",
      "2 wt%"
    ]
  },
  "PVA": {
    "n": 2,
    "pressure_kpa": {
      "min": 350,
      "max": 350,
      "typical": 350
    },
    "temp_c": {
      "min": 25.0,
      "max": 180.0,
      "typical": 180.0
    },
    "speed_mms": {
      "min": 2.0,
      "max": 70.0,
      "typical": 70.0
    },
    "needle_um": {
      "min": 400,
      "max": 400,
      "typical": 400
    },
    "with_cells": 0,
    "dois": [
      "https://10.1016/j.msec.2019.110205",
      "https://10.3390/ma11061006"
    ],
    "sample_comps": [
      "PVA [100 wt%]",
      "PVA [6 wt%]"
    ],
    "concs": [
      "6 wt%",
      "100 wt%"
    ]
  },
  "PLLA": {
    "n": 2,
    "pressure_kpa": {
      "min": 500,
      "max": 900,
      "typical": 900
    },
    "temp_c": {
      "min": 200.0,
      "max": 220.0,
      "typical": 220.0
    },
    "speed_mms": {
      "min": 2.0,
      "max": 45.0,
      "typical": 12.0
    },
    "needle_um": {
      "min": 400,
      "max": 500,
      "typical": 500
    },
    "with_cells": 0,
    "dois": [
      "https://10.1021/acs.biomac.9b01112",
      "https://10.1088/1758-5090/ab1d44"
    ],
    "sample_comps": [
      "PLLA [100 wt%]"
    ],
    "concs": [
      "100 wt%"
    ]
  },
  "Nanocellulose": {
    "n": 2,
    "pressure_kpa": {
      "min": 35.0,
      "max": 55.0,
      "typical": 55.0
    },
    "temp_c": {
      "min": null,
      "max": null,
      "typical": null
    },
    "speed_mms": {
      "min": 5.0,
      "max": 8.0,
      "typical": 8.0
    },
    "needle_um": {
      "min": 410,
      "max": 630,
      "typical": 630
    },
    "with_cells": 0,
    "dois": [
      "https://10.1021/acs.biomac.9b00527"
    ],
    "sample_comps": [
      "Nanocellulose Acetylated [0.5 wt%]",
      "Nanocellulose TEMPO Oxidized [1.7 wt%]"
    ],
    "concs": [
      "1.7 wt%",
      "0.5 wt%"
    ]
  },
  "Calcium Phosphate Cement": {
    "n": 2,
    "pressure_kpa": {
      "min": 100.0,
      "max": 150.0,
      "typical": 150.0
    },
    "temp_c": {
      "min": 25.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 10.0,
      "max": 11.0,
      "typical": 11.0
    },
    "needle_um": {
      "min": 230,
      "max": 410,
      "typical": 410
    },
    "with_cells": 0,
    "dois": [
      "https://10.1038/s41598-020-65050-9",
      "https://10.3389/fbioe.2020.00217"
    ],
    "sample_comps": [
      "Calcium Phosphate Cement [100 wt%]"
    ],
    "concs": [
      "100 wt%"
    ]
  },
  "SU-8 2050": {
    "n": 2,
    "pressure_kpa": {
      "min": 138,
      "max": 207,
      "typical": 207
    },
    "temp_c": {
      "min": 25.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 0.5,
      "max": 1.0,
      "typical": 1.0
    },
    "needle_um": {
      "min": 200,
      "max": 250,
      "typical": 250
    },
    "with_cells": 0,
    "dois": [
      "https://10.1021/acsami.9b07433",
      "https://10.1021/acsami.7b02398"
    ],
    "sample_comps": [
      "SU-8 2050 [100 wt%]"
    ],
    "concs": [
      "100 wt%"
    ]
  },
  "PEOXA": {
    "n": 2,
    "pressure_kpa": {
      "min": 18.0,
      "max": 20.0,
      "typical": 20.0
    },
    "temp_c": {
      "min": 25.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": null,
      "max": null,
      "typical": null
    },
    "needle_um": {
      "min": 410,
      "max": 410,
      "typical": 410
    },
    "with_cells": 1,
    "dois": [
      "https://10.1021/acs.biomac.9b01266"
    ],
    "sample_comps": [
      "PEOXA [2.5 wt%] Alginate [5 wt%] Cellulose Nanofibrils [2 wt%]",
      "PEOXA [2.5 wt%]"
    ],
    "concs": [
      "2.5 wt%"
    ]
  },
  "PEG-NIPAAm-HPMACys": {
    "n": 2,
    "pressure_kpa": {
      "min": 340,
      "max": 340,
      "typical": 340
    },
    "temp_c": {
      "min": 25.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 5.0,
      "max": 5.0,
      "typical": 5.0
    },
    "needle_um": {
      "min": 250,
      "max": 250,
      "typical": 250
    },
    "with_cells": 0,
    "dois": [
      "https://10.1039/c5tb01645b"
    ],
    "sample_comps": [
      "PEG-NIPAAm-HPMACys [7.5 wt%] HA NHS [1.6 wt%]",
      "PEG-NIPAAm-HPMACys [7.5 wt%] PEG NHS [3.8 wt%]"
    ],
    "concs": [
      "7.5 wt%"
    ]
  },
  "Cellulose Nanofibers": {
    "n": 2,
    "pressure_kpa": {
      "min": 80.0,
      "max": 120.0,
      "typical": 120.0
    },
    "temp_c": {
      "min": 25.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 10.0,
      "max": 10.0,
      "typical": 10.0
    },
    "needle_um": {
      "min": 300,
      "max": 300,
      "typical": 300
    },
    "with_cells": 0,
    "dois": [
      "https://10.1088/2057-1976/ab8fc6"
    ],
    "sample_comps": [
      "Cellulose Nanofibers [5.34 wt%] Alginate [2.67 wt%]",
      "Cellulose Nanofibers [7.4 wt%] Alginate [0.74 wt%]"
    ],
    "concs": [
      "5.34 wt%",
      "7.4 wt%"
    ]
  },
  "Cellulose Nanocrystals": {
    "n": 2,
    "pressure_kpa": {
      "min": 80.0,
      "max": 140.0,
      "typical": 140.0
    },
    "temp_c": {
      "min": 25.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 10.0,
      "max": 10.0,
      "typical": 10.0
    },
    "needle_um": {
      "min": 300,
      "max": 300,
      "typical": 300
    },
    "with_cells": 0,
    "dois": [
      "https://10.1088/2057-1976/ab8fc6"
    ],
    "sample_comps": [
      "Cellulose Nanocrystals [16.67 wt%] Alginate [1.667 wt%]",
      "Cellulose Nanocrystals [10 wt%] Alginate [5 wt%]"
    ],
    "concs": [
      "16.67 wt%",
      "10 wt%"
    ]
  },
  "Graphene": {
    "n": 2,
    "pressure_kpa": {
      "min": 50,
      "max": 500,
      "typical": 500
    },
    "temp_c": {
      "min": 25.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 10.0,
      "max": 45.0,
      "typical": 45.0
    },
    "needle_um": {
      "min": 100,
      "max": 1000,
      "typical": 1000
    },
    "with_cells": 0,
    "dois": [
      "https://10.1021/acsnano.5b01179"
    ],
    "sample_comps": [
      "Graphene [75 wt%] PLG [25 wt%]"
    ],
    "concs": [
      "75 wt%"
    ]
  },
  "Xanthan Gum": {
    "n": 2,
    "pressure_kpa": {
      "min": 35.0,
      "max": 60.0,
      "typical": 60.0
    },
    "temp_c": {
      "min": 25.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 2.0,
      "max": 2.0,
      "typical": 2.0
    },
    "needle_um": {
      "min": 410,
      "max": 410,
      "typical": 410
    },
    "with_cells": 0,
    "dois": [
      "https://10.1088/1758-5090/abec2d"
    ],
    "sample_comps": [
      "Xanthan Gum [5 wt%]",
      "Xanthan Gum [8 wt%]"
    ],
    "concs": [
      "8 wt%",
      "5 wt%"
    ]
  },
  "Xanthan Gum Methacrylated": {
    "n": 2,
    "pressure_kpa": {
      "min": 70.0,
      "max": 100.0,
      "typical": 100.0
    },
    "temp_c": {
      "min": 25.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 2.0,
      "max": 2.0,
      "typical": 2.0
    },
    "needle_um": {
      "min": 410,
      "max": 410,
      "typical": 410
    },
    "with_cells": 2,
    "dois": [
      "https://10.1088/1758-5090/abec2d"
    ],
    "sample_comps": [
      "Xanthan Gum Methacrylated [5 wt%] Gelatin Methacrylated [5 wt%]",
      "Xanthan Gum Methacrylated [3 wt%] Gelatin Methacrylated [3 wt%]"
    ],
    "concs": [
      "3 wt%",
      "5 wt%"
    ]
  },
  "Lidocaine": {
    "n": 2,
    "pressure_kpa": {
      "min": 125.0,
      "max": 125.0,
      "typical": 125.0
    },
    "temp_c": {
      "min": 110.0,
      "max": 110.0,
      "typical": 110.0
    },
    "speed_mms": {
      "min": 1.0,
      "max": 1.0,
      "typical": 1.0
    },
    "needle_um": {
      "min": 610,
      "max": 610,
      "typical": 610
    },
    "with_cells": 0,
    "dois": [
      "https://10.1016/j.ijpharm.2021.120330"
    ],
    "sample_comps": [
      "Lidocaine [5 wt%] PCL [95 wt%]",
      "Lidocaine [30 wt%] PCL [70 wt%]"
    ],
    "concs": [
      "30 wt%",
      "5 wt%"
    ]
  },
  "Polyethylene oxide Terephthalate": {
    "n": 2,
    "pressure_kpa": {
      "min": 500,
      "max": 500,
      "typical": 500
    },
    "temp_c": {
      "min": 200.0,
      "max": 200.0,
      "typical": 200.0
    },
    "speed_mms": {
      "min": 0.93,
      "max": 3.27,
      "typical": 3.27
    },
    "needle_um": {
      "min": 200,
      "max": 250,
      "typical": 250
    },
    "with_cells": 0,
    "dois": [
      "https://10.1007/s10856-018-6071-3"
    ],
    "sample_comps": [
      "Polyethylene oxide Terephthalate [55 wt%] Poly(butylene terephthalate) [45 wt%]"
    ],
    "concs": [
      "55 wt%"
    ]
  },
  "Paracetamol": {
    "n": 2,
    "pressure_kpa": {
      "min": 180,
      "max": 180,
      "typical": 180
    },
    "temp_c": {
      "min": 23.0,
      "max": 25.0,
      "typical": 25.0
    },
    "speed_mms": {
      "min": 6.0,
      "max": 6.0,
      "typical": 6.0
    },
    "needle_um": {
      "min": 400,
      "max": 600,
      "typical": 600
    },
    "with_cells": 0,
    "dois": [
      "https://10.1208/s12249-018-1107-z",
      "https://10.1016/j.ijpharm.2018.01.024"
    ],
    "sample_comps": [
      "Paracetamol [48.48 wt%] Polyvinyl Pyrrolidone [6.82 wt%] Croscarmellose Sodium [5.3]",
      "Paracetamol [58.94 wt%] Polyvinyl Pyrrolidone [7.27 wt%] Starch [6.06 wt%] Croscarmellose Sodium [0.45 wt%]"
    ],
    "concs": [
      "58.94 wt%",
      "48.48 wt%"
    ]
  }
}

export const MATERIAL_META: Record<string, {
  fullName: string
  category: string
  crosslink: string
  tissueTargets: string[]
  printTemp: string
  biocompat: string
  notes: string
}> = {
  'Alginate': {
    fullName: 'Sodium Alginate',
    category: 'Natural Polysaccharide',
    crosslink: 'Ionic — CaCl₂ 50–200 mM',
    tissueTargets: ['cartilagem', 'osso', 'pele', 'vascular', 'neural'],
    printTemp: 'RT (23–25°C)',
    biocompat: 'ISO 10993 aprovado — amplamente usado clinicamente',
    notes: 'Gelificação rápida, boa extrusabilidade, baixa adesão celular natural — combinar com Gelatin ou RGD'
  },
  'PCL': {
    fullName: 'Polycaprolactone',
    category: 'Synthetic Thermoplastic',
    crosslink: 'Solidificação térmica (Tm 60°C, imprimir 80–100°C)',
    tissueTargets: ['osso', 'cartilagem', 'vascular', 'neural', 'tendão'],
    printTemp: 'Alta temperatura (75–100°C)',
    biocompat: 'FDA-aprovado, biodegradável em 2-4 anos',
    notes: 'Alta resistência mecânica, excelente para scaffolds rígidos — combinar com bioink mole para tecidos compostos'
  },
  'GelMA': {
    fullName: 'Gelatin Methacryloyl',
    category: 'Semi-synthetic Hydrogel',
    crosslink: 'Fotocrosslinking UV 365nm — I2959 0.3–0.5% ou LAP 0.25%',
    tissueTargets: ['cartilagem', 'córnea', 'pele', 'neural', 'vascular', 'cardíaco'],
    printTemp: 'RT–37°C (termorresponsivo)',
    biocompat: 'Excelente — derivado de colágeno, peptídeos RGD naturais',
    notes: 'Padrão ouro para bioinks com células — grau de substituição (DS) 40–90% afeta rigidez'
  },
  'Gelatin': {
    fullName: 'Gelatin (Type A/B)',
    category: 'Natural Protein',
    crosslink: 'Temperatura (gel <32°C) ou glutaraldeído (citotóxico) ou transglutaminase',
    tissueTargets: ['pele', 'cartilagem', 'osso', 'hepático'],
    printTemp: 'Frio (4–20°C) para gelificação; RM a 37°C',
    biocompat: 'Excelente — derivado de colágeno bovino/porcino',
    notes: 'Base de muitos bioinks complexos — frequentemente combinado com Fibrinogen ou GelMA'
  },
  'Hyaluronic Acid': {
    fullName: 'Hyaluronic Acid (HA)',
    category: 'Natural Polysaccharide',
    crosslink: 'Metacrilação (HA-MA) + UV, ou tiol-ene, ou BDDE',
    tissueTargets: ['cartilagem', 'córnea', 'pele', 'vocal cord', 'articular'],
    printTemp: 'RT–37°C',
    biocompat: 'Excelente — componente nativo de ECM articular e dérmica',
    notes: 'Biomimético para ECM articular — combinar com Gelatin para melhor printabilidade'
  },
  'Chitosan': {
    fullName: 'Chitosan',
    category: 'Natural Polysaccharide',
    crosslink: 'pH (NaOH) ou TPP 1–3% (crosslink iônico)',
    tissueTargets: ['osso', 'pele', 'corneal', 'hemostasia'],
    printTemp: 'RT–37°C',
    biocompat: 'Excelente — atividade antimicrobiana natural',
    notes: 'Solubilidade pH-dependente — dissolver em ácido acético 1% → imprimir → neutralizar'
  },
  'Fibrinogen': {
    fullName: 'Fibrinogen + Thrombin',
    category: 'Natural Protein (Fibrin)',
    crosslink: 'Trombina 1–5 U/mL — gelificação enzimática em 5–10 min a 37°C',
    tissueTargets: ['vascular', 'neural', 'pele', 'cardíaco', 'músculo'],
    printTemp: 'RT–37°C',
    biocompat: 'Excelente — componente nativo da coagulação',
    notes: 'Alta bioatividade — gelificação rápida após extrusão com trombina. Combinar com Gelatin para viscosidade'
  },
  'Collagen': {
    fullName: 'Collagen Type I',
    category: 'Natural Protein',
    crosslink: 'Temperatura (37°C) + pH 7.4',
    tissueTargets: ['pele', 'osso', 'corneal', 'tendão', 'ligamento'],
    printTemp: 'Frio (4°C) → gelifica a 37°C',
    biocompat: 'Excelente — mais abundante ECM proteína humana',
    notes: 'Baixa viscosidade em frio — adicionar Matrigel, NFC ou Methylcellulose para melhor printabilidade'
  },
  'PLGA': {
    fullName: 'Poly(lactic-co-glycolic acid)',
    category: 'Synthetic Biodegradable',
    crosslink: 'Solidificação térmica (Tg 45–55°C)',
    tissueTargets: ['osso', 'cartilagem', 'drug delivery', 'vascular'],
    printTemp: 'Alta temperatura (70–90°C)',
    biocompat: 'FDA-aprovado, biodegradável em semanas a meses (ratio LA:GA)',
    notes: 'Razão PLA:PGA controla taxa de degradação: 75:25 = ~3 meses, 50:50 = ~1 mês'
  },
  'dECM': {
    fullName: 'Decellularized Extracellular Matrix',
    category: 'Tissue-Derived',
    crosslink: 'Temperatura (gelificação) + UV (se metacrilado) ou riboflavina',
    tissueTargets: ['tecido-específico: coração, fígado, rim, cartilagem'],
    printTemp: '15–25°C (impressão), gelifica a 37°C',
    biocompat: 'Excelente — ECM nativo do tecido alvo',
    notes: 'Máxima biomimética — preservar proteínas-chave (colágeno, GAG, laminina) durante descelularização'
  },
  'Pluronic F127': {
    fullName: 'Pluronic F-127 (Poloxamer 407)',
    category: 'Synthetic Amphiphilic',
    crosslink: 'Termorresponsivo — gel >18°C, sol <10°C (reverso)',
    tissueTargets: ['canal de sacrifício', 'suporte temporário', 'drug delivery'],
    printTemp: 'Frio (4–15°C), solidifica à RT',
    biocompat: 'Biocompatível mas não biodegradável — usar como material de sacrifício',
    notes: 'Excelente para vascularização — imprimir canal, gelificar, remover por resfriamento (wash-out)'
  },
}

