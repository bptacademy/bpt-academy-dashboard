'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface NotificationRow {
  id: string
  title: string
  body?: string | null
  type?: string | null
  data?: Record<string, unknown> | null
  read: boolean
  created_at: string
  expires_at?: string | null
}

function relativeTime(dateStr: string): string {
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (
    then.getDate() === yesterday.getDate() &&
    then.getMonth() === yesterday.getMonth() &&
    then.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday'
  }
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const unreadCount = notifications.filter(n => !n.read).length

  // Fetch user then notifications
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (data) {
        const now = new Date()
        const filtered = (data as NotificationRow[]).filter(
          n => !n.expires_at || new Date(n.expires_at) > now
        )
        setNotifications(filtered)
      }
    }
    init()
  }, [])

  // Realtime subscription
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`web-notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        async () => {
          const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('recipient_id', userId)
            .order('created_at', { ascending: false })
            .limit(20)
          if (data) {
            const now = new Date()
            const filtered = (data as NotificationRow[]).filter(
              n => !n.expires_at || new Date(n.expires_at) > now
            )
            setNotifications(filtered)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length === 0) return
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white shadow-lg rounded-xl border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900 text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-green-600 hover:text-green-700"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No notifications</div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 cursor-pointer border-l-[3px] transition-colors ${
                    n.read ? 'bg-gray-50 border-l-gray-200' : 'bg-white border-l-green-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm flex-1 ${n.read ? 'font-normal text-gray-700' : 'font-semibold text-gray-900'}`}>
                      {n.title}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                      {relativeTime(n.created_at)}
                    </span>
                  </div>
                  {n.body && (
                    <p className="text-sm text-gray-500 truncate mt-0.5">{n.body}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
