'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'
import { Menu, LogOut } from 'lucide-react'
import { NotificationsBell } from './notifications-bell'

interface HeaderProps {
  user: {
    full_name: string
    email: string
    role: string
    avatar_url?: string | null
  }
  onMenuClick: () => void
}

export function Header({ user, onMenuClick }: HeaderProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      {/* Left: hamburger + page context */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-gray-500 hover:text-gray-700 p-1"
      >
        <Menu size={22} />
      </button>

      {/* Right: actions + user */}
      <div className="flex items-center gap-3 ml-auto">
        <NotificationsBell />

        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center overflow-hidden">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-xs font-medium">
                {getInitials(user.full_name || user.email)}
              </span>
            )}
          </div>

          {/* Name + role */}
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-none">
              {user.full_name || user.email}
            </p>
            <p className="text-xs text-gray-400 capitalize mt-0.5">
              {user.role.replace('_', ' ')}
            </p>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
