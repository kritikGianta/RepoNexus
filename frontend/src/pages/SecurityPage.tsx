import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { ShieldAlert, GitBranch, Loader2, ShieldCheck, AlertTriangle, AlertCircle, FileWarning } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import Tilt from 'react-parallax-tilt'

interface SecurityIssue {
  severity: "Critical" | "High" | "Medium" | "Low";
  file: string;
  issue: string;
  fix: string;
}

export default function SecurityPage() {
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null)

  const { data: repoData, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get<{ repositories: any[] }>('/repos'),
  })
  const repos = repoData?.repositories || []
  const activeRepo = repos.find(r => r.id === selectedRepoId) || repos[0]

  const scanMutation = useMutation({
    mutationFn: (repoId: number) => 
      api.post<{ issues: SecurityIssue[] }>(`/helpers/repos/${repoId}/security-scan`),
  })

  const handleScan = () => {
    if (!activeRepo) return
    scanMutation.mutate(activeRepo.id)
  }

  const getSeverityIcon = (severity: string) => {
    switch(severity) {
      case 'Critical': return <ShieldAlert className="w-5 h-5 text-red-500" />
      case 'High': return <AlertTriangle className="w-5 h-5 text-orange-500" />
      case 'Medium': return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'Low': return <FileWarning className="w-5 h-5 text-blue-400" />
      default: return <AlertCircle className="w-5 h-5 text-surface-400" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'Critical': return 'bg-red-500/10 border-red-500/20 text-red-400'
      case 'High': return 'bg-orange-500/10 border-orange-500/20 text-orange-400'
      case 'Medium': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
      case 'Low': return 'bg-blue-500/10 border-blue-500/20 text-blue-400'
      default: return 'bg-surface-500/10 border-surface-500/20 text-surface-400'
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="border-b border-surface-200/60 pb-6">
        <div className="flex items-center gap-2 mb-2 text-surface-500">
          <span className="text-xs font-semibold tracking-wider uppercase">Security</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-surface-900 flex items-center gap-2.5">
          <ShieldAlert className="w-7 h-7 text-brand-500" />
          Security Audit
        </h1>
        <p className="text-sm text-surface-500 mt-2">
          Identify vulnerabilities, misconfigurations, and security risks in your codebase.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-2">
          {reposLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
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
        {scanMutation.isIdle && (
          <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.02} transitionSpeed={2000} glareEnable={true} glareMaxOpacity={0.05} glareColor="#ef4444" glarePosition="all" className="perspective-1000">
            <div className="card flex flex-col items-center justify-center min-h-[400px] text-center p-8 preserve-3d">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-brand-500/20 flex items-center justify-center mb-6 shadow-lg shadow-brand-500/20 animate-float-icon">
                <ShieldAlert className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-surface-900 mb-2">Run Security Scan</h2>
              <p className="text-surface-500 max-w-md mx-auto mb-8">
                We'll analyze your package manifests, config files, and env templates to flag outdated packages, CVEs, and hardcoded secrets.
              </p>
              <button
                onClick={handleScan}
                disabled={!activeRepo || scanMutation.isPending}
                className="btn-primary px-8 py-3 text-lg bg-red-500 hover:bg-red-600 border-red-400"
              >
                <ShieldAlert className="w-5 h-5 mr-2" /> 
                Start Audit
              </button>
            </div>
          </Tilt>
        )}

        {scanMutation.isPending && (
          <div className="card flex flex-col items-center justify-center min-h-[400px] text-center p-8">
            <Loader2 className="w-10 h-10 animate-spin text-red-400 mb-6" />
            <h2 className="text-xl font-bold text-surface-900 mb-2">Scanning Environment...</h2>
            <p className="text-surface-500 max-w-md mx-auto">
              Checking dependencies against known vulnerability databases and scanning for secrets.
            </p>
          </div>
        )}

        {scanMutation.isSuccess && scanMutation.data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-surface-200">
              <div className="flex items-center gap-3">
                {scanMutation.data.issues.length === 0 ? (
                  <ShieldCheck className="w-8 h-8 text-green-400" />
                ) : (
                  <ShieldAlert className="w-8 h-8 text-red-400" />
                )}
                <div>
                  <h3 className="font-bold text-surface-900">Scan Complete</h3>
                  <p className="text-sm text-surface-500">
                    {scanMutation.data.issues.length} vulnerabilit{scanMutation.data.issues.length === 1 ? 'y' : 'ies'} found
                  </p>
                </div>
              </div>
              <button onClick={() => scanMutation.reset()} className="btn-secondary text-xs py-1.5">
                New Scan
              </button>
            </div>

            {scanMutation.data.issues.length === 0 ? (
              <div className="card text-center p-12 border-green-500/20 bg-green-500/5">
                <ShieldCheck className="w-16 h-16 text-green-400 mx-auto mb-4 opacity-80" />
                <h3 className="text-xl font-bold text-green-400 mb-2">All clear!</h3>
                <p className="text-green-400/60">No vulnerabilities or exposed secrets were found in your configuration files.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {scanMutation.data.issues.map((issue, idx) => (
                  <div key={idx} className="card p-5 border-l-4 border-l-transparent flex flex-col sm:flex-row gap-4 items-start" style={{ borderLeftColor: issue.severity === 'Critical' ? '#ef4444' : issue.severity === 'High' ? '#f97316' : issue.severity === 'Medium' ? '#eab308' : '#3b82f6' }}>
                    <div className="mt-1 shrink-0">
                      {getSeverityIcon(issue.severity)}
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="font-bold text-surface-900 text-lg">{issue.issue}</h4>
                        <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border whitespace-nowrap", getSeverityColor(issue.severity))}>
                          {issue.severity}
                        </span>
                      </div>
                      
                      <div className="text-sm text-surface-600 bg-surface-50 p-3 rounded-lg border border-surface-100">
                        <span className="font-semibold text-brand-600 mr-2">File:</span>
                        <code className="text-xs bg-black/40 px-1.5 py-0.5 rounded">{issue.file}</code>
                      </div>
                      
                      <div className="text-sm text-surface-600 bg-green-500/5 p-3 rounded-lg border border-green-500/10 mt-2">
                        <span className="font-semibold text-green-400 block mb-1">Recommended Fix:</span>
                        {issue.fix}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {scanMutation.isError && (
          <div className="card flex flex-col items-center justify-center min-h-[200px] text-center p-8 border-red-500/20 bg-red-500/5">
            <h2 className="text-lg font-bold text-red-400 mb-2">Audit Failed</h2>
            <p className="text-surface-500 text-sm mb-4">
              {scanMutation.error instanceof Error ? scanMutation.error.message : 'Unknown error occurred'}
            </p>
            <button onClick={handleScan} className="btn-secondary border-red-500/20 hover:bg-red-500/10 text-red-300">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
