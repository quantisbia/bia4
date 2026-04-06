"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MessageSquare, Send, Plus, Loader2, Zap, Bot, User } from "lucide-react"

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
  { value: "general", label: "Geral", desc: "Especialista em biofabricação" },
  { value: "pipeline", label: "Pipeline", desc: "Design de tecidos" },
  { value: "biomaterial", label: "Biomaterial", desc: "Formulações e propriedades" },
  { value: "organoid", label: "Organoide", desc: "Protocolos de diferenciação" },
  { value: "protocol", label: "Protocolo", desc: "Geração de SOPs" },
]

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [mode, setMode] = useState("general")
  const [sending, setSending] = useState(false)
  const [streamingText, setStreamingText] = useState("")
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
    const res = await fetch(`/api/chat?sessionId=${session.id}`)
    if (res.ok) {
      const data = await res.json()
      setMessages(data.messages ?? [])
    }
  }

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return

    const userMessage: ChatMessage = { role: "user", content: input }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setSending(true)
    setStreamingText("")

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId: currentSession?.id,
          mode,
          streaming: true,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setMessages(prev => [...prev, { role: "assistant", content: `❌ Erro: ${err.error}` }])
        return
      }

      // Se nova sessão, atualizar sessão atual
      const newSessionId = res.headers.get("X-Session-Id")
      if (newSessionId && !currentSession) {
        setCurrentSession({ id: newSessionId, title: "Nova Conversa", createdAt: new Date().toISOString() })
        loadSessions()
      }

      // Processar streaming SSE
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              if (data === "[DONE]") {
                setMessages(prev => [...prev, { role: "assistant", content: fullText }])
                setStreamingText("")
              } else {
                try {
                  const parsed = JSON.parse(data)
                  fullText += parsed.text ?? ""
                  setStreamingText(fullText)
                } catch {
                  // ignore
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(e)
      setMessages(prev => [...prev, { role: "assistant", content: "❌ Erro de conexão. Tente novamente." }])
    } finally {
      setSending(false)
    }
  }, [input, sending, currentSession, mode])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function formatMessage(content: string) {
    // Simples: transforma **bold** e `code`
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="bg-white/10 px-1 py-0.5 rounded text-emerald-300 font-mono text-xs">$1</code>')
      .replace(/\n/g, "<br/>")
  }

  return (
    <div className="flex h-full">
      {/* Sidebar de sessões */}
      <div className="w-64 border-r border-white/5 bg-black/10 flex flex-col shrink-0">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            Conversas
          </h2>
          <button
            onClick={() => { setCurrentSession(null); setMessages([]) }}
            className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center hover:bg-purple-500/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-purple-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="py-8 text-center">
              <MessageSquare className="w-6 h-6 text-gray-700 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Nenhuma conversa</p>
            </div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => loadSession(s)}
                className={`w-full text-left p-3 rounded-xl transition-all ${
                  currentSession?.id === s.id
                    ? "bg-purple-500/10 border border-purple-500/15"
                    : "hover:bg-white/3 border border-transparent"
                }`}
              >
                <p className="text-xs font-medium text-gray-300 truncate">{s.title}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Área de chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header com modo */}
        <div className="p-4 border-b border-white/5 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-semibold text-white">BIA Chat</span>
          </div>
          <div className="flex-1" />
          <div className="flex gap-1">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                title={m.desc}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  mode === m.value
                    ? "bg-purple-500/15 text-purple-300 border border-purple-500/20"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-gray-500">
            <Zap className="w-3 h-3 text-purple-400" />
            <span>2 créditos/msg</span>
          </div>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && !streamingText && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">BIA — Assistente de Biofabricação</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Especialista em engenharia de tecidos, biomateriais e organoides. Faça perguntas técnicas ou peça análises.
                </p>
                <div className="grid grid-cols-1 gap-2 text-left">
                  {[
                    "Qual a concentração ideal de GelMA para bioimpressão de cartilagem?",
                    "Como diferenciar iPSCs em organoides intestinais?",
                    "Quais fatores de crescimento usar para vasculogênese?",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="text-xs text-left p-3 rounded-xl bg-white/3 border border-white/8 text-gray-400 hover:border-purple-500/20 hover:text-gray-300 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                msg.role === "user"
                  ? "bg-purple-500/15 border border-purple-500/20"
                  : "bg-emerald-500/10 border border-emerald-500/15"
              }`}>
                {msg.role === "user"
                  ? <User className="w-4 h-4 text-purple-400" />
                  : <Bot className="w-4 h-4 text-emerald-400" />
                }
              </div>
              <div className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-purple-500/10 border border-purple-500/15 text-gray-200 rounded-tr-none"
                  : "bg-white/3 border border-white/8 text-gray-300 rounded-tl-none"
              }`}>
                <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
              </div>
            </div>
          ))}

          {/* Streaming em progresso */}
          {streamingText && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed bg-white/3 border border-white/8 text-gray-300 rounded-tl-none">
                <div dangerouslySetInnerHTML={{ __html: formatMessage(streamingText) }} />
                <span className="inline-block w-1.5 h-4 bg-emerald-400 animate-pulse ml-0.5 align-middle" />
              </div>
            </div>
          )}

          {sending && !streamingText && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="px-4 py-3 bg-white/3 border border-white/8 rounded-2xl rounded-tl-none">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/5">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Pergunte sobre ${MODES.find(m => m.value === mode)?.desc.toLowerCase()}... (Enter para enviar)`}
                rows={1}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/40 resize-none min-h-[44px] max-h-32"
                style={{ height: "auto" }}
                onInput={e => {
                  const el = e.currentTarget
                  el.style.height = "auto"
                  el.style.height = `${Math.min(el.scrollHeight, 128)}px`
                }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center hover:bg-purple-400 transition-colors disabled:opacity-50 shrink-0"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
