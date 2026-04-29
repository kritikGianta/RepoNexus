import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Tags, GitBranch, Loader2, Zap, Hash, User, Clock, AlertCircle } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  labels: string[];
  created_at: string;
  user: string;
}

interface TriageItem {
  number: number;
  story_points: number;
  suggested_labels: string[];
  reasoning: string;
}

export default function IssuesPage() {
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null)

  const { data: repoData, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get<{ repositories: any[] }>('/repos'),
  })
  const repos = repoData?.repositories || []
  const activeRepo = repos.find(r => r.id === selectedRepoId) || repos[0]

  const issuesQuery = useQuery({
    queryKey: ['issues', activeRepo?.id],
    queryFn: () => api.get<{ issues: GitHubIssue[] }>(`/helpers/repos/${activeRepo.id}/issues`),
    enabled: !!activeRepo,
  })

  const triageMutation = useMutation({
    mutationFn: (repoId: number) =>
      api.post<{ triage: TriageItem[] }>(`/helpers/repos/${repoId}/issues/triage`),
  })

  const issues = issuesQuery.data?.issues || []
  const triageMap = new Map<number, TriageItem>()
  triageMutation.data?.triage?.forEach(t => triageMap.set(t.number, t))

  const getPointColor = (points: number) => {
    if (points <= 2) return 'bg-green-500/20 text-green-400 border-green-500/30'
    if (points <= 3) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    if (points <= 5) return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    return 'bg-red-500/20 text-red-400 border-red-500/30'
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="border-b border-surface-200/60 pb-6">
        <div className="flex items-center gap-2 mb-2 text-surface-500">
          <span className="text-xs font-semibold tracking-wider uppercase">Issue Management</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-surface-900 flex items-center gap-2.5">
          <Tags className="w-7 h-7 text-brand-500" />
          Issue Triage
        </h1>
        <p className="text-sm text-surface-500 mt-2">
          AI-powered story point estimation and automated labeling for GitHub issues.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {reposLoading ? (
            <div className="flex items-center justify-center px-4 py-2">
              <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
            </div>
          ) : (
            repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => {
                  setSelectedRepoId(repo.id)
                  triageMutation.reset()
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border',
                  (selectedRepoId === repo.id || (!selectedRepoId && repo.id === repos[0]?.id))
                    ? 'bg-brand-50 text-brand-700 border-brand-200/60 shadow-sm'
                    : 'bg-white text-surface-600 border-surface-200/60 hover:bg-surface-50 hover:border-surface-300 shadow-sm'
                )}
              >
                <GitBranch className={cn("w-3.5 h-3.5", (selectedRepoId === repo.id || (!selectedRepoId && repo.id === repos[0]?.id)) ? "text-brand-500" : "text-surface-400")} />
                {repo.full_name.split('/')[1]}
              </button>
            ))
          )}
        </div>
      </div>

      {issuesQuery.isLoading && (
        <div className="card flex flex-col items-center justify-center min-h-[400px] text-center p-12 border-surface-200/60 shadow-sm bg-white">
          <Loader2 className="w-12 h-12 animate-spin text-brand-500 mb-6" />
          <h2 className="text-xl font-bold tracking-tight text-surface-900 mb-2">Fetching Issues...</h2>
          <p className="text-surface-500 max-w-md mx-auto">Syncing open issues from GitHub. This may take a moment.</p>
        </div>
      )}

      {issues.length === 0 && !issuesQuery.isLoading && (
        <div className="card text-center py-20 border-dashed border-2 bg-surface-50/50 shadow-none">
          <div className="w-16 h-16 rounded-2xl bg-white border border-surface-200/60 shadow-sm flex items-center justify-center mx-auto mb-5">
            <Tags className="w-8 h-8 text-surface-400" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-surface-900 mb-2">No Open Issues</h2>
          <p className="text-sm text-surface-500 max-w-md mx-auto">This repository has no open issues to triage right now.</p>
        </div>
      )}

      {issues.length > 0 && (
        <div className="space-y-6 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-5 rounded-2xl border border-surface-200/60 shadow-sm gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-sm bg-brand-50 border-brand-100">
                <Hash className="w-6 h-6 text-brand-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-surface-900">Issue Backlog</h3>
                <p className="text-sm font-medium text-surface-500 mt-0.5">
                  <span className="font-bold text-brand-600">{issues.length}</span> open issue{issues.length !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>
            <button
              onClick={() => activeRepo && triageMutation.mutate(activeRepo.id)}
              disabled={triageMutation.isPending}
              className="btn-primary shadow-md hover:shadow-lg transition-shadow"
            >
              {triageMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Triaging Backlog...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" /> Run AI Triage</>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {issues.map((issue, idx) => {
              const triage = triageMap.get(issue.number)
              return (
                <div key={issue.number} className="card p-0 overflow-hidden border-surface-200/60 shadow-sm hover:shadow-md transition-shadow group" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="flex items-start gap-4 p-5">
                    <div className="shrink-0 mt-1 flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center border border-surface-200/80">
                        <Hash className="w-4 h-4 text-surface-500" />
                      </div>
                      {triage && (
                        <div className={cn("flex flex-col items-center justify-center w-8 h-8 rounded-lg border shadow-sm", getPointColor(triage.story_points))}>
                          <span className="text-[10px] font-black leading-none">{triage.story_points}</span>
                          <span className="text-[8px] font-bold uppercase tracking-tighter opacity-80 leading-none mt-0.5">SP</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <h3 className="text-base font-bold text-surface-900 leading-tight">
                          <a href={`https://github.com/${activeRepo?.full_name}/issues/${issue.number}`} target="_blank" rel="noreferrer" className="hover:text-brand-600 hover:underline decoration-brand-300 underline-offset-4 transition-all">
                            {issue.title}
                          </a>
                        </h3>
                        <span className="text-xs font-mono font-medium text-surface-400 bg-surface-50 px-2 py-1 rounded-md border border-surface-200 shrink-0">#{issue.number}</span>
                      </div>
                      
                      {issue.body && (
                        <p className="text-sm text-surface-500 mt-2 line-clamp-2 leading-relaxed max-w-3xl">{issue.body}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 mt-4 text-xs font-medium text-surface-400">
                        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{issue.user}</span>
                        <span className="w-1 h-1 rounded-full bg-surface-300" />
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{new Date(issue.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        
                        {issue.labels.length > 0 && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-surface-300" />
                            <div className="flex flex-wrap gap-1.5">
                              {issue.labels.map(l => (
                                <span key={l} className="bg-surface-100 border border-surface-200 px-2 py-0.5 rounded text-surface-600 shadow-sm">{l}</span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {triage && (
                        <div className="mt-5 p-4 bg-gradient-to-br from-brand-50/50 to-white border border-brand-100 rounded-xl shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <Zap className="w-4 h-4 text-brand-500" />
                            <p className="text-xs font-bold uppercase tracking-wider text-brand-800">AI Suggested Tags</p>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {triage.suggested_labels.map(l => (
                              <span key={l} className="bg-brand-100/50 text-brand-700 font-semibold text-xs px-2.5 py-1 rounded-md border border-brand-200/60 shadow-sm">
                                {l}
                              </span>
                            ))}
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-surface-200/60 text-sm text-surface-600 italic leading-relaxed">
                            "{triage.reasoning}"
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {triageMutation.isError && (
        <div className="card p-5 border-red-200 bg-red-50 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-900 mb-1">AI Triage Failed</p>
            <p className="text-sm text-red-700">
              {triageMutation.error instanceof Error ? triageMutation.error.message : 'Unknown error'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
