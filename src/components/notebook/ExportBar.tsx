"use client"

/**
 * BIA · ExportBar universal — R12.67
 *
 * Barra padrão de 7 ações que aparece em TODAS as ferramentas da BIA
 * (Pipeline, Formulator Pro, Bioink, Chat IA, Próximos Passos,
 *  Notebook, e futuramente Academy).
 *
 * Ordem oficial dos botões (aprovada pela Janaina):
 *   1. 💾 Salvar no Notebook
 *   2. ✏️ Editar
 *   3. 🆕 Gerar nova versão
 *   4. 📄 Exportar PDF
 *   5. 📝 Exportar DOCX
 *   6. 🖼️ Adicionar imagem
 *   7. 🕐 Consultar histórico
 *
 * Contrato:
 *   - A ferramenta produz um ExportableContent (`buildContent()`)
 *   - Se `existing` estiver preenchido, a barra mostra "Editar" +
 *     "Nova versão" + "Adicionar imagem" + "Histórico".
 *   - Se não, mostra apenas "Salvar", "PDF", "DOCX" (não dá para
 *     versionar/adicionar imagem antes de existir a entrada).
 *
 * Contrato de eventos:
 *   - onSaved(result)     — após criar/atualizar com sucesso
 *   - Todas as ações usam APIs REST do R12.66 (/api/notebook, /versions, /images)
 */

