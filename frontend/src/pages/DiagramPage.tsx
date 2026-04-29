import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Network, GitBranch, Loader2, Maximize2, Download } from "lucide-react"
import mermaid from "mermaid"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import Tilt from 'react-parallax-tilt'

mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  fontFamily: "Inter, sans-serif",
  themeVariables: {
    background: '#ffffff',
    mainBkg: '#ffffff',
    primaryColor: '#e0e7ff',
    primaryTextColor: '#0f172a',
    primaryBorderColor: '#cbd5e1',
    secondaryColor: '#f8fafc',
    tertiaryColor: '#eef2ff',
    lineColor: '#475569',
    textColor: '#0f172a',
    clusterBkg: '#f8fafc',
    clusterBorder: '#cbd5e1',
    noteBkg: '#fffbeb',
    noteTextColor: '#334155',
  },
})

export default function DiagramPage() {
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null)
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [rawMermaid, setRawMermaid] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: repoData, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get<{ repositories: any[] }>('/repos'),
  })
  const repos = repoData?.repositories || []
  const activeRepo = repos.find(r => r.id === selectedRepoId) || repos[0]

  const generateMutation = useMutation({
    mutationFn: (repoId: number) => 
      api.post<{ mermaid_code: string }>(`/helpers/repos/${repoId}/diagram`),
    onSuccess: async (data) => {
      setRawMermaid(data.mermaid_code)
      try {
        // Remove any old rendered element first
        const old = document.getElementById('architecture-diagram')
        if (old) old.remove()
        const { svg } = await mermaid.render('architecture-diagram', data.mermaid_code)
        setSvgContent(svg)
      } catch (err) {
        console.error("Mermaid parsing failed, showing raw code:", err)
        setSvgContent(null) // Will fall through to raw code display
      }
    }
  })

  const handleGenerate = () => {
    if (!activeRepo) return
    setSvgContent(null)
    setRawMermaid(null)
    generateMutation.mutate(activeRepo.id)
  }

  const handleDownload = () => {
    if (!svgContent) return
    const blob = new Blob([svgContent], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${activeRepo?.full_name.split('/')[1]}-architecture.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8 animate-fade-in h-[calc(100vh-8rem)] flex flex-col">
      <div className="border-b border-surface-200/60 pb-6 shrink-0">
        <div className="flex items-center gap-2 mb-2 text-surface-500">
          <span className="text-xs font-semibold tracking-wider uppercase">Visualization</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-surface-900 flex items-center gap-2.5">
          <Network className="w-7 h-7 text-brand-500" />
          Architecture Diagram
        </h1>
        <p className="text-sm text-surface-500 mt-2">
          Visualize your repository structure and component relationships with AI-generated diagrams.
        </p>
      </div>

      <div className="flex items-center justify-between shrink-0">
        <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Repository</div>

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
                  setSvgContent(null)
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

      <div className="flex-1 min-h-0 bg-surface-50 rounded-2xl border border-surface-200 relative overflow-hidden flex flex-col">
        {generateMutation.isIdle && !svgContent && (
          <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.02} transitionSpeed={2000} glareEnable={true} glareMaxOpacity={0.05} glareColor="#6366f1" glarePosition="all" className="flex-1 perspective-1000">
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 preserve-3d h-full">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500/20 to-purple-500/20 flex items-center justify-center mb-6 shadow-lg shadow-brand-500/20 animate-float-icon">
                <Network className="w-10 h-10 text-brand-500" />
              </div>
              <h2 className="text-xl font-bold text-surface-900 mb-2">Visualize Your Architecture</h2>
              <p className="text-surface-500 max-w-md mx-auto mb-8">
                We'll analyze the file structure and README of `{activeRepo?.full_name || 'repository'}` to generate a Mermaid.js diagram showing how components communicate.
              </p>
              <button
                onClick={handleGenerate}
                disabled={!activeRepo || generateMutation.isPending}
                className="btn-primary px-8 py-3 text-lg"
              >
                <Network className="w-5 h-5 mr-2" /> 
                Generate Diagram
              </button>
            </div>
          </Tilt>
        )}

        {generateMutation.isPending && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Loader2 className="w-10 h-10 animate-spin text-brand-500 mb-6" />
            <h2 className="text-xl font-bold text-surface-900 mb-2">Analyzing Codebase...</h2>
            <p className="text-surface-500 max-w-md mx-auto">
              Scanning directories and drafting Mermaid architecture flowchart.
            </p>
          </div>
        )}

        {svgContent && (
          <>
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <button
                onClick={handleDownload}
                className="btn-secondary py-1.5 px-3 text-xs bg-surface-50 border-surface-200 hover:bg-surface-800"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Download SVG
              </button>
              <button
                onClick={() => { generateMutation.reset(); setSvgContent(null); setRawMermaid(null); }}
                className="btn-secondary py-1.5 px-3 text-xs bg-surface-50 border-surface-200 hover:bg-surface-800"
              >
                <Network className="w-3.5 h-3.5 mr-1" />
                Regenerate
              </button>
            </div>
            <div 
              ref={containerRef}
              className="flex-1 overflow-auto p-8 flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </>
        )}

        {/* Fallback: show raw mermaid code if rendering failed */}
        {!svgContent && rawMermaid && generateMutation.isSuccess && (
          <div className="flex-1 flex flex-col p-6 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-yellow-400">⚠️ Diagram rendering failed. Showing raw Mermaid code:</p>
              <button
                onClick={handleGenerate}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                <Network className="w-3.5 h-3.5 mr-1" />
                Retry
              </button>
            </div>
            <pre className="flex-1 bg-white border border-surface-200 rounded-xl p-4 text-sm text-surface-700 font-mono whitespace-pre-wrap overflow-auto">{rawMermaid}</pre>
          </div>
        )}

        {generateMutation.isError && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-red-500/20 bg-red-500/5">
            <h2 className="text-lg font-bold text-red-400 mb-2">Failed to generate diagram</h2>
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
