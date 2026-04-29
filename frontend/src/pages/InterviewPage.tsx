import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Target, GitBranch, Loader2, Code2, MessageSquare, Award, RefreshCw, Send, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import Tilt from 'react-parallax-tilt'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { RepoListResponse, InterviewGenerateResponse, InterviewEvaluateResponse, InterviewQuestion } from '@/types/api'

export default function InterviewPage() {
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [interviewState, setInterviewState] = useState<'idle' | 'question_selection' | 'answering' | 'feedback'>('idle')

  const { data: repoData, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get<RepoListResponse>('/repos'),
  })
  const repos = repoData?.repositories || []
  const activeRepo = repos.find((r) => r.id === selectedRepoId) || repos[0]

  const generateMutation = useMutation({
    mutationFn: (repoId: number) => api.post<InterviewGenerateResponse>(`/helpers/repos/${repoId}/interview/generate`),
    onSuccess: () => {
      setInterviewState('question_selection')
      setUserAnswer('')
      setSelectedQuestion(null)
    },
    onError: () => toast.error('Failed to generate interview questions.'),
  })

  const evaluateMutation = useMutation({
    mutationFn: ({ repoId, question, codeSnippet, answer }: { repoId: number, question: string, codeSnippet: string, answer: string }) =>
      api.post<InterviewEvaluateResponse>(`/helpers/repos/${repoId}/interview/evaluate`, { 
        question, 
        code_snippet: codeSnippet, 
        user_answer: answer 
      }),
    onSuccess: () => {
      setInterviewState('feedback')
    },
    onError: () => toast.error('Failed to evaluate answer.'),
  })

  const handleStart = () => {
    if (!activeRepo) return
    generateMutation.mutate(activeRepo.id)
  }

  const handleSelectQuestion = (q: string) => {
    setSelectedQuestion(q)
    setInterviewState('answering')
  }

  const handleSubmit = () => {
    if (!activeRepo || !generateMutation.data || !userAnswer.trim() || !selectedQuestion) return
    evaluateMutation.mutate({
      repoId: activeRepo.id,
      question: selectedQuestion,
      codeSnippet: generateMutation.data.code_snippet,
      answer: userAnswer
    })
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="border-b border-surface-200/60 pb-6">
        <div className="flex items-center gap-2 mb-2 text-surface-500">
          <span className="text-xs font-semibold tracking-wider uppercase">Learning</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-surface-900 flex items-center gap-2.5">
          <Target className="w-7 h-7 text-brand-500" />
          Interview Prep
        </h1>
        <p className="text-sm text-surface-500 mt-2">
          Practice technical interviews with AI-generated questions based on your codebase.
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
                onClick={() => {
                  setSelectedRepoId(repo.id)
                  setInterviewState('idle')
                  generateMutation.reset()
                  evaluateMutation.reset()
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

      {interviewState === 'idle' && (
        <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.02} transitionSpeed={2000} glareEnable={true} glareMaxOpacity={0.05} glareColor="#ec4899" glarePosition="all" className="perspective-1000">
          <div className="card flex flex-col items-center justify-center min-h-[400px] text-center p-8 preserve-3d">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500/20 to-pink-500/20 flex items-center justify-center mb-6 shadow-lg shadow-brand-500/20 animate-float-icon">
              <MessageSquare className="w-10 h-10 text-brand-500" />
            </div>
            <h2 className="text-xl font-bold text-surface-900 mb-2">Ready for your Mock Interview?</h2>
            <p className="text-surface-500 max-w-md mx-auto mb-8">
              The AI will analyze the complete architecture and scope of {activeRepo?.full_name || 'your repo'} and generate architectural questions at 3 different difficulty levels.
            </p>
            <button
              onClick={handleStart}
              disabled={!activeRepo || generateMutation.isPending}
              className="btn-primary px-8 py-3 text-lg"
            >
              {generateMutation.isPending ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Analyzing Project...</>
              ) : (
                <><Target className="w-5 h-5 mr-2" /> Start Interview</>
              )}
            </button>
          </div>
        </Tilt>
      )}

      {interviewState !== 'idle' && generateMutation.data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="card bg-surface-50">
              <h3 className="font-semibold text-surface-600 flex items-center gap-2 mb-4 text-sm">
                <Code2 className="w-4 h-4" />
                Context: {generateMutation.data.file_path}
              </h3>
              <div className="bg-white rounded-xl border border-surface-200 overflow-hidden max-h-[300px] overflow-y-auto">
                <pre className="text-xs p-4 text-surface-600/80 font-mono whitespace-pre-wrap">
                  {generateMutation.data.code_snippet}
                </pre>
              </div>
            </div>

            {interviewState === 'question_selection' && (
              <div className="card space-y-4">
                <h3 className="font-semibold text-surface-900">Select a Question Difficulty</h3>
                <div className="space-y-3">
                  {generateMutation.data.questions?.map((q: InterviewQuestion, i: number) => (
                    <button
                      key={i}
                      onClick={() => handleSelectQuestion(q.question)}
                      className="w-full text-left p-4 rounded-xl border border-surface-200 bg-surface-50 hover:bg-surface-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded-full",
                          q.level === 'Easy' ? "bg-green-500/20 text-green-400" :
                          q.level === 'Medium' ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-red-500/20 text-red-400"
                        )}>
                          {q.level}
                        </span>
                      </div>
                      <p className="text-sm text-surface-700">{q.question}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {interviewState === 'answering' ? (
              <div className="card flex flex-col h-full min-h-[400px]">
                <h3 className="font-semibold text-brand-500 mb-2">Interviewer Question</h3>
                <p className="text-sm text-surface-700 mb-6 bg-surface-50 p-4 rounded-xl border border-surface-200">{selectedQuestion}</p>
                <h3 className="font-semibold text-surface-900 mb-4">Your Answer</h3>
                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your explanation here. Try to be as detailed and accurate as possible..."
                  className="input flex-1 resize-none font-sans leading-relaxed p-4"
                />
                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={!userAnswer.trim() || evaluateMutation.isPending}
                    className="btn-primary"
                  >
                    {evaluateMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Evaluating...</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" /> Submit Answer</>
                    )}
                  </button>
                </div>
              </div>
            ) : interviewState === 'feedback' && evaluateMutation.data ? (
              <div className="card h-full flex flex-col animate-fade-in border-green-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Award className="w-40 h-40 text-green-500" />
                </div>
                
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <h3 className="font-semibold text-surface-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    Interviewer Feedback
                  </h3>
                  <div className="flex items-baseline gap-1 bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20">
                    <span className="text-2xl font-bold text-green-400">{evaluateMutation.data.score}</span>
                    <span className="text-xs font-medium text-green-400/60">/ 10</span>
                  </div>
                </div>

                <div className="prose-light prose-sm text-surface-600 flex-1 relative z-10">
                  <ReactMarkdown>{evaluateMutation.data.feedback}</ReactMarkdown>
                </div>

                <div className="mt-8 pt-4 border-t border-surface-200 flex justify-between items-center relative z-10">
                  <div className="text-xs text-surface-400">
                    Your Answer:<br/>
                    <span className="italic truncate block max-w-xs">{userAnswer}</span>
                  </div>
                  <button
                    onClick={handleStart}
                    disabled={generateMutation.isPending}
                    className="btn-secondary"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Next Question
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
