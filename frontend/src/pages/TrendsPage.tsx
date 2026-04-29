import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, GitBranch, Calendar } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'
import { CardSkeleton } from '@/components/Skeletons'
import type { RepoListResponse, TrendSeriesResponse } from '@/types/api'

const PERIODS = [
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '1y', label: '1 Year' },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-3 text-xs border border-white/[0.1]">
      <p className="text-surface-500 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-surface-500">{p.name}:</span>
          <span className="text-surface-900 font-medium">{p.value?.toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}

export default function TrendsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedRepoId = searchParams.get('repo')
  const [period, setPeriod] = useState('90d')

  const { data: repoData } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get<RepoListResponse>('/repos'),
  })
  const repos = repoData?.repositories || []
  const activeRepoId = selectedRepoId ? parseInt(selectedRepoId) : repos[0]?.id

  const { data: trendData, isLoading } = useQuery({
    queryKey: ['trends', activeRepoId, period],
    queryFn: () => api.get<TrendSeriesResponse>(`/trends/${activeRepoId}?period=${period}`),
    enabled: !!activeRepoId,
  })

  const chartData = (trendData?.points || []).map((p) => ({
    date: new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Overall: p.overall_score,
    Complexity: p.complexity_score,
    Duplication: p.duplication_score,
    Security: p.security_score,
    'Test Coverage': p.test_coverage_score,
    'Debt Hours': p.total_estimated_debt_hours,
  }))

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-surface-200/60 pb-6">
        <div className="flex items-center gap-2 mb-2 text-surface-500">
          <span className="text-xs font-semibold tracking-wider uppercase">Analytics</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-surface-900 flex items-center gap-2.5">
          <TrendingUp className="w-7 h-7 text-brand-500" />
          Debt Trends
        </h1>
        <p className="text-sm text-surface-500 mt-2">
          Monitor technical debt patterns and improvements across your repositories.
        </p>
      </div>

      {/* Repo + period selectors */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex gap-2 flex-wrap flex-1">
          {repos.map((repo) => (
            <button
              key={repo.id}
              onClick={() => setSearchParams({ repo: String(repo.id) })}
              className={cn(
                'badge transition-all',
                activeRepoId === repo.id
                  ? 'bg-brand-100 text-brand-600 border border-brand-500/30'
                  : 'bg-surface-50 text-surface-500 border border-surface-200 hover:bg-surface-100'
              )}
            >
              <GitBranch className="w-3 h-3" />
              {repo.full_name.split('/')[1]}
            </button>
          ))}
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-surface-50 border border-surface-200">
          {PERIODS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                period === value
                  ? 'bg-brand-100 text-brand-600'
                  : 'text-surface-500 hover:text-surface-900'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      {isLoading ? (
        <div className="grid gap-6">
          <CardSkeleton lines={8} />
          <CardSkeleton lines={8} />
        </div>
      ) : chartData.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No trend data"
          description="Run at least two analyses on this repo to see trends."
        />
      ) : (
        <div className="space-y-6">
          {/* Overall score trend */}
          <div className="card">
            <h3 className="text-sm font-semibold text-surface-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-500" />
              Overall Debt Score
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="Overall"
                    stroke="#6366f1"
                    fillOpacity={1}
                    fill="url(#colorOverall)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#6366f1', stroke: '#1e1b4b', strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="card">
            <h3 className="text-sm font-semibold text-surface-900 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-pink-400" />
              Category Scores Over Time
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Line type="monotone" dataKey="Complexity" stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Duplication" stroke="#eab308" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Security" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Test Coverage" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Estimated debt hours */}
          <div className="card">
            <h3 className="text-sm font-semibold text-surface-900 mb-4">
              ⏱ Estimated Debt Hours
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="Debt Hours"
                    stroke="#ec4899"
                    fillOpacity={1}
                    fill="url(#colorHours)"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
