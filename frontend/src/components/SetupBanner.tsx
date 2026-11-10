import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'

export interface SystemStatus {
  version: string
  environment: string
  ai_configured: boolean
  github_oauth_configured: boolean
  task_execution_mode: string
  mlflow_enabled: boolean
}

export function useSystemStatus() {
  return useQuery({
    queryKey: ['system-status'],
    queryFn: () => api.get<SystemStatus>('/system/status'),
    staleTime: 5 * 60_000,
    retry: false,
  })
}

/** Tells the operator which integrations still need credentials in backend/.env. */
export default function SetupBanner({ className = '' }: { className?: string }) {
  const { data } = useSystemStatus()
  if (!data) return null

  const missing: string[] = []
  if (!data.github_oauth_configured) missing.push('GitHub OAuth (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET)')
  if (!data.ai_configured) missing.push('Groq AI (GROQ_API_KEY)')
  if (missing.length === 0) return null

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium text-amber-900">Setup incomplete</p>
        <p className="text-amber-800">
          Add {missing.join(' and ')} to <code className="font-mono">backend/.env</code>, then run{' '}
          <code className="font-mono">docker compose up -d</code>.
          {!data.ai_configured && ' AI-powered features stay disabled until then; static analysis still works.'}
        </p>
      </div>
    </div>
  )
}
