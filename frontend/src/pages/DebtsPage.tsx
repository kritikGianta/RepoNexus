import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  FileCode,
  Zap,
  X,
  Check,
  ChevronDown,
  Filter,
  GitBranch,
  Bug,
  GitPullRequest,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { cn, formatDate, severityColor, categoryLabel } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'
import { TableSkeleton } from '@/components/Skeletons'
import type {
  RepoListResponse,
  DebtItemListResponse,
  DebtItem,
  DebtCategory,
  SeverityLevel,
  CreateIssueResponse,
  FixPRResponse,
} from '@/types/api'

const CATEGORIES: DebtCategory[] = [
  'high_complexity', 'code_duplication', 'dead_code', 'poor_naming',
  'missing_tests', 'security_smells', 'performance_antipatterns',
  'outdated_dependencies', 'tight_coupling', 'missing_documentation',
]

const SEVERITIES: SeverityLevel[] = ['critical', 'high', 'medium', 'low']

export default function DebtsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedRepoId = searchParams.get('repo')
  const [severity, setSeverity] = useState<SeverityLevel | ''>('')
  const [category, setCategory] = useState<DebtCategory | ''>('')
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null)
  const queryClient = useQueryClient()
  const [showHeader] = useState(true)

  const { data: repoData } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get<RepoListResponse>('/repos'),
  })
  const repos = repoData?.repositories || []
  const activeRepoId = selectedRepoId ? parseInt(selectedRepoId) : repos[0]?.id

  const queryParams = new URLSearchParams()
  if (severity) queryParams.set('severity', severity)
  if (category) queryParams.set('category', category)
  queryParams.set('page_size', '50')

  const { data: debtsData, isLoading } = useQuery({
    queryKey: ['debts', activeRepoId, severity, category],
    queryFn: () => api.get<DebtItemListResponse>(`/debts/${activeRepoId}/items?${queryParams}`),
    enabled: !!activeRepoId,
  })

  const markFixedMutation = useMutation({
    mutationFn: ({ id, is_fixed }: { id: number; is_fixed: boolean }) =>
      api.patch<DebtItem>(`/debts/items/${id}/fixed`, { is_fixed }),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      setSelectedDebt(item)
      toast.success(item.is_fixed ? 'Marked as fixed' : 'Marked as unfixed')
    },
  })

  const createIssueMutation = useMutation({
    mutationFn: (id: number) =>
      api.post<CreateIssueResponse>(`/helpers/debts/items/${id}/issue`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      if (selectedDebt) setSelectedDebt({ ...selectedDebt, github_issue_url: data.html_url })
      toast.success('GitHub issue created!')
    },
  })

  const fixPRMutation = useMutation({
    mutationFn: (id: number) =>
      api.post<FixPRResponse>(`/helpers/debts/items/${id}/fix-pr`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      if (selectedDebt) setSelectedDebt({ ...selectedDebt, fix_pr_url: data.html_url })
      toast.success('Fix PR created!')
    },
  })

  const debts = debtsData?.items || []

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-surface-200/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2 text-surface-500">
            <span className="text-xs font-semibold tracking-wider uppercase">Analytics</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-surface-900 flex items-center gap-2.5">
            <AlertTriangle className="w-7 h-7 text-orange-500" />
            Technical Debts
          </h1>
          <p className="text-sm text-surface-500 mt-1.5 max-w-xl">
            Review, prioritize, and manage code debt items discovered by AI analysis across your repositories.
          </p>
        </div>
      </div>

      {/* Repo selector & Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-2xl border border-surface-200/60 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {repos.length > 0 ? repos.map((repo) => (
            <button
              key={repo.id}
              onClick={() => {
                setSearchParams({ repo: String(repo.id) })
                setSelectedDebt(null)
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
          )) : (
             <span className="text-sm text-surface-400 italic">No repositories connected.</span>
          )}
        </div>

        <div className="flex gap-3 items-center flex-wrap w-full md:w-auto">
          <div className="flex items-center gap-2 bg-surface-50 px-3 py-1.5 rounded-lg border border-surface-200/60 shadow-sm">
             <Filter className="w-4 h-4 text-surface-400" />
             <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as SeverityLevel | '')}
              className="bg-transparent border-none text-sm font-medium text-surface-700 focus:ring-0 p-0 pr-6 appearance-none cursor-pointer"
            >
              <option value="">All Severities</option>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2 bg-surface-50 px-3 py-1.5 rounded-lg border border-surface-200/60 shadow-sm">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DebtCategory | '')}
              className="bg-transparent border-none text-sm font-medium text-surface-700 focus:ring-0 p-0 pr-6 appearance-none cursor-pointer"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{categoryLabel(c)}</option>
              ))}
            </select>
          </div>

          {debtsData && (
            <div className="px-3 py-1.5 rounded-lg bg-surface-100 border border-surface-200 text-xs font-bold text-surface-600 tracking-wider uppercase ml-auto md:ml-0">
              {debtsData.page.total} Items
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Debt list */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar">
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : debts.length === 0 ? (
            <div className="card text-center py-16 border-dashed border-2 bg-surface-50/50 shadow-none">
              <div className="w-16 h-16 rounded-2xl bg-white border border-surface-200/60 shadow-sm flex items-center justify-center mx-auto mb-5">
                <AlertTriangle className="w-8 h-8 text-surface-300" />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-surface-900 mb-2">No Debts Found</h3>
              <p className="text-sm text-surface-500 max-w-xs mx-auto">
                {activeRepoId ? 'Try adjusting your filters or run a new analysis to find debt items.' : 'Connect a repo and run an analysis first to see technical debts here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {debts.map((debt) => (
                <button
                  key={debt.id}
                  onClick={() => setSelectedDebt(debt)}
                  className={cn(
                    'w-full text-left card p-4 transition-all duration-200 border shadow-sm group relative overflow-hidden',
                    selectedDebt?.id === debt.id ? 'border-brand-300 ring-1 ring-brand-200 bg-brand-50/30' : 'hover:border-surface-300 hover:shadow-md bg-white border-surface-200/60',
                    debt.is_fixed && 'opacity-60 grayscale-[0.2]'
                  )}
                >
                  {debt.is_fixed && (
                    <div className="absolute inset-y-0 right-0 w-1.5 bg-emerald-400" />
                  )}
                  <div className="flex items-start gap-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5", 
                      debt.severity_level === 'critical' ? 'bg-red-50 border-red-100' :
                      debt.severity_level === 'high' ? 'bg-orange-50 border-orange-100' :
                      debt.severity_level === 'medium' ? 'bg-yellow-50 border-yellow-100' :
                      'bg-blue-50 border-blue-100'
                    )}>
                      {debt.is_fixed ? (
                         <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                         <FileCode className={cn("w-4 h-4", 
                            debt.severity_level === 'critical' ? 'text-red-500' :
                            debt.severity_level === 'high' ? 'text-orange-500' :
                            debt.severity_level === 'medium' ? 'text-yellow-500' :
                            'text-blue-500'
                         )} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <p className={cn("text-sm font-bold tracking-tight truncate mb-1.5", debt.is_fixed ? 'text-surface-500 line-through' : 'text-surface-900')}>{debt.title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shadow-sm', severityColor(debt.severity_level).replace('text-', 'bg-').replace('500', '50').replace('text-', 'border-').replace('500', '200'), severityColor(debt.severity_level))}>
                          {debt.severity_level}
                        </span>
                        <span className="text-[10px] font-mono text-surface-400 bg-surface-100 px-1.5 py-0.5 rounded truncate max-w-[150px]" title={debt.file_path}>
                          {debt.file_path.split('/').pop()}:{debt.start_line}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-7 xl:col-span-8">
          {selectedDebt ? (
            <div className="card p-0 overflow-hidden space-y-0 animate-slide-in-right max-h-[calc(100vh-280px)] overflow-y-auto border-surface-200/60 shadow-sm custom-scrollbar">
              {/* Header section */}
              <div className="p-6 border-b border-surface-100/80 bg-white">
                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                       <span className={cn('px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border shadow-sm', severityColor(selectedDebt.severity_level).replace('text-', 'bg-').replace('500', '50').replace('text-', 'border-').replace('500', '200'), severityColor(selectedDebt.severity_level))}>
                        {selectedDebt.severity_level} Risk
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-xs font-semibold text-surface-600 bg-surface-100 border border-surface-200 shadow-sm">
                        {categoryLabel(selectedDebt.debt_category)}
                      </span>
                    </div>
                    <h3 className={cn("text-2xl font-bold tracking-tight mb-2", selectedDebt.is_fixed ? 'text-surface-500 line-through decoration-surface-300' : 'text-surface-900')}>{selectedDebt.title}</h3>
                    
                    {/* Location */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-50 border border-surface-200/60 mt-2">
                       <FileCode className="w-3.5 h-3.5 text-surface-400" />
                       <span className="text-xs font-mono text-brand-600">{selectedDebt.file_path}</span>
                       <span className="text-xs font-mono text-surface-400 bg-white px-1.5 py-0.5 rounded border border-surface-200">Lines {selectedDebt.start_line}–{selectedDebt.end_line}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 xl:justify-end xl:flex-col xl:items-stretch min-w-[160px]">
                    <button
                      onClick={() =>
                        markFixedMutation.mutate({ id: selectedDebt.id, is_fixed: !selectedDebt.is_fixed })
                      }
                      className={cn(
                        'btn-secondary flex items-center justify-center gap-2 text-sm w-full xl:w-auto shadow-sm',
                        selectedDebt.is_fixed ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300' : ''
                      )}
                    >
                      <Check className="w-4 h-4" />
                      {selectedDebt.is_fixed ? 'Resolved' : 'Mark as Fixed'}
                    </button>

                    {/* Create Issue button */}
                    {selectedDebt.github_issue_url ? (
                      <a
                        href={selectedDebt.github_issue_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary flex items-center justify-center gap-2 text-sm w-full xl:w-auto text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100 shadow-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Issue
                      </a>
                    ) : (
                      <button
                        onClick={() => createIssueMutation.mutate(selectedDebt.id)}
                        disabled={createIssueMutation.isPending}
                        className="btn-secondary flex items-center justify-center gap-2 text-sm w-full xl:w-auto hover:text-orange-600 hover:border-orange-200 shadow-sm"
                      >
                        {createIssueMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                        ) : (
                          <Bug className="w-4 h-4 text-orange-500" />
                        )}
                        Create Issue
                      </button>
                    )}

                    {/* Fix PR button */}
                    {selectedDebt.fix_pr_url ? (
                      <a
                        href={selectedDebt.fix_pr_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary flex items-center justify-center gap-2 text-sm w-full xl:w-auto text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 shadow-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Fix PR
                      </a>
                    ) : (
                      <button
                        onClick={() => fixPRMutation.mutate(selectedDebt.id)}
                        disabled={fixPRMutation.isPending}
                        className="btn-secondary flex items-center justify-center gap-2 text-sm w-full xl:w-auto hover:text-blue-600 hover:border-blue-200 shadow-sm"
                      >
                        {fixPRMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        ) : (
                          <GitPullRequest className="w-4 h-4 text-blue-500" />
                        )}
                        Generate Fix PR
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-8 bg-surface-50/30">
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-surface-200/60 shadow-sm flex items-center gap-4">
                     <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100">
                        <AlertTriangle className="w-6 h-6 text-orange-500" />
                     </div>
                     <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-0.5">Debt Score</p>
                        <p className="text-2xl font-black text-orange-600">{selectedDebt.debt_score.toFixed(1)}</p>
                     </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-surface-200/60 shadow-sm flex items-center gap-4">
                     <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center border border-yellow-100">
                        <span className="text-xl font-bold text-yellow-600">⏱️</span>
                     </div>
                     <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-0.5">Est. Effort</p>
                        <p className="text-2xl font-black text-yellow-600">{selectedDebt.estimated_effort_hours.toFixed(1)}h</p>
                     </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-sm font-bold tracking-tight text-surface-900 mb-3 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-surface-400" />
                     Description
                  </h4>
                  <div className="p-5 rounded-2xl bg-white border border-surface-200/60 shadow-sm">
                     <p className="text-sm text-surface-700 leading-relaxed font-medium">{selectedDebt.description}</p>
                  </div>
                </div>

                {/* AI explanation */}
                <div>
                  <h4 className="text-sm font-bold tracking-tight text-surface-900 mb-3 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                     Why It Matters
                  </h4>
                  <div className="p-5 rounded-2xl bg-brand-50/50 border border-brand-100/50 shadow-sm">
                    <p className="text-sm text-surface-700 leading-relaxed">{selectedDebt.ai_explanation}</p>
                  </div>
                </div>

                {/* Code snippet */}
                <div>
                  <h4 className="text-sm font-bold tracking-tight text-surface-900 mb-3 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                     Offending Code
                  </h4>
                  <div className="rounded-2xl border border-surface-200/60 shadow-sm overflow-hidden bg-[#0d1117]">
                     <div className="px-4 py-2 border-b border-surface-800 bg-[#161b22] flex items-center gap-2">
                        <div className="flex gap-1.5">
                           <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                           <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                           <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                        </div>
                        <span className="text-xs font-mono text-surface-500 ml-2">{selectedDebt.file_path.split('/').pop()}</span>
                     </div>
                     <pre className="p-4 overflow-x-auto text-sm text-surface-300 font-mono leading-relaxed">
                       {selectedDebt.offending_code_snippet}
                     </pre>
                  </div>
                </div>

                {/* AI fix suggestion */}
                <div>
                  <h4 className="text-sm font-bold tracking-tight text-surface-900 mb-3 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                     Suggested Fix
                  </h4>
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border border-emerald-100/80 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                       <Zap className="w-24 h-24 text-emerald-500" />
                    </div>
                    <p className="text-sm text-surface-800 leading-relaxed whitespace-pre-wrap relative z-10 font-medium">{selectedDebt.ai_fix_suggestion}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center h-full min-h-[400px] border-dashed border-2 bg-surface-50/50 shadow-none">
              <div className="w-16 h-16 rounded-2xl bg-white border border-surface-200/60 shadow-sm flex items-center justify-center mb-4">
                 <AlertTriangle className="w-8 h-8 text-surface-300" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-surface-900 mb-1">Select a Debt Item</h3>
              <p className="text-sm text-surface-500 max-w-sm text-center">Click on an item from the list to view its details, AI explanations, and suggested fixes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
