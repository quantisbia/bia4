/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R14.1 · UI Mode — "Modo Clínico" vs "Modo Pesquisador"
 *  ─────────────────────────────────────────────────────────────────────
 *  Médicos (ortopedistas, dermatologistas, dentistas) acham a plataforma
 *  "técnica demais". Termos como "Pipeline", "Toolpath", "G-code",
 *  "Printability Factor" assustam.
 *
 *  Pesquisadores (pós-grad, docentes) querem precisão técnica e NÃO
 *  querem termos "simplificados demais".
 *
 *  Solução: toggle global que troca os RÓTULOS da interface SEM mudar a
 *  lógica. Mesmo recurso, 2 nomes. Preferência salva em localStorage.
 *
 *  Esta lib é 100% client-safe (usada em componentes "use client").
 *
 *  Janaina Dernowsek / Quantis Biotechnology — Out/2026
 * ═══════════════════════════════════════════════════════════════════════
 */

export type UIMode = "clinical" | "researcher"

/* ═══════════════════════════════════════════════════════════════════════
 *  Dicionário bilíngue (clínico ↔ pesquisador)
 *  Mesma chave canônica → 2 rótulos.
 *  Importante: NUNCA mudar as chaves — são usadas como lookup em runtime.
 * ═══════════════════════════════════════════════════════════════════════ */

export interface TermPair {
  /** Rótulo técnico (modo pesquisador — fiel ao jargão científico) */
  researcher: string
  /** Rótulo acessível (modo clínico — compreensível por médico/dentista) */
  clinical: string
  /** Descrição curta opcional usada em tooltips */
  hint?: string
}

