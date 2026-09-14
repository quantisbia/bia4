"use client"

/**
 * BIA · Notebook · ProjectSidebar — R12.69
 *
 * Nível 1 da UI hierárquica do Notebook.
 * Lista projetos científicos (Project model do R12.66) do usuário,
 * ordenados por atividade recente (updatedAt DESC).
 *
 * Slots virtuais:
 *  - "all"  → mostra TODAS as entradas do usuário (não filtra por project)
 *  - "none" → mostra só entradas SEM projeto (soltas)
 *
 * Ações:
 *  - Selecionar um projeto (dispara callback onSelect)
 *  - Criar novo projeto (POST /api/projects) — modal inline
 *  - Renomear / arquivar (PATCH /api/projects?id=…) — futuro (R12.70+)
 */

import { useEffect, useState, useCallback } from "react"
import {
  FolderOpen, Folder, Plus, Loader2, X,
  AlertTriangle, FolderTree,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

export interface ProjectItem {
  id: string
  name: string
  description: string | null
  researchArea: string | null
  color: string | null
  isArchived: boolean
  entryCount: number
  updatedAt: string
}

// Slots virtuais (não são projetos reais)
export type ProjectSelection =
  | { kind: "all" }
  | { kind: "none" }
  | { kind: "project"; id: string; name: string }

export interface ProjectSidebarProps {
  selected: ProjectSelection
  onSelect: (sel: ProjectSelection) => void
  /** Recarrega quando este ID mudar (ex: após criar entrada, para atualizar contador) */
  reloadKey?: string | number
  /** Classe extra no container. */
  className?: string
}

export function ProjectSidebar({
  selected,
  onSelect,
  reloadKey,
  className,
}: ProjectSidebarProps) {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/projects")
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? `Falha (${res.status})`)
      }
      const data = await res.json()
      setProjects(data.projects ?? [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, reloadKey])

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-white/[0.02] border-r border-white/5",
        className,
      )}
      data-testid="project-sidebar"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-violet-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wide">Projetos</h3>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          title="Novo projeto"
          data-testid="project-sidebar-new"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto py-1">
        {/* Slots virtuais no topo */}
        <SidebarButton
          selected={selected.kind === "all"}
          onClick={() => onSelect({ kind: "all" })}
          icon={<Folder className="w-4 h-4" />}
          label="Todas as entradas"
          count={null}
          testId="project-sidebar-all"
        />
        <SidebarButton
          selected={selected.kind === "none"}
          onClick={() => onSelect({ kind: "none" })}
          icon={<Folder className="w-4 h-4 opacity-60" />}
          label="Sem projeto"
          count={null}
          testId="project-sidebar-none"
        />

        <div className="my-2 mx-3 border-t border-white/5" />

        {loading && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Carregando…
          </div>
        )}

        {error && (
          <div className="mx-3 my-2 rounded-md bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-300 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <p className="px-3 py-2 text-[11px] text-gray-500">
            Nenhum projeto ainda. Crie um para agrupar suas entradas.
          </p>
        )}

        {projects.map((p) => {
          const isSel = selected.kind === "project" && selected.id === p.id
          return (
            <SidebarButton
              key={p.id}
              selected={isSel}
              onClick={() =>
                onSelect({ kind: "project", id: p.id, name: p.name })
              }
              icon={
                p.color ? (
                  <span
                    className="w-3 h-3 rounded-sm border border-white/20"
                    style={{ backgroundColor: p.color }}
                    aria-hidden
                  />
                ) : (
                  <FolderOpen className="w-4 h-4" />
                )
              }
              label={p.name}
              subtitle={p.researchArea ?? undefined}
              count={p.entryCount}
              archived={p.isArchived}
              testId={`project-sidebar-item-${p.id}`}
            />
          )
        })}
      </div>

      {showCreate && (
        <CreateProjectDialog
          onClose={() => setShowCreate(false)}
          onCreated={(project) => {
            setShowCreate(false)
            setProjects((prev) => [
              {
                id: project.id,
                name: project.name,
                description: project.description ?? null,
                researchArea: project.researchArea ?? null,
                color: project.color ?? null,
                isArchived: false,
                entryCount: 0,
                updatedAt: new Date().toISOString(),
              },
              ...prev,
            ])
            onSelect({ kind: "project", id: project.id, name: project.name })
          }}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SidebarButton
// ═══════════════════════════════════════════════════════════════

function SidebarButton({
  selected,
  onClick,
  icon,
  label,
  subtitle,
  count,
  archived,
  testId,
}: {
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  subtitle?: string
  count: number | null
  archived?: boolean
  testId?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors group",
        selected
          ? "bg-violet-500/15 border-l-2 border-violet-500"
          : "border-l-2 border-transparent hover:bg-white/5",
        archived && "opacity-50",
      )}
    >
      <span className={cn("flex-shrink-0", selected ? "text-violet-300" : "text-gray-400")}>
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span
          className={cn(
            "block text-xs font-medium truncate",
            selected ? "text-white" : "text-gray-200",
          )}
        >
          {label}
          {archived && <span className="ml-1 text-[10px] text-gray-500">(arquivado)</span>}
        </span>
        {subtitle && (
          <span className="block text-[10px] text-gray-500 truncate">{subtitle}</span>
        )}
      </span>
      {count !== null && (
        <span
          className={cn(
            "flex-shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded",
            selected ? "bg-violet-500/30 text-violet-100" : "bg-white/5 text-gray-500",
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════
// CreateProjectDialog
// ═══════════════════════════════════════════════════════════════

function CreateProjectDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (p: {
    id: string
    name: string
    description?: string | null
    researchArea?: string | null
    color?: string | null
  }) => void
}) {
  const [name, setName] = useState("")
  const [researchArea, setResearchArea] = useState("")
  const [color, setColor] = useState("#a78bfa")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (name.trim().length < 1) {
      setError("Nome obrigatório")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          researchArea: researchArea.trim() || null,
          color: color || null,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? `Falha (${res.status})`)
      }
      const data = await res.json()
      onCreated(data.project)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">Novo projeto</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Cartilagem MVP"
              className={inputCls}
              data-testid="new-project-name"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Área de pesquisa (opcional)
            </label>
            <input
              type="text"
              value={researchArea}
              onChange={(e) => setResearchArea(e.target.value)}
              placeholder="Ex: Regenerativa - cartilagem"
              className={inputCls}
              data-testid="new-project-area"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Cor</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded-md bg-transparent border border-white/10 cursor-pointer"
                data-testid="new-project-color"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className={inputCls}
                pattern="^#[0-9a-fA-F]{6}$"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-sm text-red-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/10">
          <button onClick={onClose} className={btnGhost} disabled={busy}>
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className={btnPrimary}
            data-testid="new-project-submit"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Criar
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls =
  "w-full rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40"
const btnPrimary =
  "inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-medium px-4 py-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
const btnGhost =
  "inline-flex items-center gap-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 text-sm font-medium px-3 py-2 disabled:opacity-50"