import { useState, useCallback, useEffect } from "react"
import {
  Save,
  Pencil,
  GitBranch,
  FileDown,
  FileText,
  ImagePlus,
  History,
  X,
  Loader2,
  Check,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { useToast } from "@/components/ui/Toast"
import { exportPdf } from "@/lib/export/pdf-exporter"
import { exportDocx } from "@/lib/export/docx-exporter"
import type { ExportableContent, SaveResult } from "@/lib/export/types"

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

export interface ExportBarProps {
  /**
   * Função que sabe montar o conteúdo exportável no momento em que
   * o usuário clica em qualquer botão. É uma função (não um objeto)
   * porque o conteúdo pode mudar enquanto o usuário edita — sempre
   * capturamos o estado atualizado.
   */
  buildContent: () => ExportableContent

  /** Chamado após salvar/atualizar com sucesso (para o pai atualizar existing.id/currentVersion). */
  onSaved?: (result: SaveResult) => void

  /** Ocultar botões específicos (ex: em ferramentas read-only). */
  hide?: Array<
    | "save"
    | "edit"
    | "newVersion"
    | "pdf"
    | "docx"
    | "addImage"
    | "history"
  >

  /** Tamanho dos botões — padrão "md". */
  size?: "sm" | "md"

  /** Classe extra no container. */
  className?: string

  /**
   * Se o botão "Salvar" deve abrir modal de metadados antes
   * (default: true). Passar false = salva direto com o título
   * do content.
   */
  askMetadataOnSave?: boolean
}

// ═══════════════════════════════════════════════════════════════
// ExportBar
// ═══════════════════════════════════════════════════════════════

export function ExportBar({
  buildContent,
  onSaved,
  hide = [],
  size = "md",
  className,
  askMetadataOnSave = true,
}: ExportBarProps) {
  const toast = useToast()
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)

  const isHidden = (k: NonNullable<ExportBarProps["hide"]>[number]) =>
    hide.includes(k)

  // ─── Ações ────────────────────────────────────────────────────

  const doExportPdf = useCallback(async () => {
    setBusyKey("pdf")
    try {
      const content = buildContent()
      exportPdf(content)
      toast.success("PDF exportado", `${content.title}.pdf`)
    } catch (e) {
      console.error(e)
      toast.error("Falha ao exportar PDF", (e as Error).message)
    } finally {
      setBusyKey(null)
    }
  }, [buildContent, toast])

  const doExportDocx = useCallback(async () => {
    setBusyKey("docx")
    try {
      const content = buildContent()
      await exportDocx(content)
      toast.success("DOCX exportado", `${content.title}.docx`)
    } catch (e) {
      console.error(e)
      toast.error("Falha ao exportar DOCX", (e as Error).message)
    } finally {
      setBusyKey(null)
    }
  }, [buildContent, toast])

  const doSaveDirect = useCallback(async () => {
    setBusyKey("save")
    try {
      const content = buildContent()
      const res = await createOrPatchEntry(content)
      toast.success(
        content.existing ? `Versão v${res.versionNumber} criada` : "Salvo no Notebook",
        content.title,
      )
      onSaved?.(res)
    } catch (e) {
      console.error(e)
      toast.error("Falha ao salvar", (e as Error).message)
    } finally {
      setBusyKey(null)
    }
  }, [buildContent, onSaved, toast])

  // ─── Renderização ─────────────────────────────────────────────

  const content = safeBuild(buildContent)
  const hasExisting = !!content?.existing?.entryId

  return (
    <>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-xl bg-white/5 border border-white/10 p-2",
          className,
        )}
        role="toolbar"
        aria-label="Ações de exportação e salvamento"
        data-export-bar
      >
        {!isHidden("save") && !hasExisting && (
          <ActionButton
            label="Salvar no Notebook"
            icon={<Save className="w-4 h-4" />}
            variant="primary"
            busy={busyKey === "save"}
            onClick={() => (askMetadataOnSave ? setSaveDialogOpen(true) : doSaveDirect())}
            size={size}
            testId="export-bar-save"
          />
        )}
        {!isHidden("edit") && hasExisting && (
          <ActionButton
            label="Editar"
            icon={<Pencil className="w-4 h-4" />}
            variant="secondary"
            onClick={() => setEditDialogOpen(true)}
            size={size}
            testId="export-bar-edit"
          />
        )}
        {!isHidden("newVersion") && hasExisting && (
          <ActionButton
            label="Gerar nova versão"
            icon={<GitBranch className="w-4 h-4" />}
            variant="primary"
            busy={busyKey === "save"}
            onClick={doSaveDirect}
            size={size}
            testId="export-bar-new-version"
          />
        )}
        {!isHidden("pdf") && (
          <ActionButton
            label="Exportar PDF"
            icon={<FileDown className="w-4 h-4" />}
            variant="ghost"
            busy={busyKey === "pdf"}
            onClick={doExportPdf}
            size={size}
            testId="export-bar-pdf"
          />
        )}
        {!isHidden("docx") && (
          <ActionButton
            label="Exportar DOCX"
            icon={<FileText className="w-4 h-4" />}
            variant="ghost"
            busy={busyKey === "docx"}
            onClick={doExportDocx}
            size={size}
            testId="export-bar-docx"
          />
        )}
        {!isHidden("addImage") && hasExisting && (
          <ActionButton
            label="Adicionar imagem"
            icon={<ImagePlus className="w-4 h-4" />}
            variant="ghost"
            onClick={() => setImageDialogOpen(true)}
            size={size}
            testId="export-bar-add-image"
          />
        )}
        {!isHidden("history") && hasExisting && (
          <ActionButton
            label="Consultar histórico"
            icon={<History className="w-4 h-4" />}
            variant="ghost"
            onClick={() => setHistoryDialogOpen(true)}
            size={size}
            testId="export-bar-history"
          />
        )}
      </div>

      {saveDialogOpen && (
        <SaveDialog
          initialContent={content}
          onCancel={() => setSaveDialogOpen(false)}
          onDone={(res) => {
            setSaveDialogOpen(false)
            toast.success("Salvo no Notebook", `v${res.versionNumber}`)
            onSaved?.(res)
          }}
        />
      )}

      {editDialogOpen && content?.existing && (
        <EditDialog
          content={content}
          onCancel={() => setEditDialogOpen(false)}
          onDone={(res) => {
            setEditDialogOpen(false)
            toast.success(
              res.versionNumber > (content.existing?.currentVersion ?? 0)
                ? `Nova versão v${res.versionNumber} criada`
                : `Versão atualizada`,
              content.title,
            )
            onSaved?.(res)
          }}
        />
      )}

      {imageDialogOpen && content?.existing && (
        <AddImageDialog
          entryId={content.existing.entryId}
          currentVersion={content.existing.currentVersion}
          onClose={() => setImageDialogOpen(false)}
        />
      )}

      {historyDialogOpen && content?.existing && (
        <HistoryDialog
          entryId={content.existing.entryId}
          currentVersion={content.existing.currentVersion}
          onClose={() => setHistoryDialogOpen(false)}
          onRestore={(newVersionNumber) => {
            setHistoryDialogOpen(false)
            toast.success(
              `Versão restaurada como v${newVersionNumber}`,
              "Histórico preservado — versões antigas continuam disponíveis.",
            )
            onSaved?.({
              entryId: content.existing!.entryId,
              versionNumber: newVersionNumber,
              isNew: false,
            })
          }}
        />
      )}
    </>
  )
}

