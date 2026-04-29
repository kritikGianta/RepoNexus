import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { DollarSign, GitBranch, Loader2, CheckCircle2, TrendingDown, Code2 } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import Tilt from 'react-parallax-tilt'
import type { CostOptimizationResponse } from "@/types/api"

export default function CostOptimizerPage() {
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null)

  const { data: repoData, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get<{ repositories: any[] }>('/repos'),
  })
  const repos = repoData?.repositories || []
  const activeRepo = repos.find(r => r.id === selectedRepoId) || repos[0]

  const scanMutation = useMutation({
    mutationFn: (repoId: number) => 
      api.post<CostOptimizationResponse>(`/helpers/repos/${repoId}/cost-optimizer`),
  })

  const handleScan = () => {
    if (!activeRepo) return
    scanMutation.mutate(activeRepo.id)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-brand-500" />
            Cloud Cost & Query Optimizer
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            Detect N+1 queries and compute-heavy loops before they spike your cloud bill.
          </p>
        </div>

        <div className="flex gap-2">
          {reposLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
          ) : (
            repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => {
                  setSelectedRepoId(repo.id)
                  scanMutation.reset()
                }}
                className={cn(
                  'badge transition-all',
                  (selectedRepoId === repo.id || (!selectedRepoId && repo.id === repos[0]?.id))
                    ? 'bg-brand-100 text-brand-600 border border-brand-500/30'
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

      <div className="grid grid-cols-1 gap-6">
        {scanMutation.isIdle && (
          <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.02} transitionSpeed={2000} glareEnable={true} glareMaxOpacity={0.05} glareColor="#0ea5e9" glarePosition="all" className="perspective-1000">
            <div className="card flex flex-col items-center justify-center min-h-[400px] text-center p-8 preserve-3d">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500/20 to-sky-500/20 flex items-center justify-center mb-6 shadow-lg shadow-brand-500/20 animate-float-icon">
                <TrendingDown className="w-10 h-10 text-brand-500" />
              </div>
              <h2 className="text-xl font-bold text-surface-900 mb-2">Optimize Cloud Costs</h2>
              <p className="text-surface-500 max-w-md mx-auto mb-8">
                We'll analyze your ORM queries, infrastructure configs, and loop structures to find inefficiencies that could cost you money in production.
              </p>
              <button
                onClick={handleScan}
                disabled={!activeRepo || scanMutation.isPending}
                className="btn-primary px-8 py-3 text-lg bg-brand-500 hover:bg-brand-600 border-brand-400"
              >
                <DollarSign className="w-5 h-5 mr-2" /> 
                Start Audit
              </button>
            </div>
          </Tilt>
        )}

        {scanMutation.isPending && (
          <div className="card flex flex-col items-center justify-center min-h-[400px] text-center p-8">
            <Loader2 className="w-10 h-10 animate-spin text-brand-500 mb-6" />
            <h2 className="text-xl font-bold text-surface-900 mb-2">Auditing Compute & Queries...</h2>
            <p className="text-surface-500 max-w-md mx-auto">
              Looking for N+1 problems, memory leaks, and oversized data fetches.
            </p>
          </div>
        )}

        {scanMutation.isSuccess && scanMutation.data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-surface-200">
              <div className="flex items-center gap-3">
                {scanMutation.data.issues.length === 0 ? (
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-brand-400" />
                )}
                <div>
                  <h3 className="font-bold text-surface-900">Audit Complete</h3>
                  <p className="text-sm text-surface-500">
                    {scanMutation.data.issues.length} cost inefficienc{scanMutation.data.issues.length === 1 ? 'y' : 'ies'} found
                  </p>
                </div>
              </div>
              <button onClick={() => scanMutation.reset()} className="btn-secondary text-xs py-1.5">
                New Scan
              </button>
            </div>

            {scanMutation.data.issues.length === 0 ? (
              <div className="card text-center p-12 border-green-500/20 bg-green-500/5">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4 opacity-80" />
                <h3 className="text-lg font-bold text-green-900 mb-2">Highly Optimized!</h3>
                <p className="text-green-700/80 max-w-sm mx-auto">Your code is efficient and clean. Your cloud provider is weeping.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {scanMutation.data.issues.map((issue, idx) => (
                  <div key={idx} className="card p-5 animate-slide-up group" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="badge bg-brand-500/10 text-brand-600 border-brand-500/20">
                            {issue.issue_type}
                          </span>
                          <span className="text-sm font-mono text-surface-500 truncate bg-surface-50 p-1 rounded">
                            {issue.file}
                          </span>
                        </div>
                        
                        <p className="text-sm text-surface-700 leading-relaxed mb-4">
                          {issue.description}
                        </p>

                        {issue.optimized_code && (
                          <div className="bg-surface-900 rounded-lg overflow-hidden border border-surface-800">
                            <div className="flex items-center gap-2 px-3 py-2 bg-surface-800 border-b border-surface-700">
                              <Code2 className="w-4 h-4 text-surface-400" />
                              <span className="text-xs font-mono text-surface-300">Suggested Fix</span>
                            </div>
                            <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                              {issue.optimized_code}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
