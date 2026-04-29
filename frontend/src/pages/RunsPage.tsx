import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  GitBranch,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { cn, formatDate, statusColor, statusDotColor, categoryLabel } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'
import { TableSkeleton, CardSkeleton } from '@/components/Skeletons'
import type {
  RepoListResponse,
  AnalysisRunListResponse,
  AnalysisRun,
  TriggerAnalysisResponse,
} from '@/types/api'

export default function RunsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedRepoId = searchParams.get('repo')
  const [selectedRun, setSelectedRun] = useState<AnalysisRun | null>(null)
  const queryClient = useQueryClient()

  const { data: repoData, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get<RepoListResponse>('/repos'),
  })

  const repos = repoData?.repositories || []
  const activeRepoId = selectedRepoId ? parseInt(selectedRepoId) : repos[0]?.id

  const { data: runsData, isLoading: runsLoading } = useQuery({
    queryKey: ['runs', activeRepoId],
    queryFn: () => api.get<AnalysisRunListResponse>(`/analysis/${activeRepoId}/runs`),
    enabled: !!activeRepoId,
    refetchInterval: (query) => {
      const runs = query.state.data?.items || []
      const hasActive = runs.some((r) => r.status === 'queued' || r.status === 'running')
      return hasActive ? 4000 : false
    },
  })

  // Also poll the selected run detail
  const { data: runDetail } = useQuery({
    queryKey: ['run-detail', selectedRun?.id],
    queryFn: () => api.get<AnalysisRun>(`/analysis/runs/${selectedRun!.id}`),
    enabled: !!selectedRun,
    refetchInterval: (query) => {
      const run = query.state.data
      if (run && (run.status === 'queued' || run.status === 'running')) return 3000
      return false
    },
  })

  const triggerMutation = useMutation({
    mutationFn: (repoId: number) =>
      api.post<TriggerAnalysisResponse>(`/analysis/${repoId}/runs?trigger_type=manual`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs', activeRepoId] })
      toast.success('Analysis queued!')
    },
  })

  const runs = runsData?.items || []
  const detail = runDetail || selectedRun

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      case 'running': return <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
      case 'queued': return <Clock className="w-4 h-4 text-yellow-400" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />
      default: return null
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-surface-200/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2 text-surface-500">
            <span className="text-xs font-semibold tracking-wider uppercase">Analytics</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-surface-900">Analysis Runs</h1>
          <p className="text-sm text-surface-500 mt-1.5 max-w-xl">
            Trigger and monitor automated code debt and security analysis runs for your repositories.
          </p>
        </div>
        {activeRepoId && (
          <button
            onClick={() => triggerMutation.mutate(activeRepoId)}
            disabled={triggerMutation.isPending}
            className="btn-primary flex items-center gap-2 shadow-sm"
          >
            {triggerMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Trigger Analysis
          </button>
        )}
      </div>

      {/* Repo selector */}
      {repos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {repos.map((repo) => (
            <button
              key={repo.id}
              onClick={() => {
                setSearchParams({ repo: String(repo.id) })
                setSelectedRun(null)
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border',
                activeRepoId === repo.id
                  ? 'bg-brand-50 text-brand-700 border-brand-200/60 shadow-sm'
                  : 'bg-white text-surface-600 border-surface-200/60 hover:bg-surface-50 hover:border-surface-300 shadow-sm'
              )}
            >
              <GitBranch className={cn("w-3.5 h-3.5", activeRepoId === repo.id ? "text-brand-500" : "text-surface-400")} />
              {repo.full_name.split('/')[1]}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Runs list */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3">
          {reposLoading || runsLoading ? (
            <TableSkeleton rows={4} />
          ) : repos.length === 0 ? (
            <div className="card text-center py-12 border-dashed border-2 bg-surface-50/50 shadow-none">
              <GitBranch className="w-8 h-8 text-surface-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-surface-900 mb-1">No repositories connected</p>
              <Link to="/repos" className="text-sm text-brand-600 font-medium hover:text-brand-700">Connect a repository →</Link>
            </div>
          ) : runs.length === 0 ? (
            <div className="card text-center py-12 border-dashed border-2 bg-surface-50/50 shadow-none">
              <Play className="w-8 h-8 text-surface-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-surface-900 mb-1">No analysis runs yet</p>
              <p className="text-xs text-surface-500 max-w-xs mx-auto">Click 'Trigger Analysis' to start your first code debt analysis.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {runs.map((run) => (
                <button
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  className={cn(
                    'w-full text-left card p-4 transition-all duration-200 border shadow-sm group',
                    selectedRun?.id === run.id ? 'border-brand-300 ring-1 ring-brand-200 bg-brand-50/30' : 'hover:border-surface-300 hover:shadow-md bg-white border-surface-200/60'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border", run.status === 'completed' ? 'bg-emerald-50 border-emerald-100' : run.status === 'running' ? 'bg-brand-50 border-brand-100' : run.status === 'failed' ? 'bg-red-50 border-red-100' : 'bg-yellow-50 border-yellow-100')}>
                      {statusIcon(run.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn('text-sm font-bold tracking-tight', statusColor(run.status))}>
                          {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-surface-100 text-surface-500">
                          {run.trigger_type}
                        </span>
                      </div>
                      <p className="text-[11px] text-surface-400 font-medium">
                        {formatDate(run.started_at || run.ended_at)}
                        {run.commit_sha && ` · ${run.commit_sha.slice(0, 7)}`}
                      </p>
                    </div>
                    <ArrowRight className={cn("w-4 h-4 transition-colors", selectedRun?.id === run.id ? "text-brand-500" : "text-surface-300 group-hover:text-surface-400")} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Run detail */}
        <div className="lg:col-span-7 xl:col-span-8">
          {detail ? (
            <div className="card space-y-6 animate-slide-in-right border-surface-200/60 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-surface-100/80 pb-5">
                <div className="flex items-start gap-4">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-sm", detail.status === 'completed' ? 'bg-emerald-50 border-emerald-100' : detail.status === 'running' ? 'bg-brand-50 border-brand-100' : detail.status === 'failed' ? 'bg-red-50 border-red-100' : 'bg-yellow-50 border-yellow-100')}>
                    {statusIcon(detail.status)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight text-surface-900 mb-1">
                      Analysis Run #{detail.id}
                    </h3>
                    <p className="text-sm text-surface-500 font-medium">
                      Triggered via {detail.trigger_type} · Commit {detail.commit_sha?.slice(0, 7) || 'n/a'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-surface-50 px-3 py-1.5 rounded-lg border border-surface-200/60 shadow-sm">
                  <div className={cn('w-2 h-2 rounded-full animate-pulse-slow', statusDotColor(detail.status))} />
                  <span className={cn('text-sm font-bold uppercase tracking-wider', statusColor(detail.status))}>
                    {detail.status}
                  </span>
                </div>
              </div>

              {/* Timeline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-surface-50 border border-surface-200/60 shadow-sm flex items-start gap-3">
                  <Clock className="w-4 h-4 text-surface-400 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-0.5">Started At</p>
                    <p className="text-sm text-surface-900 font-semibold">{formatDate(detail.started_at) || 'Pending'}</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-surface-50 border border-surface-200/60 shadow-sm flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-surface-400 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-0.5">Completed At</p>
                    <p className="text-sm text-surface-900 font-semibold">{formatDate(detail.ended_at) || 'In Progress'}</p>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card bg-white border border-surface-200/60 shadow-sm p-5 hover:border-brand-200/60 transition-colors">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-2">Files Analyzed</p>
                  <p className="text-4xl font-bold tracking-tight text-brand-600">{detail.total_files_analyzed || 0}</p>
                </div>
                <div className="card bg-white border border-surface-200/60 shadow-sm p-5 hover:border-orange-200/60 transition-colors">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-2">Debt Items Found</p>
                  <p className="text-4xl font-bold tracking-tight text-orange-500">{detail.total_debt_items_found || 0}</p>
                </div>
                <div className="card bg-white border border-surface-200/60 shadow-sm p-5 hover:border-red-200/60 transition-colors">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-2">Overall Score</p>
                  <p className={cn('text-4xl font-bold tracking-tight', detail.overall_debt_score != null ? 'text-red-500' : 'text-surface-300')}>
                    {detail.overall_debt_score?.toFixed(1) ?? '—'}
                  </p>
                </div>
              </div>

              {/* Category breakdown */}
              {detail.category_breakdown && Object.keys(detail.category_breakdown).length > 0 && (
                <div className="pt-4">
                  <p className="text-sm font-bold tracking-tight text-surface-900 mb-3">Category Breakdown</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(detail.category_breakdown).map(([cat, count]) => (
                      <span key={cat} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-50 border border-surface-200/60 shadow-sm text-sm font-medium text-surface-700">
                        {categoryLabel(cat)}
                        <span className="bg-white px-1.5 py-0.5 rounded text-xs font-bold border border-surface-200">{count as number}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {detail.error_message && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 shadow-sm flex items-start gap-3 mt-4">
                  <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-red-800 mb-1">Analysis Failed</h4>
                    <p className="text-xs text-red-700 font-mono leading-relaxed">{detail.error_message}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              {detail.status === 'completed' && detail.total_debt_items_found > 0 && (
                <div className="pt-4 border-t border-surface-100/80">
                  <Link
                    to={`/debts?repo=${detail.repo_id}`}
                    className="btn-primary inline-flex items-center justify-center gap-2 w-full sm:w-auto shadow-sm"
                  >
                    View Debt Items Detals
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center h-full min-h-[400px] border-dashed border-2 bg-surface-50/50 shadow-none">
              <div className="w-16 h-16 rounded-2xl bg-white border border-surface-200/60 shadow-sm flex items-center justify-center mb-4">
                <Play className="w-8 h-8 text-surface-300" />
              </div>
              <h3 className="text-lg font-bold text-surface-900 mb-1">Select a Run</h3>
              <p className="text-sm text-surface-500">Click on an analysis run from the list to view its details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
