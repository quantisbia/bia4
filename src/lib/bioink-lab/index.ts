/**
 * BIA v4 · R16 · Laboratório de Biotintas — barrel
 */
export * from "./types"
export { RECIPES, getRecipe, GOAL_LABELS, CELL_LABELS } from "./recipes"
export { evaluateWindow, evaluateRecipeWindow, wallShear_kPa, ZONE_LABELS } from "./window"
export type { WindowInput } from "./window"
export { recommend, scoreRecipe, pickAlternatives, nearestNozzle, DEFAULT_EQUIPMENT } from "./recommend"
export type { Decisions, Recommendation, Experience } from "./recommend"
export { planBench, componentAmount, parseMixRatio, estimateVolume_mL } from "./calculator"
export type { BenchInput } from "./calculator"
export { TROUBLES, relevantTroubles, findTrouble } from "./troubleshooting"
export { protocolMarkdown, toBioinkPatch, slicerHint, CELL_PIPELINE_ID } from "./protocol"
export type { ProtocolInput, BioinkPatchLike } from "./protocol"
