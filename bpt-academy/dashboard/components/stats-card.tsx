import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: {
    value: number
    positive: boolean
  }
  className?: string
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-4',
        className
      )}
    >
      <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
        <Icon size={22} className="text-green-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {description && (
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        )}
        {trend && (
          <p
            className={cn(
              'text-xs mt-1 font-medium',
              trend.positive ? 'text-green-600' : 'text-red-500'
            )}
          >
            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}% vs last month
          </p>
        )}
      </div>
    </div>
  )
}
