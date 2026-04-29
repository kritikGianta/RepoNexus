import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  // Backend stores UTC timestamps without Z suffix; ensure JS interprets as UTC
  let normalized = dateStr
  if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('T')) {
    normalized = dateStr + 'Z'
  } else if (dateStr.includes('T') && !dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', dateStr.indexOf('T'))) {
    normalized = dateStr + 'Z'
  }
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(normalized))
}

export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(dateStr)
}

export function debtScoreColor(score: number | null | undefined): string {
  if (score == null) return 'text-surface-400'
  if (score >= 80) return 'text-red-500'
  if (score >= 60) return 'text-orange-500'
  if (score >= 40) return 'text-amber-500'
  if (score >= 20) return 'text-emerald-500'
  return 'text-green-500'
}

export function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'badge-critical'
    case 'high':     return 'badge-high'
    case 'medium':   return 'badge-medium'
    case 'low':      return 'badge-low'
    default:         return 'badge-low'
  }
}

export function categoryLabel(cat: string): string {
  return cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function statusColor(status: string): string {
  switch (status) {
    case 'completed': return 'text-emerald-500'
    case 'running':   return 'text-brand-500'
    case 'queued':    return 'text-amber-500'
    case 'failed':    return 'text-red-500'
    default:          return 'text-surface-400'
  }
}

export function statusDotColor(status: string): string {
  switch (status) {
    case 'completed': return 'bg-emerald-400'
    case 'running':   return 'bg-brand-400 animate-pulse'
    case 'queued':    return 'bg-amber-400 animate-pulse-slow'
    case 'failed':    return 'bg-red-400'
    default:          return 'bg-surface-300'
  }
}
