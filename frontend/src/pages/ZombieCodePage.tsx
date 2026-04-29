import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Ghost, GitBranch, Loader2, CheckCircle2, Trash2 } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import Tilt from 'react-parallax-tilt'
import type { ZombieScanResponse } from "@/types/api"

export default function ZombieCodePage() {
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null)

  const { data: repoData, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get<{ repositories: any[] }>('/repos'),
  })
  const repos = repoData?.repositories || []
  const activeRepo = repos.find(r => r.id === selectedRepoId) || repos[0]

  const scanMutation = useMutation({
    mutationFn: (repoId: number) => 
      api.post<ZombieScanResponse>(`/helpers/repos/${repoId}/zombie-scan`),
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
            <Ghost className="w-6 h-6 text-purple-500" />
            Zombie Code Exterminator
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            Detect mathematically unreachable code and unused components.
          </p>
        </div>

        <div className="flex gap-2">
          {reposLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
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
                    ? 'bg-purple-100 text-purple-600 border border-purple-500/30'
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
          <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.02} transitionSpeed={2000} glareEnable={true} glareMaxOpacity={0.05} glareColor="#a855f7" glarePosition="all" className="perspective-1000">
            <div className="card flex flex-col items-center justify-center min-h-[400px] text-center p-8 preserve-3d">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20 animate-float-icon">
                <Ghost className="w-10 h-10 text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-surface-900 mb-2">Hunt for Zombie Code</h2>
              <p className="text-surface-500 max-w-md mx-auto mb-8">
                We'll analyze your repository's execution paths to find dead functions, orphaned files, and unreachable logic.
              </p>
              <button
                onClick={handleScan}
                disabled={!activeRepo || scanMutation.isPending}
                className="btn-primary px-8 py-3 text-lg bg-purple-500 hover:bg-purple-600 border-purple-400"
              >
                <Ghost className="w-5 h-5 mr-2" /> 
                Start Hunt
              </button>
            </div>
          </Tilt>
        )}

        {scanMutation.isPending && (
          <div className="card flex flex-col items-center justify-center min-h-[400px] text-center p-8">
            <Loader2 className="w-10 h-10 animate-spin text-purple-400 mb-6" />
            <h2 className="text-xl font-bold text-surface-900 mb-2">Analyzing AST...</h2>
            <p className="text-surface-500 max-w-md mx-auto">
              Scanning for unreachable logic and unused exports.
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
                  <Ghost className="w-8 h-8 text-purple-400" />
                )}
                <div>
                  <h3 className="font-bold text-surface-900">Scan Complete</h3>
                  <p className="text-sm text-surface-500">
                    {scanMutation.data.issues.length} dead code segment{scanMutation.data.issues.length === 1 ? '' : 's'} found
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
                <h3 className="text-lg font-bold text-green-900 mb-2">Codebase is Clean!</h3>
                <p className="text-green-700/80 max-w-sm mx-auto">No zombie code was found in this repository.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {scanMutation.data.issues.map((issue, idx) => (
                  <div key={idx} className="card p-5 animate-slide-up group" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                        <Trash2 className="w-5 h-5 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-surface-900 truncate pr-4">
                            {issue.component}
                          </h4>
                          {issue.safe_to_delete && (
                            <span className="badge bg-green-500/10 text-green-600 border-green-500/20 shrink-0">
                              Safe to Delete
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-mono text-surface-500 mb-2 truncate bg-surface-50 p-1.5 rounded inline-block">
                          {issue.file}
                        </p>
                        <p className="text-sm text-surface-600 leading-relaxed">
                          {issue.reason}
                        </p>
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
