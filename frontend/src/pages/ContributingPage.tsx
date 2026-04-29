import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Users, GitBranch, Loader2, Download, Copy, Check } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { exportMarkdown } from "@/lib/export"
import { useHistoryStore } from "@/stores/history"
import Tilt from 'react-parallax-tilt'

export default function ContributingPage() {
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: repoData, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get<{ repositories: any[] }>('/repos'),
  })
  const repos = repoData?.repositories || []
  const activeRepo = repos.find(r => r.id === selectedRepoId) || repos[0]

  const history = useHistoryStore()
  const cacheKey = activeRepo ? `contributing-${activeRepo.id}` : ''
  const cached = history.get(cacheKey)

  const generateMutation = useMutation({
    mutationFn: (repoId: number) =>
      api.post<{ markdown_content: string }>(`/helpers/repos/${repoId}/contributing-gen`),
    onSuccess: (data) => {
      if (activeRepo) history.set(cacheKey, data.markdown_content)
    },
  })

  const content = generateMutation.data?.markdown_content || cached || null

  const handleGenerate = () => {
    if (!activeRepo) return
    generateMutation.mutate(activeRepo.id)
  }

  const handleCopy = () => {
    if (!content) return
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-500" />
            Contributing Guide
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            Generate a CONTRIBUTING.md with setup instructions, conventions, and PR process.
          </p>
        </div>
        <div className="flex gap-2">
          {reposLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
          ) : (
            repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => { setSelectedRepoId(repo.id); generateMutation.reset() }}
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

      {!content && !generateMutation.isPending && (
        <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.02} transitionSpeed={2000} glareEnable={true} glareMaxOpacity={0.05} glareColor="#10b981" glarePosition="all" className="perspective-1000">
          <div className="card text-center py-16 preserve-3d">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5 animate-float-icon">
              <Users className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-lg font-bold text-surface-900 mb-2">Generate Contributing Guide</h2>
            <p className="text-surface-500 text-sm max-w-md mx-auto mb-6">
              We'll analyze the conventions in <span className="font-semibold text-surface-700">{activeRepo?.full_name || 'your repository'}</span> and generate a welcoming contributor guide.
            </p>
            <button onClick={handleGenerate} disabled={!activeRepo} className="btn-primary">
              <Users className="w-4 h-4" /> Generate Guide
            </button>
          </div>
        </Tilt>
      )}

      {generateMutation.isPending && (
        <div className="card text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-surface-900 mb-1">Generating guide...</h2>
          <p className="text-surface-500 text-sm">Analyzing code style, configs, and workflow patterns.</p>
        </div>
      )}

      {content && (
        <div className="card">
          <div className="flex items-center justify-between mb-6 border-b border-surface-100 pb-4">
            <h2 className="font-bold text-surface-900">CONTRIBUTING.md</h2>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="btn-secondary text-xs py-1.5 px-3">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={() => exportMarkdown(content, `${activeRepo?.full_name.split('/')[1] || 'repo'}-CONTRIBUTING.md`)} className="btn-secondary text-xs py-1.5 px-3">
                <Download className="w-3.5 h-3.5" /> Download
              </button>
              <button onClick={handleGenerate} className="btn-ghost text-xs py-1.5 px-3">
                Regenerate
              </button>
            </div>
          </div>
          <div className="prose-light max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      )}

      {generateMutation.isError && (
        <div className="card border-red-200 bg-red-50">
          <p className="text-sm text-red-600">{generateMutation.error instanceof Error ? generateMutation.error.message : 'Failed to generate guide.'}</p>
          <button onClick={handleGenerate} className="btn-danger mt-3 text-xs">Try Again</button>
        </div>
      )}
    </div>
  )
}
