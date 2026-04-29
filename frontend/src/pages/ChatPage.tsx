import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { MessageSquare, GitBranch, Loader2, Send, Bot, User as UserIcon } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import Tilt from 'react-parallax-tilt'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default function RepoChatPage() {
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: repoData, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get<{ repositories: any[] }>('/repos'),
  })
  const repos = repoData?.repositories || []
  const activeRepo = repos.find(r => r.id === selectedRepoId) || repos[0]

  useEffect(() => {
    // Clear messages when repo changes
    setMessages([])
  }, [selectedRepoId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const chatMutation = useMutation({
    mutationFn: (msg: string) =>
      api.post<{ answer: string }>(`/helpers/repos/${activeRepo?.id}/chat`, {
        question: msg,
      }),
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }])
    },
    onError: (error) => {
      setMessages(prev => [...prev, { role: 'assistant', content: `**Error:** Failed to get response. ${error instanceof Error ? error.message : 'Unknown error'}` }])
    }
  })

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !activeRepo || chatMutation.isPending) return
    
    const userMsg = input.trim()
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setInput("")
    chatMutation.mutate(userMsg)
  }

  return (
    <div className="space-y-4 animate-fade-in flex-1 flex flex-col min-h-0">
      <div className="border-b border-surface-200/60 pb-4 shrink-0">
        <div className="flex items-center gap-2 mb-1 text-surface-500">
          <span className="text-xs font-semibold tracking-wider uppercase">AI Assistant</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-surface-900 flex items-center gap-2.5">
          <MessageSquare className="w-6 h-6 text-brand-500" />
          Code Chat
        </h1>
      </div>

      <div className="flex items-center justify-between shrink-0 mb-2">
        <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Repository</div>
        <div className="flex gap-2">
          {reposLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
          ) : (
            repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => setSelectedRepoId(repo.id)}
                className={cn(
                  'badge transition-all cursor-pointer',
                  (selectedRepoId === repo.id || (!selectedRepoId && repo.id === repos[0]?.id))
                    ? 'bg-brand-50 text-brand-600 border border-brand-200'
                    : 'bg-surface-50 text-surface-500 border border-surface-200 hover:bg-surface-100'
                )}
              >
                <GitBranch className="w-3 h-3" />
                {repo.full_name.split('/')[1]}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 card flex flex-col overflow-hidden bg-white shadow-sm border-surface-200/80">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/10">
              <MessageSquare className="w-8 h-8 text-indigo-500" />
            </div>
            <h2 className="text-lg font-bold text-surface-900 mb-1">How can I help you?</h2>
            <p className="text-xs text-surface-500 max-w-md mx-auto mb-6">
              I'm connected to the <span className="font-semibold text-surface-700">{activeRepo?.full_name || 'selected repository'}</span>. Ask me anything about where code is located, how the architecture works, or how to get started!
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {[
                "Where is the authentication logic handled?",
                "How do I add a new API endpoint?",
                "What dependencies are we using for the database?",
                "Summarize the main application entry point."
              ].map(suggestion => (
                <button 
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion)
                  }}
                  className="p-3 text-xs text-left border border-surface-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-surface-600 hover:text-indigo-700"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-4 max-w-3xl", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  msg.role === 'user' ? "bg-surface-100" : "bg-indigo-100"
                )}>
                  {msg.role === 'user' ? <UserIcon className="w-4 h-4 text-surface-600" /> : <Bot className="w-4 h-4 text-indigo-600" />}
                </div>
                <div className={cn(
                  "px-4 py-3 rounded-2xl",
                  msg.role === 'user' ? "bg-surface-100 text-surface-900 rounded-tr-sm" : "bg-white border border-surface-200 rounded-tl-sm shadow-sm"
                )}>
                  {msg.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose-light prose-sm max-w-none prose-p:leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {chatMutation.isPending && (
              <div className="flex gap-4 max-w-3xl">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="px-5 py-4 rounded-2xl bg-white border border-surface-200 rounded-tl-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="p-4 bg-white border-t border-surface-100 shrink-0">
          <form onSubmit={handleSend} className="relative max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask about ${activeRepo?.full_name.split('/')[1] || 'the repository'}...`}
              disabled={chatMutation.isPending || !activeRepo}
              className="w-full input pl-4 pr-12 py-3 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || chatMutation.isPending || !activeRepo}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
