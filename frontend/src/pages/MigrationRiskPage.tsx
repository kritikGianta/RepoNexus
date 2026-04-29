import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Database, GitBranch, Loader2, CheckCircle2, AlertTriangle, AlertCircle, FileWarning } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import Tilt from 'react-parallax-tilt'
import type { MigrationRiskResponse } from "@/types/api"

export default function MigrationRiskPage() {
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null)

  const { data: repoData, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get<{ repositories: any[] }>('/repos'),
  })
  const repos = repoData?.repositories || []
  const activeRepo = repos.find(r => r.id === selectedRepoId) || repos[0]

  const scanMutation = useMutation({
    mutationFn: (repoId: number) => 
      api.post<MigrationRiskResponse>(`/helpers/repos/${repoId}/migration-risk`),
  })

  const handleScan = () => {
    if (!activeRepo) return
    scanMutation.mutate(activeRepo.id)
  }

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'Critical': return 'bg-red-500/10 border-red-500/20 text-red-600'
      case 'High': return 'bg-orange-500/10 border-orange-500/20 text-orange-600'
      case 'Medium': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600'
      case 'Low': return 'bg-blue-500/10 border-blue-500/20 text-blue-600'
      default: return 'bg-surface-500/10 border-surface-500/20 text-surface-600'
    }
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-surface-200/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2 text-surface-500">
            <span className="text-xs font-semibold tracking-wider uppercase">Advanced Analytics</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-surface-900 flex items-center gap-2.5">
            <Database className="w-7 h-7 text-emerald-500" />
            Migration Risk Analyzer
          </h1>
          <p className="text-sm text-surface-500 mt-1.5 max-w-xl">
            Analyze database schemas and migrations for downtime risks, table locks, and missing concurrent indexes.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {reposLoading ? (
            <div className="flex items-center justify-center px-4 py-2">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            </div>
          ) : (
            repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => {
                  setSelectedRepoId(repo.id)
                  scanMutation.reset()
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border',
                  (selectedRepoId === repo.id || (!selectedRepoId && repo.id === repos[0]?.id))
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm'
                    : 'bg-white text-surface-600 border-surface-200/60 hover:bg-surface-50 hover:border-surface-300 shadow-sm'
                )}
              >
                <GitBranch className={cn("w-3.5 h-3.5", (selectedRepoId === repo.id || (!selectedRepoId && repo.id === repos[0]?.id)) ? "text-emerald-500" : "text-surface-400")} />
                {repo.full_name.split('/')[1]}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {scanMutation.isIdle && (
          <Tilt tiltMaxAngleX={3} tiltMaxAngleY={3} scale={1.01} transitionSpeed={2000} glareEnable={true} glareMaxOpacity={0.03} glareColor="#10b981" glarePosition="all" className="perspective-1000">
            <div className="card flex flex-col items-center justify-center min-h-[400px] text-center p-12 preserve-3d border-emerald-100/50 hover:border-emerald-200/50 transition-colors shadow-sm bg-gradient-to-b from-white to-emerald-50/10">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center mb-8 shadow-sm border border-emerald-100 animate-float-icon">
                <Database className="w-12 h-12 text-emerald-500 drop-shadow-sm" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-surface-900 mb-3">Analyze Migration Risks</h2>
              <p className="text-surface-500 max-w-md mx-auto mb-10 leading-relaxed">
                We'll scan your migrations and schema definitions to identify potential table locks, missing concurrent indexes, and downtime risks before you deploy.
              </p>
              <button
                onClick={handleScan}
                disabled={!activeRepo || scanMutation.isPending}
                className="btn-primary px-8 py-3.5 text-base shadow-md hover:shadow-lg bg-gradient-to-b from-emerald-500 to-emerald-600 border-emerald-600/50 hover:from-emerald-600 hover:to-emerald-700 font-bold"
              >
                <Database className="w-5 h-5 mr-2" /> 
                Start Deep Analysis
              </button>
            </div>
          </Tilt>
        )}

        {scanMutation.isPending && (
          <div className="card flex flex-col items-center justify-center min-h-[400px] text-center p-12 border-surface-200/60 shadow-sm bg-white">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-6" />
            <h2 className="text-xl font-bold tracking-tight text-surface-900 mb-2">Analyzing Schemas...</h2>
            <p className="text-surface-500 max-w-md mx-auto">
              Checking for risky column additions, table locks, and index strategies. This may take a few moments.
            </p>
          </div>
        )}

        {scanMutation.isSuccess && scanMutation.data && (
          <div className="space-y-6 animate-slide-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-5 rounded-2xl border border-surface-200/60 shadow-sm gap-4">
              <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-sm", scanMutation.data.risks.length === 0 ? "bg-emerald-50 border-emerald-100" : "bg-orange-50 border-orange-100")}>
                  {scanMutation.data.risks.length === 0 ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-orange-500" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-surface-900">Analysis Complete</h3>
                  <p className="text-sm font-medium text-surface-500 mt-0.5">
                    {scanMutation.data.risks.length === 0 ? (
                      <span className="text-emerald-600">No major risks found</span>
                    ) : (
                      <span className="text-orange-600">{scanMutation.data.risks.length} risk{scanMutation.data.risks.length === 1 ? '' : 's'} identified</span>
                    )}
                  </p>
                </div>
              </div>
              <button onClick={() => scanMutation.reset()} className="btn-secondary whitespace-nowrap shadow-sm">
                Start New Scan
              </button>
            </div>

            {scanMutation.data.risks.length === 0 ? (
              <div className="card text-center p-16 border-emerald-200/50 bg-gradient-to-b from-emerald-50/50 to-white shadow-sm">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-emerald-900 mb-2">Schemas Look Safe!</h3>
                <p className="text-emerald-700/80 max-w-sm mx-auto font-medium">No major downtime risks or table locks detected in your recent migrations.</p>
              </div>
            ) : (
              <div className="grid gap-5">
                {scanMutation.data.risks.map((risk, idx) => (
                  <div key={idx} className="card p-0 overflow-hidden animate-slide-up border-surface-200/60 shadow-sm hover:shadow-md transition-shadow" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="flex flex-col sm:flex-row border-b border-surface-100/80 bg-surface-50/50">
                      <div className="p-4 sm:p-5 flex-1 flex items-start gap-3">
                        <AlertCircle className={cn("w-5 h-5 shrink-0 mt-0.5", risk.risk_level === 'Critical' ? 'text-red-500' : risk.risk_level === 'High' ? 'text-orange-500' : 'text-yellow-500')} />
                        <div>
                          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                            <span className={cn("px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border shadow-sm", getSeverityColor(risk.risk_level).replace('text-', 'bg-').replace('500', '50').replace('text-', 'border-').replace('500', '200'), getSeverityColor(risk.risk_level))}>
                              {risk.risk_level} Risk
                            </span>
                            <span className="text-xs font-mono text-surface-500 bg-white border border-surface-200 px-2 py-0.5 rounded shadow-sm flex items-center gap-1.5">
                              <FileWarning className="w-3 h-3 text-surface-400" /> {risk.file}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-surface-900 leading-relaxed mt-2">{risk.description}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 sm:p-5 bg-white">
                      <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Recommendation</p>
                          <p className="text-sm text-emerald-900 font-medium leading-relaxed">{risk.recommendation}</p>
                        </div>
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
