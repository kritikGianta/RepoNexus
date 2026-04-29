import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { FileText, GitPullRequest, Loader2, GitBranch, Search, Check, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { RepoListResponse, RepoTreeResponse, DocsGenerateResponse } from '@/types/api'

export default function AutoDocsPage() {
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [generatedPRs, setGeneratedPRs] = useState<Record<string, DocsGenerateResponse>>({})

  const { data: repoData, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get<RepoListResponse>('/repos'),
  })
  const repos = repoData?.repositories || []
  const activeRepo = repos.find((r) => r.id === selectedRepoId) || repos[0]

  const { data: treeData, isLoading: treeLoading } = useQuery({
    queryKey: ['repo-tree', activeRepo?.id],
    queryFn: () => api.get<RepoTreeResponse>(`/helpers/repos/${activeRepo?.id}/tree`),
    enabled: !!activeRepo,
  })

  // Filter for common code files that need docs
  const codeFiles = treeData?.files.filter((f) => 
    /\.(py|js|jsx|ts|tsx|java|go)$/.test(f) && !f.includes('node_modules') && !f.includes('vendor')
  ) || []

  const filteredFiles = codeFiles.filter((f) => f.toLowerCase().includes(searchQuery.toLowerCase()))

  const generatePRMutation = useMutation({
    mutationFn: ({ repoId, filePath }: { repoId: number, filePath: string }) =>
      api.post<DocsGenerateResponse>(`/helpers/repos/${repoId}/docs/pr`, { file_path: filePath }),
    onSuccess: (data, variables) => {
      setGeneratedPRs(prev => ({ ...prev, [variables.filePath]: data }))
      toast.success(`Generated Documentation PR for ${variables.filePath.split('/').pop()}`)
    },
    onError: () => toast.error('Failed to generate docs PR.'),
  })

  const handleGenerate = (filePath: string) => {
    if (!activeRepo) return
    generatePRMutation.mutate({ repoId: activeRepo.id, filePath })
  }

  const [expandedDiffs, setExpandedDiffs] = useState<Record<string, boolean>>({})

  const toggleDiff = (filePath: string) => {
    setExpandedDiffs(prev => ({ ...prev, [filePath]: !prev[filePath] }))
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-500" />
            Auto-Documentation
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            One-click generate missing Docstrings and JSDoc comments via automated Pull Requests.
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
                  setGeneratedPRs({})
                  setExpandedDiffs({})
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

      <div className="card space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              type="text"
              placeholder="Search files to document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
          <div className="text-sm text-surface-500 whitespace-nowrap">
            {filteredFiles.length} files found
          </div>
        </div>

        <div className="bg-surface-50 border border-surface-200 rounded-xl overflow-hidden">
          {treeLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-brand-500/50">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p className="text-sm">Scanning repository files...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="py-20 text-center text-surface-500 text-sm">
              No code files found matching your search.
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto divide-y divide-white/[0.06]">
              {filteredFiles.map((filePath) => {
                const fileName = filePath.split('/').pop() || filePath
                const folderPath = filePath.substring(0, filePath.lastIndexOf('/'))
                const isGenerating = generatePRMutation.variables?.filePath === filePath && generatePRMutation.isPending
                const prResult = generatedPRs[filePath]
                const isDiffExpanded = expandedDiffs[filePath]

                return (
                  <div key={filePath} className="flex flex-col border-b border-white/[0.02]">
                    <div className="p-4 flex items-center justify-between hover:bg-surface-50 transition-colors group">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="mt-1">
                          <FileText className="w-4 h-4 text-brand-500/70" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-surface-900 truncate">{fileName}</p>
                          {folderPath && (
                            <p className="text-xs text-surface-400 truncate">{folderPath}</p>
                          )}
                        </div>
                      </div>

                      <div className="ml-4 flex-shrink-0 flex items-center gap-2">
                        {prResult ? (
                          <>
                            {prResult.diff && (
                              <button
                                onClick={() => toggleDiff(filePath)}
                                className="btn-ghost py-1.5 text-xs text-surface-600 hover:text-surface-900"
                              >
                                {isDiffExpanded ? 'Hide Changes' : 'Show Changes'}
                              </button>
                            )}
                            <a
                              href={prResult.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-secondary py-1.5 text-xs text-green-400 hover:text-green-300 border-green-500/20 bg-green-500/10 hover:bg-green-500/20"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              PR #{prResult.pr_number} Created
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </>
                        ) : (
                          <button
                            onClick={() => handleGenerate(filePath)}
                            disabled={isGenerating}
                            className="btn-secondary py-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
                          >
                            {isGenerating ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Documenting...</>
                            ) : (
                              <><GitPullRequest className="w-3.5 h-3.5 mr-1.5" /> Generate Docs PR</>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    {isDiffExpanded && prResult?.diff && (
                      <div className="px-4 pb-4 animate-fade-in">
                        <div className="bg-white rounded-lg border border-surface-200 overflow-hidden p-4 overflow-x-auto">
                          <pre className="text-xs font-mono leading-relaxed">
                            {prResult.diff.split('\n').map((line: string, i: number) => (
                              <div key={i} className={cn(
                                "px-2 rounded-sm",
                                line.startsWith('+') ? "text-green-400 bg-green-400/10" :
                                line.startsWith('-') ? "text-red-400 bg-red-400/10" :
                                line.startsWith('@@') ? "text-brand-500/70 py-1" :
                                "text-surface-600"
                              )}>
                                {line}
                              </div>
                            ))}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