function safeBuild(fn: () => ExportableContent): ExportableContent | null {
  try {
    return fn()
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════════════
// ActionButton
// ═══════════════════════════════════════════════════════════════

function ActionButton({
  label,
  icon,
  variant,
  onClick,
  busy,
  size,
  testId,
}: {
  label: string
  icon: React.ReactNode
  variant: "primary" | "secondary" | "ghost"
  onClick: () => void
  busy?: boolean
  size?: "sm" | "md"
  testId?: string
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
  const sizeCls = size === "sm" ? "text-xs px-2.5 py-1.5" : "text-sm px-3 py-2"
  const variantCls =
    variant === "primary"
      ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-md"
      : variant === "secondary"
        ? "bg-white/10 hover:bg-white/15 text-white border border-white/10"
        : "text-gray-300 hover:text-white hover:bg-white/10 border border-transparent"
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(base, sizeCls, variantCls)}
      data-testid={testId}
      title={label}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      <span>{label}</span>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════
// SaveDialog — pergunta título / projeto / descrição / tags
// ═══════════════════════════════════════════════════════════════

function SaveDialog({
  initialContent,
  onCancel,
  onDone,
}: {
  initialContent: ExportableContent | null
  onCancel: () => void
  onDone: (res: SaveResult) => void
}) {
  const [title, setTitle] = useState(initialContent?.title ?? "")
  const [description, setDescription] = useState(initialContent?.subtitle ?? "")
  const [tags, setTags] = useState((initialContent?.tags ?? []).join(", "))
  const [projectId, setProjectId] = useState(initialContent?.projectId ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!initialContent) return
    if (title.trim().length < 2) {
      setError("Título precisa de pelo menos 2 caracteres")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const patched: ExportableContent = {
        ...initialContent,
        title: title.trim(),
        subtitle: description.trim() || undefined,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        projectId: projectId.trim() || null,
      }
      const res = await createOrPatchEntry(patched)
      onDone(res)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <ModalShell title="Salvar no Notebook" onClose={onCancel}>
      <div className="space-y-3">
        <Field label="Título">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Formulação GelMA 10% para cartilagem"
            className={inputCls}
            data-testid="save-dialog-title"
          />
        </Field>
        <Field label="Descrição (opcional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Contexto rápido — 1 ou 2 linhas"
            className={inputCls}
            data-testid="save-dialog-description"
          />
        </Field>
        <Field label="Tags (separadas por vírgula)">
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="gelma, cartilagem, hidrogel"
            className={inputCls}
            data-testid="save-dialog-tags"
          />
        </Field>
        <Field label="ID do projeto (opcional)">
          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="Cole o ID do Project (deixe vazio para nenhum)"
            className={inputCls}
            data-testid="save-dialog-projectid"
          />
        </Field>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-sm text-red-300">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <ModalFooter>
        <button onClick={onCancel} className={btnGhost} disabled={busy}>
          Cancelar
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className={btnPrimary}
          data-testid="save-dialog-confirm"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar no Notebook
        </button>
      </ModalFooter>
    </ModalShell>
  )
}

// ═══════════════════════════════════════════════════════════════
// EditDialog — pergunta "atualizar versão atual" vs "criar nova"
// ═══════════════════════════════════════════════════════════════

function EditDialog({
  content,
  onCancel,
  onDone,
}: {
  content: ExportableContent
  onCancel: () => void
  onDone: (res: SaveResult) => void
}) {
  // R12.66 · padrão da Janaina = criar nova versão. "Atualizar em place" é EXCEÇÃO.
  const [mode, setMode] = useState<"newVersion" | "inPlace">("newVersion")
  const [changeSummary, setChangeSummary] = useState(
    content.autoChangeSummary ?? "",
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await createOrPatchEntry(
        { ...content, autoChangeSummary: changeSummary.trim() || undefined },
        { forceInPlace: mode === "inPlace" },
      )
      onDone(res)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <ModalShell title="Editar entrada" onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-sm text-gray-300">
          Como você quer aplicar as alterações em <strong className="text-white">{content.title}</strong>?
        </p>

        <div className="space-y-2">
          <RadioCard
            selected={mode === "newVersion"}
            onSelect={() => setMode("newVersion")}
            label="Criar nova versão (recomendado)"
            description={`v${(content.existing?.currentVersion ?? 1) + 1} · preserva a versão atual no histórico`}
            testId="edit-dialog-new-version"
          />
          <RadioCard
            selected={mode === "inPlace"}
            onSelect={() => setMode("inPlace")}
            label="Atualizar a versão atual"
            description={`Sobrescreve v${content.existing?.currentVersion ?? 1} · use para corrigir erros de digitação`}
            warning
            testId="edit-dialog-in-place"
          />
        </div>

        {mode === "newVersion" && (
          <Field label="Descrição resumida da alteração (opcional)">
            <input
              type="text"
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              placeholder="Ex: Ajuste na concentração de LAP para 0.3%"
              className={inputCls}
              data-testid="edit-dialog-change-summary"
            />
          </Field>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-sm text-red-300">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <ModalFooter>
        <button onClick={onCancel} className={btnGhost} disabled={busy}>
          Cancelar
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className={btnPrimary}
          data-testid="edit-dialog-confirm"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : mode === "newVersion" ? (
            <GitBranch className="w-4 h-4" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {mode === "newVersion" ? "Criar nova versão" : "Atualizar versão atual"}
        </button>
      </ModalFooter>
    </ModalShell>
  )
}

// ═══════════════════════════════════════════════════════════════
// AddImageDialog — usa API /api/notebook/[id]/images
// ═══════════════════════════════════════════════════════════════

function AddImageDialog({
  entryId,
  currentVersion,
  onClose,
}: {
  entryId: string
  currentVersion: number
  onClose: () => void
}) {
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [caption, setCaption] = useState("")
  const [experimentId, setExperimentId] = useState("")
  const [sampleNumber, setSampleNumber] = useState("")
  const [tagsInput, setTagsInput] = useState("")
  const [observations, setObservations] = useState("")
  const [associateToVersion, setAssociateToVersion] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onPick = (f: File | null) => {
    setFile(f)
    setError(null)
    if (!f) {
      setPreview(null)
      return
    }
    if (!f.type.startsWith("image/")) {
      setError("Arquivo precisa ser uma imagem")
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Imagem excede 5 MB")
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPreview(String(reader.result))
    reader.readAsDataURL(f)
  }

  const submit = async () => {
    if (!preview) {
      setError("Selecione uma imagem primeiro")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/notebook/${entryId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataBase64: preview, // dataURL completa
          title: title.trim() || null,
          caption: caption.trim() || null,
          experimentId: experimentId.trim() || null,
          sampleNumber: sampleNumber.trim() || null,
          tags: tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          observations: observations.trim() || null,
          versionNumber: associateToVersion ? currentVersion : null,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? `Falha (${res.status})`)
      }
      toast.success("Imagem adicionada", title || file?.name || "sem título")
      onClose()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <ModalShell title="Adicionar imagem" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Arquivo (PNG · JPG · WEBP · até 5 MB)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
            className={cn(
              inputCls,
              "file:mr-3 file:rounded-md file:border-0 file:bg-violet-600 file:text-white file:px-3 file:py-1 cursor-pointer",
            )}
            data-testid="image-dialog-file"
          />
        </div>

        {preview && (
          <div className="rounded-lg overflow-hidden border border-white/10 bg-black/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Prévia"
              className="w-full max-h-56 object-contain"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Título">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              placeholder="Micrografia do scaffold"
              data-testid="image-dialog-title"
            />
          </Field>
          <Field label="Legenda">
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className={inputCls}
              placeholder="Aumento 40x · D7"
            />
          </Field>
          <Field label="ID do experimento">
            <input
              value={experimentId}
              onChange={(e) => setExperimentId(e.target.value)}
              className={inputCls}
              placeholder="EXP-2026-047"
            />
          </Field>
          <Field label="Nº da amostra">
            <input
              value={sampleNumber}
              onChange={(e) => setSampleNumber(e.target.value)}
              className={inputCls}
              placeholder="03"
            />
          </Field>
        </div>

        <Field label="Tags (separadas por vírgula)">
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className={inputCls}
            placeholder="microscopia, HE, dia7"
          />
        </Field>
        <Field label="Observações">
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={2}
            className={inputCls}
            placeholder="Colônia de células aderidas na superfície porosa..."
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={associateToVersion}
            onChange={(e) => setAssociateToVersion(e.target.checked)}
            className="accent-violet-600"
          />
          <span>
            Associar à versão atual (v{currentVersion})
          </span>
        </label>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-sm text-red-300">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <ModalFooter>
        <button onClick={onClose} className={btnGhost} disabled={busy}>
          Cancelar
        </button>
        <button
          onClick={submit}
          disabled={busy || !preview}
          className={btnPrimary}
          data-testid="image-dialog-confirm"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          Adicionar
        </button>
      </ModalFooter>
    </ModalShell>
  )
}

// ═══════════════════════════════════════════════════════════════
// HistoryDialog — lista versões, permite abrir/restaurar
// ═══════════════════════════════════════════════════════════════

interface VersionItem {
  id: string
  versionNumber: number
  changeSummary: string | null
  createdAt: string
  user: { id: string; name: string | null; email: string | null } | null
}

function HistoryDialog({
  entryId,
  currentVersion,
  onClose,
  onRestore,
}: {
  entryId: string
  currentVersion: number
  onClose: () => void
  onRestore: (newVersionNumber: number) => void
}) {
  const [loading, setLoading] = useState(true)
  const [versions, setVersions] = useState<VersionItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [restoreBusy, setRestoreBusy] = useState<number | null>(null)

  // Carrega ao abrir — useEffect, não useState (anti-pattern corrigido)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/notebook/${entryId}/versions`)
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j?.error ?? `Falha ao carregar histórico (${res.status})`)
        }
        const data = await res.json()
        if (!cancelled) setVersions(data.versions ?? [])
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [entryId])

  const doRestore = async (versionNumber: number) => {
    if (
      !window.confirm(
        `Restaurar a versão v${versionNumber}? Isso NÃO apaga o histórico — uma nova versão v${currentVersion + 1} será criada com o conteúdo dessa versão antiga.`,
      )
    ) {
      return
    }
    setRestoreBusy(versionNumber)
    setError(null)
    try {
      const res = await fetch(
        `/api/notebook/${entryId}/versions/restore`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetVersion: versionNumber }),
        },
      )
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? `Falha ao restaurar (${res.status})`)
      }
      const data = await res.json()
      onRestore(data.newVersionNumber ?? currentVersion + 1)
    } catch (e) {
      setError((e as Error).message)
      setRestoreBusy(null)
    }
  }

  return (
    <ModalShell title="Histórico de versões" onClose={onClose} wide>
      <div className="space-y-2">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando histórico…
          </div>
        )}
        {!loading && versions.length === 0 && !error && (
          <p className="text-sm text-gray-400 py-4">Nenhuma versão encontrada.</p>
        )}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-sm text-red-300">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {versions.map((v) => (
          <div
            key={v.id}
            className={cn(
              "flex items-start justify-between gap-3 rounded-lg border p-3",
              v.versionNumber === currentVersion
                ? "border-violet-500/40 bg-violet-500/5"
                : "border-white/10 bg-white/5",
            )}
            data-testid={`history-version-${v.versionNumber}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
                    v.versionNumber === currentVersion
                      ? "bg-violet-600 text-white"
                      : "bg-white/10 text-gray-200",
                  )}
                >
                  v{v.versionNumber}
                </span>
                {v.versionNumber === currentVersion && (
                  <span className="text-xs text-violet-300">atual</span>
                )}
                <span className="text-xs text-gray-500">
                  {new Intl.DateTimeFormat("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(v.createdAt))}
                </span>
                {v.user?.name && (
                  <span className="text-xs text-gray-500">
                    · {v.user.name}
                  </span>
                )}
              </div>
              {v.changeSummary && (
                <p className="text-sm text-gray-300 mt-1">{v.changeSummary}</p>
              )}
            </div>
            {v.versionNumber !== currentVersion && (
              <button
                onClick={() => doRestore(v.versionNumber)}
                disabled={restoreBusy !== null}
                className={cn(btnGhost, "text-xs")}
                data-testid={`history-restore-${v.versionNumber}`}
              >
                {restoreBusy === v.versionNumber ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <GitBranch className="w-3 h-3" />
                )}
                Restaurar
              </button>
            )}
          </div>
        ))}
      </div>

      <ModalFooter>
        <button onClick={onClose} className={btnGhost}>
          Fechar
        </button>
      </ModalFooter>
    </ModalShell>
  )
}

// ═══════════════════════════════════════════════════════════════
// Componentes visuais compartilhados
// ═══════════════════════════════════════════════════════════════

function ModalShell({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          "w-full rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 shadow-2xl",
          wide ? "max-w-2xl" : "max-w-md",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-white"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/10 mt-2">
      {children}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}

function RadioCard({
  selected,
  onSelect,
  label,
  description,
  warning,
  testId,
}: {
  selected: boolean
  onSelect: () => void
  label: string
  description: string
  warning?: boolean
  testId?: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={testId}
      className={cn(
        "w-full text-left rounded-lg border p-3 transition-all",
        selected
          ? warning
            ? "border-amber-500/40 bg-amber-500/5"
            : "border-violet-500/40 bg-violet-500/5"
          : "border-white/10 bg-white/5 hover:bg-white/10",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center",
            selected
              ? warning
                ? "border-amber-400"
                : "border-violet-400"
              : "border-white/30",
          )}
        >
          {selected && (
            <span
              className={cn(
                "block w-2 h-2 rounded-full",
                warning ? "bg-amber-400" : "bg-violet-400",
              )}
            />
          )}
        </span>
        <span className="text-sm font-medium text-white">{label}</span>
      </div>
      <p className="text-xs text-gray-400 mt-1 ml-6">{description}</p>
    </button>
  )
}

const inputCls =
  "w-full rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40"

const btnPrimary =
  "inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-medium px-4 py-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"

const btnGhost =
  "inline-flex items-center gap-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 text-sm font-medium px-3 py-2 disabled:opacity-50"

// ═══════════════════════════════════════════════════════════════
// API helpers (frontend-side) — falam com R12.66
// ═══════════════════════════════════════════════════════════════

/**
 * Converte ExportableContent para "content" (string markdown-ish)
 * que o schema NotebookEntry.content espera. Preserva estrutura
 * mínima para reidratar depois.
 */
function contentToNotebookText(content: ExportableContent): string {
  const lines: string[] = []
  for (const b of content.blocks) {
    switch (b.type) {
      case "heading":
        lines.push(`${"#".repeat(b.level)} ${b.text}`)
        break
      case "paragraph":
        lines.push(b.text)
        break
      case "list":
        b.items.forEach((it, i) =>
          lines.push(b.style === "numbered" ? `${i + 1}. ${it}` : `- ${it}`),
        )
        break
      case "keyvalue":
        if (b.title) lines.push(`**${b.title}**`)
        for (const p of b.pairs) lines.push(`- **${p.key}:** ${p.value}`)
        break
      case "table":
        if (b.title) lines.push(`**${b.title}**`)
        lines.push(`| ${b.headers.join(" | ")} |`)
        lines.push(`| ${b.headers.map(() => "---").join(" | ")} |`)
        for (const r of b.rows) lines.push(`| ${r.join(" | ")} |`)
        break
      case "code":
        lines.push("```" + (b.language ?? ""))
        lines.push(b.content)
        lines.push("```")
        break
      case "callout":
        lines.push(`> ${b.title ? `**${b.title}** — ` : ""}${b.text}`)
        break
      case "divider":
        lines.push("---")
        break
      case "image":
        lines.push(`![${b.caption ?? ""}](${b.src})`)
        break
    }
    lines.push("")
  }
  return lines.join("\n").trim() || content.title
}