export const UI_TERMS: Record<string, TermPair> = {
  // ─── Navegação principal ──────────────────────────────────────────
  nav_pipeline: {
    researcher: "Pipeline",
    clinical: "Projeto de Tecido",
    hint: "Fluxo guiado em 12 etapas — do problema clínico ao protocolo validado",
  },
  nav_formulator: {
    researcher: "Formulador Pro",
    clinical: "Laboratório de Biotintas",
    hint: "Monte formulações de biotintas com até 8 componentes",
  },
  nav_bioprint: {
    researcher: "Bioimpressão",
    clinical: "Imprimir Tecido 3D",
    hint: "Fluxo completo: modelo → biotinta → impressão → controle",
  },
  nav_organoids: {
    researcher: "Organoid Builder",
    clinical: "Esferoides & Organoides",
    hint: "Desenhe modelos 3D in vitro de órgãos",
  },
  nav_protocols: {
    researcher: "Protocolos GLP/GMP",
    clinical: "Protocolos Clínicos",
    hint: "Procedimentos operacionais padrão (POPs) ABNT/ANVISA",
  },
  nav_knowledge: {
    researcher: "Motor de Conhecimento",
    clinical: "Biblioteca Científica",
    hint: "Artigos, patentes e metodologias curadas",
  },
  nav_notebook: {
    researcher: "Notebook",
    clinical: "Meu Caderno de Projetos",
    hint: "Caderno digital versionado",
  },
  nav_roadmap: {
    researcher: "Roteiro Profissional",
    clinical: "Guia Passo-a-Passo",
    hint: "Caminho sugerido pela equipe Quantis",
  },

  // ─── Etapas da bioimpressão ───────────────────────────────────────
  step_model: {
    researcher: "Fase 1 · Modelo de tecido",
    clinical: "Fase 1 · O que vou imprimir",
    hint: "Tecido-alvo, aplicação e tamanho — sem STL (a geometria vive na Fase 3)",
  },
  step_bioink: {
    researcher: "Biotinta / Bioink",
    clinical: "Material para Impressão",
    hint: "Formulação com biomateriais e células",
  },
  step_slice: {
    researcher: "Fase 3 · Fatiamento (STL → G-code)",
    clinical: "Fase 3 · Caminho da Impressão",
    hint: "Único lugar de modelos 3D: anatômico, primitiva, upload, desenho → G-code",
  },
  step_execute: {
    researcher: "Fase 4 · Bioimpressão (Host)",
    clinical: "Fase 4 · Imprimir Agora",
    hint: "Controle ao vivo da bioimpressora",
  },
  step_review: {
    researcher: "Fase 5 · Análise da bioimpressão",
    clinical: "Fase 5 · Como ficou?",
    hint: "Nota + relato → ajustes no próximo G-code",
  },
  step_post: {
    researcher: "Fase 6 · Maturação & caracterizações",
    clinical: "Fase 6 · Cuidados após a impressão",
    hint: "Crosslinking, cultivo, biorreator, caracterizações",
  },

  // ─── Termos técnicos recorrentes ─────────────────────────────────
  term_gcode: {
    researcher: "G-code",
    clinical: "Instruções da Impressora",
    hint: "Arquivo com os comandos para a bioimpressora executar",
  },
  term_printability: {
    researcher: "Printability Factor (Pf)",
    clinical: "Qualidade de Impressão",
    hint: "Score 0-1 de precisão geométrica (Ouyang 2016)",
  },
  term_viability: {
    researcher: "Viabilidade Celular",
    clinical: "Células Vivas no Tecido",
    hint: "% de células que sobrevivem após a impressão",
  },
  term_rheology: {
    researcher: "Reologia / Shear-thinning",
    clinical: "Fluidez da Biotinta",
    hint: "Como a biotinta flui quando pressionada",
  },
  term_crosslinking: {
    researcher: "Crosslinking (iônico/foto)",
    clinical: "Endurecimento Pós-Impressão",
    hint: "Processo que torna a biotinta estável",
  },
  term_scaffold: {
    researcher: "Scaffold / Matriz",
    clinical: "Suporte 3D do Tecido",
    hint: "Estrutura porosa onde as células crescem",
  },
  term_dECM: {
    researcher: "dECM (decelularizada)",
    clinical: "Matriz Natural (sem células)",
    hint: "Matriz extracelular extraída e descelularizada",
  },
  term_porosity: {
    researcher: "Porosidade / Pore size",
    clinical: "Tamanho dos Poros",
    hint: "Espaços no scaffold onde células e nutrientes passam",
  },

  // ─── Ações / botões ───────────────────────────────────────────────
  action_generate: {
    researcher: "Gerar / Compilar",
    clinical: "Criar",
    hint: "",
  },
  action_simulate: {
    researcher: "Simular Execução",
    clinical: "Testar Virtualmente",
    hint: "Preview sem gastar biotinta ou células",
  },
  action_export: {
    researcher: "Exportar Dossiê",
    clinical: "Baixar Relatório PDF",
    hint: "",
  },
  action_optimize: {
    researcher: "Otimizar Parâmetros",
    clinical: "Deixar a BIA Ajustar",
    hint: "",
  },
}

/* ═══════════════════════════════════════════════════════════════════════
 *  API pública
 * ═══════════════════════════════════════════════════════════════════════ */

/** Retorna o rótulo de um termo no modo dado. Cai pro researcher se chave inválida. */
export function t(key: string, mode: UIMode = "researcher"): string {
  const pair = UI_TERMS[key]
  if (!pair) {
    // Em dev, loga pra ajudar a pegar typo. Em prod, retorna a chave como fallback.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[UIMode] chave desconhecida: "${key}"`)
    }
    return key
  }
  return mode === "clinical" ? pair.clinical : pair.researcher
}

/** Chave de persistência no localStorage. */
export const UI_MODE_STORAGE_KEY = "bia:ui-mode"

/** Lê o modo atual do localStorage (ou "researcher" como fallback SSR-safe). */
export function readStoredMode(): UIMode {
  if (typeof window === "undefined") return "researcher"
  try {
    const stored = window.localStorage.getItem(UI_MODE_STORAGE_KEY)
    if (stored === "clinical" || stored === "researcher") return stored
  } catch {
    /* localStorage pode falhar em modo privado */
  }
  return "researcher"
}

/** Salva o modo escolhido pelo usuário. */
export function storeMode(mode: UIMode): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(UI_MODE_STORAGE_KEY, mode)
    // Dispara evento customizado para componentes reagirem sem precisar
    // de um contexto React global (mantém o blast radius pequeno)
    window.dispatchEvent(new CustomEvent("bia:ui-mode-change", { detail: { mode } }))
  } catch {
    /* idem */
  }
}
