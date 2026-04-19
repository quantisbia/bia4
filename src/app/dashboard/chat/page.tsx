"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  MessageSquare, Send, Plus, Loader2, Zap, Bot, User,
  ChevronDown, X, Menu as MenuIcon,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

interface ChatMessage {
  id?: string
  role: "user" | "assistant"
  content: string
  createdAt?: string
}

interface ChatSession {
  id: string
  title: string
  createdAt: string
  messages?: ChatMessage[]
}

const MODES = [
  { value: "general",    label: "Geral",       short: "G",  desc: "Especialista em biofabricação" },
  { value: "pipeline",   label: "Pipeline",    short: "P",  desc: "Design de tecidos" },
  { value: "biomaterial",label: "Biomaterial", short: "B",  desc: "Formulações" },
  { value: "organoid",   label: "Organoide",   short: "O",  desc: "Diferenciação" },
  { value: "protocol",   label: "Protocolo",   short: "Pr", desc: "SOPs" },
]

const STARTER_QUESTIONS = [
  "Qual a concentração ideal de GelMA para bioimpressão de cartilagem?",
  "Como diferenciar iPSCs em organoides intestinais?",
  "Quais fatores de crescimento usar para vasculogênese?",
]

function formatMessage(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="bg-white/10 px-1 py-0.5 rounded text-emerald-300 font-mono text-xs">$1</code>')
    .replace(/\n/g, "<br/>")
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [mode, setMode] = useState("general")
  const [sending, setSending] = useState(false)
  const [streamingText, setStreamingText] = useState("")
  const [showSessions, setShowSessions] = useState(false) // mobile: session drawer
  const [showModeMenu, setShowModeMenu] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { loadSessions() }, [])
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingText])

  async function loadSessions() {
    const res = await fetch("/api/chat")
    if (res.ok) setSessions(await res.json())
  }

  async function loadSession(session: ChatSession) {
    setCurrentSession(session)
    setShowSessions(false)
    const res = await fetch(`/api/chat?sessionId=${session.id}`)
    if (res.ok) {
      const data = await res.json()
      setMessages(data.messages ?? [])
    }
  }

  function newChat() {
    setCurrentSession(null)
    setMessages([])
    setStreamingText("")
    setShowSessions(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return
    const userMsg: ChatMessage = { role: "user", content: input.trim() }
    setMessages((prev) => [...prev, userMsg])
    const sent = input.trim()
    setInput("")
    setSending(true)
    setStreamingText("")

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: sent,
          sessionId: currentSession?.id,
          mode,
          streaming: true,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: `Erro: ${err.error || "Algo deu errado. Tente novamente."}`,
        }])
        return
      }

      const contentType = res.headers.get("content-type") || ""
      if (contentType.includes("text/event-stream")) {
        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        let fullText = ""
        let sid = currentSession?.id

        while (reader) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              if (data === "[DONE]") break
              try {
                const parsed = JSON.parse(data)
                if (parsed.text) { fullText += parsed.text; setStreamingText(fullText) }
                if (parsed.sessionId && !sid) { sid = parsed.sessionId }
              } catch { /* skip */ }
            }
          }
        }
        setStreamingText("")
        setMessages((prev) => [...prev, { role: "assistant", content: fullText }])
        if (sid && sid !== currentSession?.id) {
          setCurrentSession({ id: sid, title: sent.slice(0, 40), createdAt: new Date().toISOString() })
          loadSessions()
        }
      } else {
        const data = await res.json()
        setMessages((prev) => [...prev, { role: "assistant", content: data.message }])
        if (data.sessionId && data.sessionId !== currentSession?.id) {
          setCurrentSession({ id: data.sessionId, title: sent.slice(0, 40), createdAt: new Date().toISOString() })
          loadSessions()
        }
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Erro de conexão. Verifique sua internet e tente novamente.",
      }])
    } finally {
      setSending(false)
      setStreamingText("")
    }
  }, [input, sending, currentSession, mode])

  const currentMode = MODES.find((m) => m.value === mode)

  return (
    <div className="flex h-full overflow-hidden relative">

      {/* ── Sessions panel — desktop sidebar, mobile drawer ───────── */}
      {/* Mobile backdrop */}
      {showSessions && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowSessions(false)} />
      )}

      {/* Sessions panel */}
      <div className={cn(
        "flex flex-col border-r border-white/5 bg-black/10 shrink-0 transition-all duration-300",
        // Desktop: always visible
        "md:relative md:w-60 md:translate-x-0",
        // Mobile: drawer from left, full height, fixed
        "fixed top-0 left-0 bottom-0 z-40 w-72",
        showSessions ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Mobile offset for top bar */}
        <div className="md:hidden h-[56px] shrink-0" />

        <div className="p-3 border-b border-white/5 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            Conversas
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={newChat}
              className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center hover:bg-purple-500/20 transition-colors">
              <Plus className="w-3.5 h-3.5 text-purple-400" />
            </button>
            <button onClick={() => setShowSessions(false)}
              className="md:hidden w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="py-8 text-center">
              <MessageSquare className="w-6 h-6 text-gray-700 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Nenhuma conversa</p>
            </div>
          ) : (
            sessions.map((s) => (
              <button key={s.id} onClick={() => loadSession(s)}
                className={cn(
                  "w-full text-left p-3 rounded-xl transition-all",
                  currentSession?.id === s.id
                    ? "bg-purple-500/10 border border-purple-500/15"
                    : "hover:bg-white/3 border border-transparent"
                )}>
                <p className="text-xs font-medium text-gray-300 truncate">{s.title}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Main chat area ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Chat header */}
        <div className="px-3 sm:px-4 py-3 border-b border-white/5 flex items-center gap-2 shrink-0">
          {/* Mobile: sessions toggle */}
          <button onClick={() => setShowSessions(true)}
            className="md:hidden w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-gray-400 hover:text-white shrink-0">
            <MenuIcon className="w-4 h-4" />
          </button>

          <Bot className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="text-sm font-semibold text-white">BIA Chat</span>

          <div className="flex-1" />

          {/* Mode selector — compact on mobile */}
          <div className="relative">
            {/* Mobile: dropdown */}
            <button onClick={() => setShowModeMenu(!showModeMenu)}
              className="sm:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
              <span>{currentMode?.label}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {showModeMenu && (
              <div className="sm:hidden absolute right-0 top-full mt-1 w-44 bg-[#0f0720] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                {MODES.map((m) => (
                  <button key={m.value} onClick={() => { setMode(m.value); setShowModeMenu(false) }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 text-xs transition-colors",
                      mode === m.value ? "bg-purple-500/15 text-purple-300" : "text-gray-400 hover:bg-white/5"
                    )}>
                    <span className="font-medium">{m.label}</span>
                    <span className="text-gray-600 ml-2">{m.desc}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Desktop: pills */}
            <div className="hidden sm:flex gap-1">
              {MODES.map((m) => (
                <button key={m.value} onClick={() => setMode(m.value)} title={m.desc}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                    mode === m.value
                      ? "bg-purple-500/15 text-purple-300 border border-purple-500/20"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                  )}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] text-gray-600 shrink-0">
            <Zap className="w-3 h-3 text-purple-400" />
            <span>2 cr/msg</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          {messages.length === 0 && !streamingText && (
            <div className="flex items-center justify-center h-full py-8">
              <div className="text-center max-w-xs sm:max-w-md w-full px-2">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-purple-400" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">BIA — Assistente Científico</h3>
                <p className="text-xs sm:text-sm text-gray-500 mb-5">
                  Especialista em biofabricação, biomateriais e organoides.
                </p>
                <div className="space-y-2">
                  {STARTER_QUESTIONS.map((q) => (
                    <button key={q} onClick={() => setInput(q)}
                      className="w-full text-xs text-left p-3 rounded-xl bg-white/3 border border-white/8 text-gray-400 hover:border-purple-500/20 hover:text-gray-300 transition-all active:scale-[0.98]">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-2.5 sm:gap-3", msg.role === "user" ? "flex-row-reverse" : "")}>
              <div className={cn(
                "w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0",
                msg.role === "user"
                  ? "bg-purple-500/15 border border-purple-500/20"
                  : "bg-emerald-500/10 border border-emerald-500/15"
              )}>
                {msg.role === "user"
                  ? <User className="w-3.5 h-3.5 text-purple-400" />
                  : <Bot className="w-3.5 h-3.5 text-emerald-400" />
                }
              </div>
              <div className={cn(
                "rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm leading-relaxed max-w-[85%] sm:max-w-2xl",
                msg.role === "user"
                  ? "bg-purple-500/10 border border-purple-500/15 text-gray-200 rounded-tr-none"
                  : "bg-white/3 border border-white/8 text-gray-300 rounded-tl-none"
              )}>
                <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
              </div>
            </div>
          ))}

          {streamingText && (
            <div className="flex gap-2.5 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="max-w-[85%] sm:max-w-2xl rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm leading-relaxed bg-white/3 border border-white/8 text-gray-300 rounded-tl-none">
                <div dangerouslySetInnerHTML={{ __html: formatMessage(streamingText) }} />
                <span className="inline-block w-1.5 h-4 bg-emerald-400 animate-pulse ml-0.5 align-middle" />
              </div>
            </div>
          )}

          {sending && !streamingText && (
            <div className="flex gap-2.5 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="px-3.5 py-2.5 bg-white/3 border border-white/8 rounded-2xl rounded-tl-none">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area — safe area bottom padding for mobile */}
        <div className="p-3 sm:p-4 border-t border-white/5 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
          <div className="flex gap-2 sm:gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Pergunte sobre ${currentMode?.desc.toLowerCase()}…`}
                rows={1}
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 resize-none min-h-[44px] sm:min-h-[44px] max-h-32 transition-all"
                onInput={(e) => {
                  const el = e.currentTarget
                  el.style.height = "auto"
                  el.style.height = `${Math.min(el.scrollHeight, 128)}px`
                }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-purple-500 flex items-center justify-center hover:bg-purple-400 transition-all disabled:opacity-50 shrink-0 active:scale-90 shadow-lg shadow-purple-900/30"
            >
              {sending
                ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                : <Send className="w-4 h-4 text-white" />
              }
            </button>
          </div>
          <p className="hidden sm:block text-[10px] text-gray-700 text-center mt-2">
            Enter para enviar · Shift+Enter para nova linha
          </p>
        </div>
      </div>
    </div>
  )
}
