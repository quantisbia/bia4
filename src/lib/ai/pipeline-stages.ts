/**
 * BIA — As 12 etapas do pipeline de design de tecidos.
 * Arquivo sem dependências: pode ser importado por telas (client) sem levar o SDK de IA junto.
 */

export const PIPELINE_STAGES = [
  { num: 1, name: "Definição do Tecido Alvo", key: "tissue_definition" },
  { num: 2, name: "Estratégia de Scaffolding", key: "scaffolding_strategy" },
  { num: 3, name: "Seleção de Biomateriais", key: "biomaterial_selection" },
  { num: 4, name: "Incorporação Celular", key: "cell_incorporation" },
  { num: 5, name: "Fatores de Crescimento", key: "growth_factors" },
  { num: 6, name: "Bioimpressão/Fabricação", key: "bioprinting" },
  { num: 7, name: "Cultura em Biorreator", key: "bioreactor_culture" },
  { num: 8, name: "Caracterização Mecânica", key: "mechanical_characterization" },
  { num: 9, name: "Análise Bioquímica", key: "biochemical_analysis" },
  { num: 10, name: "Testes de Viabilidade", key: "viability_testing" },
  { num: 11, name: "Validação Funcional", key: "functional_validation" },
  { num: 12, name: "Translação Clínica", key: "clinical_translation" },
] as const
