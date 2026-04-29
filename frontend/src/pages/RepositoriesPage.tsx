import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  GitBranch,
  Clock,
  Plus,
  Trash2,
  Webhook,
  X,
  ExternalLink,
  Check,
  FileText,
  Loader2,
  Copy,
  GitPullRequest,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { cn, formatRelativeTime, debtScoreColor } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'
import { TableSkeleton } from '@/components/Skeletons'
import Tilt from 'react-parallax-tilt'
import type { RepoListResponse, Repository, WebhookRegisterResponse, ReadmeResponse, ReadmePushResponse } from '@/types/api'

export default function RepositoriesPage() {
  const [showConnect, setShowConnect] = useState(false)
  const [repoName, setRepoName] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get<RepoListResponse>('/repos'),
  })

  const connectMutation = useMutation({
    mutationFn: (full_name: string) => api.post<Repository>('/repos/connect', { full_name }),
    onSuccess: (repo) => {
      queryClient.invalidateQueries({ queryKey: ['repos'] })
      toast.success(`Connected ${repo.full_name}`)
      setRepoName('')
      setShowConnect(false)
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/repos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repos'] })
      toast.success('Repository disconnected')
    },
  })

  const webhookMutation = useMutation({
    mutationFn: (id: number) => api.post<WebhookRegisterResponse>(`/repos/${id}/webhook`),
    onSuccess: (res) => {
      if (res.success) toast.success('Webhook registered!')
      else toast.error('Webhook registration failed')
    },
  })

  const [readmeModal, setReadmeModal] = useState<{ repoId: number; markdown: string } | null>(null)

  const readmeMutation = useMutation({
    mutationFn: (repoId: number) => api.post<ReadmeResponse>(`/helpers/repos/${repoId}/readme`),
    onSuccess: (data, repoId) => {
      setReadmeModal({ repoId, markdown: data.markdown })
      toast.success('README generated!')
    },
  })

  const pushReadmeMutation = useMutation({
    mutationFn: ({ repoId, markdown }: { repoId: number; markdown: string }) =>
      api.post<ReadmePushResponse>(`/helpers/repos/${repoId}/readme/push`, { markdown }),
    onSuccess: (data) => {
      toast.success('README PR created!')
      window.open(data.html_url, '_blank')
      setReadmeModal(null)
    },
  })

  const repos = data?.repositories || []

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault()
    let cleanedName = repoName.trim()
    
    // Auto-extract owner/repo if user pasted a full github url
    if (cleanedName.includes('github.com/')) {
      cleanedName = cleanedName.split('github.com/')[1]
    }
    if (cleanedName.endsWith('.git')) {
      cleanedName = cleanedName.slice(0, -4)
    }

    if (!cleanedName || !cleanedName.includes('/')) {
      toast.error('Enter full repo name like owner/repo')
      return
    }
    connectMutation.mutate(cleanedName)
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-surface-200/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2 text-surface-500">
            <span className="text-xs font-semibold tracking-wider uppercase">Integration</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-surface-900 flex items-center gap-2.5">
            <GitBranch className="w-7 h-7 text-brand-500" />
            Repositories
          </h1>
          <p className="text-sm text-surface-500 mt-2">
            Connect and manage your GitHub repositories for comprehensive code analysis and quality tracking.
          </p>
        </div>
        <button
          onClick={() => setShowConnect(true)}
          className="btn-primary flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Connect Repository
        </button>
      </div>

      {/* Connect modal */}
      {showConnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-md relative animate-slide-up shadow-2xl border-0 ring-1 ring-surface-200/50">
            <button onClick={() => setShowConnect(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center border border-brand-100/50">
                <GitBranch className="w-5 h-5 text-brand-600" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-surface-900">Connect Repository</h2>
            </div>
            <p className="text-sm text-surface-500 mb-6 mt-2">
              Enter the full GitHub repository name (e.g., <code className="bg-surface-100 px-1.5 py-0.5 rounded text-surface-700 font-medium font-mono text-xs">octocat/hello-world</code>)
            </p>
            <form onSubmit={handleConnect} className="space-y-5">
              <div>
                <input
                  type="text"
                  placeholder="owner/repository"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  className="input py-2.5 text-base shadow-sm"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowConnect(false)} className="btn-ghost">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connectMutation.isPending}
                  className="btn-primary flex items-center gap-2"
                >
                  {connectMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Repo list */}
      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : repos.length === 0 ? (
        <div className="card text-center py-20 border-dashed border-2 bg-surface-50/50 shadow-none">
          <div className="w-16 h-16 rounded-2xl bg-white border border-surface-200/60 shadow-sm flex items-center justify-center mx-auto mb-5">
            <GitBranch className="w-8 h-8 text-surface-400" />
          </div>
          <h3 className="text-xl font-bold tracking-tight text-surface-900 mb-2">No repositories connected</h3>
          <p className="text-sm text-surface-500 mb-8 max-w-md mx-auto">Connect your first GitHub repository to unlock AI-powered technical debt analysis and automated code reviews.</p>
          <button onClick={() => setShowConnect(true)} className="btn-primary inline-flex items-center gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            Connect Repository
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {repos.map((repo) => (
            <div
              key={repo.id}
              className="card group hover:border-brand-200/60 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-50 to-white flex items-center justify-center border border-brand-100/50 shadow-sm">
                    <GitBranch className="w-5 h-5 text-brand-600" />
                  </div>
                  {repo.current_overall_debt_score != null ? (
                    <div className={cn('px-2.5 py-1 rounded-md text-sm font-bold border shadow-sm', debtScoreColor(repo.current_overall_debt_score).replace('text-', 'bg-').replace('500', '50').replace('text-', 'border-').replace('500', '100'), debtScoreColor(repo.current_overall_debt_score))}>
                      {repo.current_overall_debt_score.toFixed(1)}
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-surface-400 bg-surface-100 px-2 py-1 rounded-md">Pending</span>
                  )}
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold tracking-tight text-surface-900 truncate" title={repo.full_name}>
                      {repo.full_name}
                    </h3>
                    <a
                      href={`https://github.com/${repo.full_name}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-surface-300 hover:text-brand-500 transition-colors shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-surface-500 flex items-center gap-1.5"><GitBranch className="w-3 h-3 text-surface-400" /> {repo.default_branch}</span>
                    {repo.primary_language && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-surface-300" />
                        <span className="text-surface-600 font-medium">{repo.primary_language}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-surface-400 mb-4 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Analyzed {formatRelativeTime(repo.last_analyzed_at)}
                </div>
                
                <div className="flex items-center gap-2 pt-4 border-t border-surface-100/80">
                  <button
                    onClick={() => readmeMutation.mutate(repo.id)}
                    disabled={readmeMutation.isPending}
                    className="btn-secondary flex-1 px-0 text-xs shadow-none border-surface-200/60"
                    title="Generate README"
                  >
                    {readmeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 text-surface-400" />}
                    README
                  </button>
                  <button
                    onClick={() => webhookMutation.mutate(repo.id)}
                    disabled={webhookMutation.isPending}
                    className="btn-secondary flex-1 px-0 text-xs shadow-none border-surface-200/60"
                    title="Register webhook"
                  >
                    <Webhook className="w-3.5 h-3.5 text-surface-400" />
                    Webhook
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Disconnect ${repo.full_name}?`)) {
                        disconnectMutation.mutate(repo.id)
                      }
                    }}
                    disabled={disconnectMutation.isPending}
                    className="btn-secondary w-10 px-0 flex items-center justify-center border-surface-200/60 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* README Preview Modal */}
      {readmeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-3xl relative animate-slide-up max-h-[85vh] flex flex-col shadow-2xl border-0 ring-1 ring-surface-200/50">
            <button onClick={() => setReadmeModal(null)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center border border-brand-100/50">
                <FileText className="w-5 h-5 text-brand-600" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-surface-900">Generated README.md</h2>
            </div>
            <p className="text-sm text-surface-500 mb-5 mt-1">Review the AI-generated README and push it directly as a PR to your repository.</p>
            
            <div className="flex-1 overflow-y-auto p-5 rounded-xl bg-surface-50/50 border border-surface-200/60 mb-5 shadow-inner">
              <pre className="text-sm text-surface-700 whitespace-pre-wrap leading-relaxed font-mono">
                {readmeModal.markdown}
              </pre>
            </div>
            
            <div className="flex gap-3 justify-end pt-2 border-t border-surface-100/80">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(readmeModal.markdown)
                  toast.success('Copied to clipboard!')
                }}
                className="btn-secondary flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy to Clipboard
              </button>
              <button
                onClick={() => pushReadmeMutation.mutate({ repoId: readmeModal.repoId, markdown: readmeModal.markdown })}
                disabled={pushReadmeMutation.isPending}
                className="btn-primary flex items-center gap-2 shadow-sm"
              >
                {pushReadmeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <GitPullRequest className="w-4 h-4" />
                )}
                Create Pull Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
