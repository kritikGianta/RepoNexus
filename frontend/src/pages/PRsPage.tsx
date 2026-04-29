import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { GitPullRequest, GitBranch, Loader2, Download, Copy, Check, ChevronRight } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { exportMarkdown } from "@/lib/export"
import Tilt from 'react-parallax-tilt'

interface PullRequest {
  number: number
  title: string
  user: string
  user_avatar: string
  head_branch: string
  base_branch: string
}

export default function PrReviewPage() {
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null)
  const [selectedPr, setSelectedPr] = useState<PullRequest | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: repoData, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get<{ repositories: any[] }>('/repos'),
  })
  const repos = repoData?.repositories || []
  const activeRepo = repos.find(r => r.id === selectedRepoId) || repos[0]

  const { data: prData, isLoading: prsLoading } = useQuery({
    queryKey: ['prs', activeRepo?.id],
    queryFn: () => api.get<{ prs: PullRequest[] }>(`/helpers/repos/${activeRepo?.id}/prs`),
    enabled: !!activeRepo?.id,
  })
  const prs = prData?.prs || []

  const generateMutation = useMutation({
    mutationFn: ({ repoId, pr }: { repoId: number; pr: PullRequest }) =>
      api.post<{ markdown_content: string }>(`/helpers/repos/${repoId}/pr-review`, {
        pr_number: pr.number,
      }),
  })

  const content = generateMutation.data?.markdown_content || null

  const handleGenerate = (pr: PullRequest) => {
    if (!activeRepo) return
    setSelectedPr(pr)
    generateMutation.mutate({ repoId: activeRepo.id, pr })
  }

  const handleCopy = () => {
    if (!content) return
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="border-b border-surface-200/60 pb-6">
        <div className="flex items-center gap-2 mb-2 text-surface-500">
          <span className="text-xs font-semibold tracking-wider uppercase">Code Review</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-surface-900 flex items-center gap-2.5">
          <GitPullRequest className="w-7 h-7 text-orange-500" />
          AI PR Reviewer
        </h1>
        <p className="text-sm text-surface-500 mt-2">
          Automated code review, bug detection, and comprehensive pull request summarization.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {reposLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
          ) : (
            repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => { setSelectedRepoId(repo.id); setSelectedPr(null); generateMutation.reset() }}
                className={cn(
                  'badge transition-all cursor-pointer',
                  (selectedRepoId === repo.id || (!selectedRepoId && repo.id === repos[0]?.id))
                    ? 'bg-brand-50 text-brand-600 border border-brand-200'
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PRs List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card h-[600px] flex flex-col p-4">
            <h3 className="font-semibold text-surface-900 mb-4 px-2">Open Pull Requests</h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {prsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-surface-300" />
                </div>
              ) : prs.length === 0 ? (
                <p className="text-sm text-surface-500 text-center py-8">No open PRs found.</p>
              ) : (
                prs.map(pr => (
                  <button
                    key={pr.number}
                    onClick={() => handleGenerate(pr)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all hover:border-orange-200 hover:bg-orange-50/50 group",
                      selectedPr?.number === pr.number
                        ? "border-orange-300 bg-orange-50 ring-1 ring-orange-500"
                        : "border-surface-200 bg-white"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-sm text-surface-900 line-clamp-2">{pr.title}</span>
                      <ChevronRight className={cn(
                        "w-4 h-4 shrink-0 transition-colors mt-0.5",
                        selectedPr?.number === pr.number ? "text-orange-500" : "text-surface-300 group-hover:text-orange-400"
                      )} />
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <img src={pr.user_avatar} alt={pr.user} className="w-5 h-5 rounded-full" />
                      <div className="text-xs font-mono text-surface-500 flex-1 truncate">
                        {pr.head_branch} <span className="text-surface-300">→</span> {pr.base_branch}
                      </div>
                      <span className="text-xs font-mono text-surface-400">#{pr.number}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Output */}
        <div className="lg:col-span-2 perspective-1000">
          {!selectedPr && !generateMutation.isPending && (
            <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.02} transitionSpeed={2000} glareEnable={true} glareMaxOpacity={0.05} glareColor="#f97316" glarePosition="all" className="h-full">
              <div className="card h-full flex flex-col items-center justify-center text-center p-8 preserve-3d">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-5 animate-float-icon">
                  <GitPullRequest className="w-8 h-8 text-orange-500" />
                </div>
                <h2 className="text-lg font-bold text-surface-900 mb-2">Select a Pull Request</h2>
                <p className="text-surface-500 text-sm max-w-sm">
                  Choose an open PR from the list to generate an automated code review, identifying bugs and summarizing changes.
                </p>
              </div>
            </Tilt>
          )}

          {generateMutation.isPending && (
            <div className="card h-[600px] flex flex-col items-center justify-center text-center p-8">
              <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
              <h2 className="text-lg font-bold text-surface-900 mb-1">Reviewing Code...</h2>
              <p className="text-surface-500 text-sm max-w-sm">
                Fetching diff and analyzing changes for PR #{selectedPr?.number}.
              </p>
            </div>
          )}

          {content && !generateMutation.isPending && (
            <div className="card h-[600px] flex flex-col p-6">
              <div className="flex items-center justify-between mb-6 border-b border-surface-100 pb-4">
                <div>
                  <h2 className="font-bold text-surface-900 flex items-center gap-2">
                    Code Review
                    <span className="text-xs font-mono font-normal text-surface-400">#{selectedPr?.number}</span>
                  </h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCopy} className="btn-secondary text-xs py-1.5 px-3">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button onClick={() => exportMarkdown(content, `pr-${selectedPr?.number}-review.md`)} className="btn-secondary text-xs py-1.5 px-3">
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                <div className="prose-light max-w-none">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {generateMutation.isError && (
            <div className="card border-red-200 bg-red-50 p-6">
              <p className="text-sm text-red-600">{generateMutation.error instanceof Error ? generateMutation.error.message : 'Failed to generate review.'}</p>
              <button onClick={() => selectedPr && handleGenerate(selectedPr)} className="btn-danger mt-3 text-xs">Try Again</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
