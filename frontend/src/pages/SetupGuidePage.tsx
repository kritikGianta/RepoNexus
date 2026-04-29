import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Terminal, GitBranch, Loader2, PlayCircle, Copy, Check } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

export default function SetupGuidePage() {
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: repoData, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get<{ repositories: any[] }>('/repos'),
  })
  
  const repos = repoData?.repositories || []

  const activeRepo = repos.find(r => r.id === selectedRepoId) || repos[0]

  const generateMutation = useMutation({
    mutationFn: (repoId: number) => 
      api.post<{ markdown_guide: string }>(`/helpers/repos/${repoId}/setup-guide`),
  })

  const handleGenerate = () => {
    if (!activeRepo) return
    generateMutation.mutate(activeRepo.id)
  }

  const handleCopy = () => {
    if (!generateMutation.data?.markdown_guide) return
    navigator.clipboard.writeText(generateMutation.data.markdown_guide)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <Terminal className="w-6 h-6 text-brand-500" />
            Local Setup Guide
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            Generate step-by-step instructions to clone, install, and run any project locally.
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
                  generateMutation.reset()
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
        {generateMutation.isIdle && (
          <div className="card flex flex-col items-center justify-center min-h-[400px] text-center p-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500/20 to-blue-500/20 flex items-center justify-center mb-6 shadow-lg shadow-brand-500/20">
              <PlayCircle className="w-10 h-10 text-brand-500" />
            </div>
            <h2 className="text-xl font-bold text-surface-900 mb-2">Ready to run locally?</h2>
            <p className="text-surface-500 max-w-md mx-auto mb-8">
              We'll scan the `{activeRepo?.full_name || 'repository'}` file tree, analyze configuration files (like package.json, requirements.txt, Dockerfiles), and write a customized setup guide for you.
            </p>
            <button
              onClick={handleGenerate}
              disabled={!activeRepo || generateMutation.isPending}
              className="btn-primary px-8 py-3 text-lg"
            >
              <Terminal className="w-5 h-5 mr-2" /> 
              Generate Setup Guide
            </button>
          </div>
        )}

        {generateMutation.isPending && (
          <div className="card flex flex-col items-center justify-center min-h-[400px] text-center p-8">
            <Loader2 className="w-10 h-10 animate-spin text-brand-500 mb-6" />
            <h2 className="text-xl font-bold text-surface-900 mb-2">Analyzing Project Configuration...</h2>
            <p className="text-surface-500 max-w-md mx-auto">
              Fetching README, checking dependencies, and generating OS-agnostic setup instructions.
            </p>
          </div>
        )}

        {generateMutation.isSuccess && generateMutation.data && (
          <div className="card space-y-4 relative">
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={handleCopy}
                className="btn-secondary py-1.5 px-3 text-xs bg-surface-50 border-surface-200 hover:bg-surface-800"
              >
                {copied ? <Check className="w-3.5 h-3.5 mr-1 text-green-400" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copied ? 'Copied' : 'Copy Guide'}
              </button>
            </div>
            <div className="prose-light prose-brand max-w-none">
              <ReactMarkdown>{generateMutation.data.markdown_guide}</ReactMarkdown>
            </div>
            
            <div className="pt-6 flex justify-center border-t border-surface-200">
              <button
                onClick={() => generateMutation.reset()}
                className="btn-ghost text-sm"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {generateMutation.isError && (
          <div className="card flex flex-col items-center justify-center min-h-[200px] text-center p-8 border-red-500/20 bg-red-500/5">
            <h2 className="text-lg font-bold text-red-400 mb-2">Failed to generate guide</h2>
            <p className="text-surface-500 text-sm mb-4">
              {generateMutation.error instanceof Error ? generateMutation.error.message : 'Unknown error occurred'}
            </p>
            <button onClick={handleGenerate} className="btn-secondary border-red-500/20 hover:bg-red-500/10 text-red-300">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
