import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Briefcase, GitBranch, Loader2, Download, Copy, Check, ChevronRight } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { exportMarkdown } from "@/lib/export"
import Tilt from 'react-parallax-tilt'

interface Issue {
  number: number
  title: string
  body: string
  labels: string[]
  created_at: string
  user: string
}

export default function IssuePlanPage() {
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: repoData, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get<{ repositories: any[] }>('/repos'),
  })
  const repos = repoData?.repositories || []
  const activeRepo = repos.find(r => r.id === selectedRepoId) || repos[0]

  const { data: issuesData, isLoading: issuesLoading } = useQuery({
    queryKey: ['issues', activeRepo?.id],
    queryFn: () => api.get<{ issues: Issue[] }>(`/helpers/repos/${activeRepo?.id}/issues`),
    enabled: !!activeRepo?.id,
  })
  const issues = issuesData?.issues || []

  const generateMutation = useMutation({
    mutationFn: ({ repoId, issue }: { repoId: number; issue: Issue }) =>
      api.post<{ markdown_content: string }>(`/helpers/repos/${repoId}/issue-plan-gen`, {
        issue_title: issue.title,
        issue_body: issue.body,
      }),
  })

  const content = generateMutation.data?.markdown_content || null

  const handleGenerate = (issue: Issue) => {
    if (!activeRepo) return
    setSelectedIssue(issue)
    generateMutation.mutate({ repoId: activeRepo.id, issue })
  }

  const handleCopy = () => {
    if (!content) return
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-fuchsia-500" />
            Issue-to-PR Scaffold
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            Generate a detailed implementation plan for any open issue.
          </p>
        </div>
        <div className="flex gap-2">
          {reposLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
          ) : (
            repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => { setSelectedRepoId(repo.id); setSelectedIssue(null); generateMutation.reset() }}
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
        {/* Issues List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card h-[600px] flex flex-col p-4">
            <h3 className="font-semibold text-surface-900 mb-4 px-2">Open Issues</h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {issuesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-surface-300" />
                </div>
              ) : issues.length === 0 ? (
                <p className="text-sm text-surface-500 text-center py-8">No open issues found.</p>
              ) : (
                issues.map(issue => (
                  <button
                    key={issue.number}
                    onClick={() => handleGenerate(issue)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all hover:border-fuchsia-200 hover:bg-fuchsia-50/50 group",
                      selectedIssue?.number === issue.number
                        ? "border-fuchsia-300 bg-fuchsia-50 ring-1 ring-fuchsia-500"
                        : "border-surface-200 bg-white"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-sm text-surface-900 line-clamp-2">{issue.title}</span>
                      <ChevronRight className={cn(
                        "w-4 h-4 shrink-0 transition-colors mt-0.5",
                        selectedIssue?.number === issue.number ? "text-fuchsia-500" : "text-surface-300 group-hover:text-fuchsia-400"
                      )} />
                    </div>
                    <div className="text-xs font-mono text-surface-400 mt-2 flex items-center justify-between">
                      <span>#{issue.number}</span>
                      {issue.labels.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-surface-100 text-surface-600 truncate max-w-[120px]">
                          {issue.labels[0]}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Plan Output */}
        <div className="lg:col-span-2 perspective-1000">
          {!selectedIssue && !generateMutation.isPending && (
            <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.02} transitionSpeed={2000} glareEnable={true} glareMaxOpacity={0.05} glareColor="#d946ef" glarePosition="all" className="h-full">
              <div className="card h-full flex flex-col items-center justify-center text-center p-8 preserve-3d">
                <div className="w-16 h-16 rounded-2xl bg-fuchsia-50 flex items-center justify-center mb-5 animate-float-icon">
                  <Briefcase className="w-8 h-8 text-fuchsia-500" />
                </div>
                <h2 className="text-lg font-bold text-surface-900 mb-2">Select an Issue</h2>
                <p className="text-surface-500 text-sm max-w-sm">
                  Choose an open issue from the list to generate a step-by-step implementation plan and PR scaffold.
                </p>
              </div>
            </Tilt>
          )}

          {generateMutation.isPending && (
            <div className="card h-[600px] flex flex-col items-center justify-center text-center p-8">
              <Loader2 className="w-10 h-10 animate-spin text-fuchsia-500 mb-4" />
              <h2 className="text-lg font-bold text-surface-900 mb-1">Architecting Solution...</h2>
              <p className="text-surface-500 text-sm max-w-sm">
                Analyzing codebase structure and drafting the implementation plan for #{selectedIssue?.number}.
              </p>
            </div>
          )}

          {content && !generateMutation.isPending && (
            <div className="card h-[600px] flex flex-col p-6">
              <div className="flex items-center justify-between mb-6 border-b border-surface-100 pb-4">
                <div>
                  <h2 className="font-bold text-surface-900 flex items-center gap-2">
                    Implementation Plan
                    <span className="text-xs font-mono font-normal text-surface-400">#{selectedIssue?.number}</span>
                  </h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCopy} className="btn-secondary text-xs py-1.5 px-3">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button onClick={() => exportMarkdown(content, `issue-${selectedIssue?.number}-plan.md`)} className="btn-secondary text-xs py-1.5 px-3">
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
              <p className="text-sm text-red-600">{generateMutation.error instanceof Error ? generateMutation.error.message : 'Failed to generate plan.'}</p>
              <button onClick={() => selectedIssue && handleGenerate(selectedIssue)} className="btn-danger mt-3 text-xs">Try Again</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