/**
 * Cria ou atualiza a entrada no Notebook.
 * - Se `content.existing` estiver preenchido → PATCH (nova versão por padrão, in-place se forceInPlace).
 * - Se não → POST (cria + V1 automática).
 */
async function createOrPatchEntry(
  content: ExportableContent,
  opts: { forceInPlace?: boolean } = {},
): Promise<SaveResult> {
  const contentText = contentToNotebookText(content)

  // Metadata que preserva o objeto ExportableContent para reidratar depois
  const metadata: Record<string, unknown> = {
    ...(content.metadata ?? {}),
    __exportableBlocks: content.blocks,
    __source: content.source ?? null,
    __exportedAt: new Date().toISOString(),
  }

  if (!content.existing) {
    // POST — cria + V1
    const res = await fetch("/api/notebook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: content.title,
        content: contentText,
        entryType: content.entryType ?? "NOTE",
        category: content.category ?? undefined,
        tags: content.tags ?? [],
        sourceType: content.source ?? undefined,
        metadata,
        projectId: content.projectId ?? undefined,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j?.error ?? `Falha ao salvar (${res.status})`)
    }
    const data = await res.json()
    return {
      entryId: data.id,
      versionNumber: data.versionNumber ?? 1,
      isNew: true,
    }
  }

  // PATCH — nova versão (padrão) ou in-place
  const qs = opts.forceInPlace ? "?updateInPlace=true" : ""
  const res = await fetch(
    `/api/notebook${qs ? qs + "&" : "?"}id=${encodeURIComponent(content.existing.entryId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: content.title,
        content: contentText,
        tags: content.tags,
        category: content.category ?? undefined,
        entryType: content.entryType,
        metadata,
        projectId: content.projectId,
        changeSummary: content.autoChangeSummary ?? null,
      }),
    },
  )
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j?.error ?? `Falha ao atualizar (${res.status})`)
  }
  const data = await res.json()
  return {
    entryId: data.id ?? content.existing.entryId,
    versionNumber:
      data.newVersionNumber ?? data.currentVersion ?? content.existing.currentVersion,
    isNew: false,
  }
}
