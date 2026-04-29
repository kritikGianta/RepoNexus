import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { BookOpen, GitBranch, Loader2, Search, PlayCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import Tilt from 'react-parallax-tilt'
import type { RepoListResponse, RepoTreeResponse, TutorLessonResponse } from '@/types/api'

export default function TutorPage() {
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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

  // Filter for common code files that might need optimization
  const codeFiles = treeData?.files.filter((f) => 
    /\.(py|js|jsx|ts|tsx|java|go|cpp|c|cs)$/.test(f) && !f.includes('node_modules') && !f.includes('vendor')
  ) || []

  const filteredFiles = codeFiles.filter((f) => f.toLowerCase().includes(searchQuery.toLowerCase()))

  const tutorMutation = useMutation({
    mutationFn: ({ repoId, filePath }: { repoId: number, filePath: string }) =>
      api.post<TutorLessonResponse>(`/helpers/repos/${repoId}/tutor/lesson`, { file_path: filePath }),
    onSuccess: () => {
      toast.success('Optimization lesson generated!')
    },
    onError: () => toast.error('Failed to generate lesson.'),
  })

  const handleGenerate = (filePath: string) => {
    if (!activeRepo) return
    tutorMutation.mutate({ repoId: activeRepo.id, filePath })
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-500" />
            Code Optimization Tutor
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            Select a file to get an interactive lesson on its Time Complexity (Big-O) and optimization strategies.
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
                  tutorMutation.reset()
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: File Explorer */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card h-full flex flex-col min-h-[600px]">
            <h3 className="font-semibold text-surface-900 mb-4">Select a File</h3>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 w-full text-sm py-2"
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-1">
              {treeLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-500/50" />
                </div>
              ) : filteredFiles.length === 0 ? (
                <p className="text-center text-sm text-surface-500 py-10">No files found.</p>
              ) : (
                filteredFiles.map((filePath) => {
                  const isSelected = tutorMutation.variables?.filePath === filePath
                  const fileName = filePath.split('/').pop() || filePath
                  return (
                    <button
                      key={filePath}
                      onClick={() => handleGenerate(filePath)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between group',
                        isSelected
                          ? 'bg-brand-100 border border-brand-500/30 text-brand-600'
                          : 'bg-surface-50 border border-transparent text-surface-600 hover:bg-surface-50'
                      )}
                    >
                      <span className="truncate pr-2">{fileName}</span>
                      <PlayCircle className={cn(
                        "w-4 h-4 flex-shrink-0 transition-opacity",
                        isSelected ? "text-brand-500 opacity-100" : "text-surface-400 opacity-0 group-hover:opacity-100"
                      )} />
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: The Lesson */}
        <div className="lg:col-span-2">
          <div className="card h-full min-h-[600px] flex flex-col">
            <h3 className="font-semibold text-surface-900 border-b border-surface-200 pb-4 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-500" />
              Optimization Lesson
              {tutorMutation.variables && (
                <span className="text-xs font-normal text-surface-500 ml-2 bg-surface-50 px-2 py-1 rounded-md">
                  {tutorMutation.variables.filePath}
                </span>
              )}
            </h3>

            <div className="flex-1 overflow-y-auto">
              {tutorMutation.isPending ? (
                <div className="flex flex-col items-center justify-center h-full text-brand-500/50 space-y-4">
                  <Loader2 className="w-10 h-10 animate-spin" />
                  <p className="text-sm">Analyzing algorithms and writing your lesson...</p>
                </div>
              ) : tutorMutation.data ? (
                <div className="prose-light prose-sm max-w-none text-surface-700 marker:text-brand-500 prose-pre:bg-white prose-pre:border prose-pre:border-surface-200 prose-a:text-brand-500">
                  <ReactMarkdown>{tutorMutation.data.markdown_lesson}</ReactMarkdown>
                </div>
              ) : (
                <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.02} transitionSpeed={2000} glareEnable={true} glareMaxOpacity={0.05} glareColor="#3b82f6" glarePosition="all" className="h-full perspective-1000">
                  <div className="flex flex-col items-center justify-center h-full text-surface-400 text-sm text-center px-8 preserve-3d">
                    <BookOpen className="w-16 h-16 mb-4 opacity-20 animate-float-icon" />
                    <p>Select a file from the explorer on the left to generate an AI tutoring lesson on how to optimize its algorithms.</p>
                  </div>
                </Tilt>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
