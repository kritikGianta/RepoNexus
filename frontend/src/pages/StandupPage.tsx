import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Calendar, GitBranch, Loader2, Copy, Check, Clock, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { exportMarkdown } from '@/lib/export'
import type { RepoListResponse, StandupResponse } from '@/types/api'

export default function StandupPage() {
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null)
  const [daysBack, setDaysBack] = useState(1)
  const [copied, setCopied] = useState(false)

  const { data: repoData, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get<RepoListResponse>('/repos'),
  })
  const repos = repoData?.repositories || []
  const activeRepo = repos.find((r) => r.id === selectedRepoId) || repos[0]

  const standupMutation = useMutation({
    mutationFn: ({ repoId, days }: { repoId: number; days: number }) =>
      api.post<StandupResponse>(`/helpers/repos/${repoId}/standup`, { days_back: days }),
    onSuccess: () => {
      toast.success('Standup generated successfully!')
    },
    onError: () => {
      toast.error('Failed to generate standup report.')
    },
  })

  const handleGenerate = () => {
    if (!activeRepo) return
    standupMutation.mutate({ repoId: activeRepo.id, days: daysBack })
  }

  const handleCopy = () => {
    if (standupMutation.data?.markdown) {
      navigator.clipboard.writeText(standupMutation.data.markdown)
      setCopied(true)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-brand-500" />
          Daily Standup
        </h1>
        <p className="text-sm text-surface-500 mt-1">
          Automatically generate your daily or weekly progress reports based on your GitHub activity.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="card space-y-4">
            <h3 className="font-semibold text-surface-900">Report Configuration</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-surface-500">Select Repository</label>
              <div className="space-y-1">
                {reposLoading ? (
                  <div className="flex items-center gap-2 text-sm text-surface-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading repos...
                  </div>
                ) : repos.length === 0 ? (
                  <p className="text-sm text-surface-500">No repositories connected.</p>
                ) : (
                  repos.map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() => setSelectedRepoId(repo.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all text-left',
                        (selectedRepoId === repo.id || (!selectedRepoId && repo.id === repos[0].id))
                          ? 'bg-brand-100 text-brand-600 border border-brand-500/30'
                          : 'bg-surface-50 text-surface-500 border border-transparent hover:bg-surface-50'
                      )}
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      {repo.full_name}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-medium text-surface-500">Timeframe</label>
              <div className="flex gap-2">
                {[1, 3, 7].map((days) => (
                  <button
                    key={days}
                    onClick={() => setDaysBack(days)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs transition-all border',
                      daysBack === days
                        ? 'bg-brand-100 text-brand-600 border-brand-500/30'
                        : 'bg-surface-50 text-surface-500 border-transparent hover:bg-surface-50'
                    )}
                  >
                    <Clock className="w-3 h-3" />
                    {days === 1 ? '24h' : `${days} days`}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={standupMutation.isPending || !activeRepo}
              className="w-full btn-primary flex justify-center items-center gap-2 mt-4"
            >
              {standupMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4" />
              )}
              {standupMutation.isPending ? 'Analyzing Commits...' : 'Generate Standup'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card h-full min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-surface-200 pb-4">
              <h3 className="font-semibold text-surface-900">Generated Report</h3>
              {standupMutation.data && (
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="btn-ghost flex items-center gap-2 text-xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={() => exportMarkdown(standupMutation.data!.markdown, `standup-${new Date().toISOString().slice(0,10)}.md`)}
                    className="btn-ghost flex items-center gap-2 text-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {standupMutation.isPending ? (
                <div className="flex flex-col items-center justify-center h-full text-brand-500/50 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm">Reading Git history and synthesizing report...</p>
                </div>
              ) : standupMutation.data ? (
                <div className="prose-light prose-sm max-w-none">
                  <ReactMarkdown>{standupMutation.data.markdown}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-surface-400 text-sm text-center">
                  <Calendar className="w-12 h-12 mb-3 opacity-20" />
                  Select a repository and timeframe, then click<br/> "Generate Standup" to see your report.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
