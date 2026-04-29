import { AlertTriangle, Inbox } from 'lucide-react'
import Tilt from 'react-parallax-tilt'

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: typeof Inbox
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in perspective-1000">
      <Tilt tiltMaxAngleX={15} tiltMaxAngleY={15} scale={1.1} transitionSpeed={2000} glareEnable={true} glareMaxOpacity={0.1} glareColor="#ffffff" glarePosition="all" className="mb-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-50 border border-surface-200 flex items-center justify-center">
          <Icon className="w-7 h-7 text-surface-400" />
        </div>
      </Tilt>
      <h3 className="text-lg font-semibold text-surface-900 mb-1">{title}</h3>
      <p className="text-sm text-surface-500 text-center max-w-sm mb-4">{description}</p>
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in perspective-1000">
      <Tilt tiltMaxAngleX={15} tiltMaxAngleY={15} scale={1.1} transitionSpeed={2000} glareEnable={true} glareMaxOpacity={0.2} glareColor="#ef4444" glarePosition="all" className="mb-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
      </Tilt>
      <h3 className="text-lg font-semibold text-surface-900 mb-1">Something went wrong</h3>
      <p className="text-sm text-surface-500 text-center max-w-sm mb-4">
        {message || 'An unexpected error occurred. Please try again.'}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary">
          Retry
        </button>
      )}
    </div>
  )
}
