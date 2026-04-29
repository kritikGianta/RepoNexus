import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { Activity, GitBranch, Loader2, Play, FileCode } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { RepoListResponse } from '@/types/api'

interface DebtScoreResponse {
  health_score: number
  files: {
    file: string
    debt_score: number
    severity: 'Low' | 'Medium' | 'High' | 'Critical'
    advice: string
  }[]
  summary: string
}

export default function DebtHealthPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedRepoId = searchParams.get('repo')

  const { data: repoData, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get<RepoListResponse>('/repos'),
  })

  const repos = repoData?.repositories || []
  const activeRepoId = selectedRepoId ? parseInt(selectedRepoId) : (repos.length > 0 ? repos[0].id : null)

  const [scoresCache, setScoresCache] = useState<Record<number, DebtScoreResponse>>({})

  const mutation = useMutation({
    mutationFn: (repoId: number) => api.post<DebtScoreResponse>(`/helpers/repos/${repoId}/debt-score`),
    onSuccess: (data) => {
      if (activeRepoId) {
        setScoresCache(prev => ({ ...prev, [activeRepoId]: data }))
      }
      toast.success('Technical debt health score updated!')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to score repository')
    }
  })

  const result = activeRepoId ? scoresCache[activeRepoId] : null
  const isAnalyzing = mutation.isPending && mutation.variables === activeRepoId

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500'
    if (score >= 60) return 'text-brand-500'
    if (score >= 40) return 'text-amber-500'
    return 'text-red-500'
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-surface-200/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2 text-surface-500">
            <Activity className="w-4 h-4 text-brand-500" />
            <span className="text-xs font-semibold tracking-wider uppercase">ML Analytics</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-surface-900">Debt Health Score</h1>
          <p className="text-sm text-surface-500 mt-1.5 max-w-xl">
            Evaluate your repository's structural health using our XGBoost technical debt regression model.
          </p>
        </div>
        
        {activeRepoId && (
          <button
            onClick={() => mutation.mutate(activeRepoId)}
            disabled={isAnalyzing}
            className="btn-primary flex items-center gap-2 shadow-sm"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {result ? 'Re-analyze' : 'Score Repository'}
          </button>
        )}
      </div>

      {/* Repo selector */}
      {repos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {repos.map((repo) => (
            <button
              key={repo.id}
              onClick={() => setSearchParams({ repo: String(repo.id) })}
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

      {!reposLoading && repos.length === 0 && (
        <div className="card text-center py-16 border-dashed border-2 bg-surface-50/50 shadow-none">
          <GitBranch className="w-10 h-10 text-surface-300 mx-auto mb-4" />
          <p className="text-base font-bold text-surface-900 mb-1">No repositories connected</p>
          <p className="text-sm text-surface-500 mb-4">Connect a GitHub repository to run health checks.</p>
          <Link to="/app/repos" className="btn-primary inline-flex">Go to Repositories</Link>
        </div>
      )}

      {/* Results */}
      {isAnalyzing ? (
        <div className="card py-20 flex flex-col items-center justify-center border-dashed border-2 bg-surface-50/50">
          <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
          <h3 className="text-lg font-bold text-surface-900 mb-1">Scoring Repository...</h3>
          <p className="text-sm text-surface-500 text-center max-w-sm">
            Our ML model is evaluating complexity, duplication, and coupling patterns across your codebase.
          </p>
        </div>
      ) : result ? (
        <div className="space-y-6 animate-slide-in-up">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6 md:col-span-1 flex flex-col items-center justify-center text-center">
              <p className="text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-2">Overall Health</p>
              <div className="relative mb-2">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" className="stroke-surface-100" strokeWidth="12" fill="none" />
                  <circle 
                    cx="64" cy="64" r="56" 
                    className={getHealthColor(result.health_score)} 
                    strokeWidth="12" fill="none" strokeLinecap="round"
                    strokeDasharray="351.858"
                    strokeDashoffset={351.858 - (351.858 * result.health_score) / 100}
                    style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className={cn("text-3xl font-black tracking-tight", getHealthColor(result.health_score))}>
                    {result.health_score.toFixed(1)}
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium text-surface-600">/ 100 points</p>
            </div>
            
            <div className="card p-6 md:col-span-2 flex flex-col justify-center">
              <h3 className="text-xl font-bold tracking-tight text-surface-900 mb-2">Analysis Summary</h3>
              <p className="text-surface-600 leading-relaxed text-sm mb-4">
                {result.summary}
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-50 rounded-xl p-4 border border-surface-200/60 shadow-sm">
                  <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Files Scored</p>
                  <p className="text-2xl font-bold text-surface-900">{result.files.length}</p>
                </div>
                <div className="bg-surface-50 rounded-xl p-4 border border-surface-200/60 shadow-sm">
                  <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Critical Issues</p>
                  <p className="text-2xl font-bold text-red-500">
                    {result.files.filter(f => f.severity === 'Critical' || f.severity === 'High').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-200/60 bg-surface-50/50 flex items-center justify-between">
              <h3 className="font-semibold text-surface-900 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-brand-500" />
                Scored Files
              </h3>
            </div>
            
            <div className="divide-y divide-surface-100/80">
              {result.files.map((item, i) => (
                <div key={i} className="p-5 hover:bg-surface-50/50 transition-colors flex flex-col sm:flex-row gap-4 sm:items-start group">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-sm font-semibold text-surface-900 font-mono tracking-tight break-all">
                        {item.file}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold",
                        item.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                        item.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                        item.severity === 'Medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      )}>
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-sm text-surface-600 leading-relaxed pr-4">
                      {item.advice}
                    </p>
                  </div>
                  
                  <div className="shrink-0 flex items-center justify-end sm:w-24">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-0.5">Debt Score</span>
                      <span className={cn(
                        "text-xl font-black tracking-tight",
                        item.debt_score >= 75 ? 'text-red-500' :
                        item.debt_score >= 50 ? 'text-orange-500' :
                        item.debt_score >= 25 ? 'text-amber-500' :
                        'text-emerald-500'
                      )}>
                        {item.debt_score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : !isAnalyzing && repos.length > 0 ? (
        <div className="card text-center py-20 border-dashed border-2 bg-surface-50/50 shadow-none">
          <Activity className="w-12 h-12 text-surface-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-surface-900 mb-1">Ready to Score</h3>
          <p className="text-sm text-surface-500 max-w-sm mx-auto">
            Click "Score Repository" to evaluate the structural health of the selected codebase using our machine learning model.
          </p>
        </div>
      ) : null}
    </div>
  )
}
