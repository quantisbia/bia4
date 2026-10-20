/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R14.3 · BIA Studio — Geração de scaffolds TPMS por voz/texto
 *  ─────────────────────────────────────────────────────────────────────
 *  Página principal do novo módulo BIA Studio. Permite ao usuário:
 *    🎤 Botão de voz (Web Speech API nativa pt-BR, zero deps)
 *    📝 Prompt textual com templates clínicos
 *    👁️ Preview 3D interativo (Three.js via CDN)
 *    💾 Download direto do STL binário
 *    🔁 Edição fine-grained de porosidade/células via sliders
 *
 *  Server component que renderiza o shell + boot do client component.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — Out/2026
 * ═══════════════════════════════════════════════════════════════════════
 */
import { auth } from "@/lib/auth/config"
import { redirect } from "next/navigation"
import { StudioClient } from "./StudioClient"

export const dynamic = "force-dynamic"

export default async function StudioPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/dashboard/studio")

  return <StudioClient userName={session.user.name?.split(" ")[0] ?? "Pesquisador"} />
}
