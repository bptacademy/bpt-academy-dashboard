'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  BarChart2,
  CreditCard,
  MessageSquare,
  Video,
  Settings,
  Trophy,
  Layers,
  X,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/users',      icon: Users,            label: 'Users' },
  { href: '/divisions',  icon: Layers,           label: 'Divisions' },
  { href: '/programs',   icon: BookOpen,         label: 'Programs' },
  { href: '/attendance', icon: ClipboardList,    label: 'Attendance' },
  { href: '/reports',    icon: BarChart2,        label: 'Reports' },
  { href: '/tournaments',icon: Trophy,           label: 'Tournaments' },
  { href: '/payments',   icon: CreditCard,       label: 'Payments' },
  { href: '/messaging',  icon: MessageSquare,    label: 'Messaging' },
  { href: '/videos',     icon: Video,            label: 'Videos' },
  { href: '/settings',   icon: Settings,         label: 'Settings' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="font-bold text-gray-900">BPT Academy</span>
            </div>
            <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <Icon size={18} className={isActive ? 'text-green-600' : 'text-gray-400'} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="px-6 py-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">BPT Academy v1.0</p>
          </div>
        </div>
      </aside>
    </>
  )
}
