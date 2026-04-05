'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils'
import { Send, Plus, X, Users } from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { DIVISIONS, DIVISION_LABELS } from '@/lib/constants'

interface Conversation {
  id: string
  title: string | null
  type: string
  created_at: string
}

interface Message {
  id: string
  content: string
  created_at: string
  sender_id: string
  sender_name?: string
}

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
}

export default function MessagingPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showNewConv, setShowNewConv] = useState(false)
  const [users, setUsers] = useState<Profile[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [convTitle, setConvTitle] = useState('')
  const [convType, setConvType] = useState<'direct' | 'group' | 'announcement'>('direct')
  const [announcementDivision, setAnnouncementDivision] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const msgChannelRef = useRef<RealtimeChannel | null>(null)
  const convChannelRef = useRef<RealtimeChannel | null>(null)
  // Cache sender names to avoid re-fetching on each realtime event
  const senderNamesRef = useRef<Record<string, string>>({})
  const selectedConvRef = useRef<Conversation | null>(null)

  // Keep ref in sync with state (needed inside realtime callbacks)
  useEffect(() => {
    selectedConvRef.current = selectedConv
  }, [selectedConv])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Load all messages for a conversation (single query with join) ────────
  const fetchMessages = useCallback(async (convId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('messages')
      .select('id, content, created_at, sender_id')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })

    if (!data) return []

    // Batch-fetch any sender names we don't have cached
    const allSenderIds = data.map((m) => m.sender_id)
    const uniqueSenderIds = allSenderIds.filter((id, i, arr) => arr.indexOf(id) === i)
    const unknownIds = uniqueSenderIds.filter((id) => !senderNamesRef.current[id])
    if (unknownIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', unknownIds)
      if (profiles) {
        for (const p of profiles as { id: string; full_name: string }[]) {
          senderNamesRef.current[p.id] = p.full_name || 'Unknown'
        }
      }
    }

    return data.map((m) => ({
      ...m,
      sender_name: senderNamesRef.current[m.sender_id] || 'Unknown',
    }))
  }, [])

  // ── Subscribe to realtime messages for the selected conversation ─────────
  const subscribeToMessages = useCallback(
    (conv: Conversation) => {
      const supabase = createClient()

      // Unsubscribe previous channel
      if (msgChannelRef.current) {
        supabase.removeChannel(msgChannelRef.current)
        msgChannelRef.current = null
      }

      const channel = supabase
        .channel(`messages:${conv.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conv.id}`,
          },
          async (payload) => {
            const raw = payload.new as {
              id: string
              content: string
              created_at: string
              sender_id: string
            }

            // Resolve sender name (cached or fetch)
            if (!senderNamesRef.current[raw.sender_id]) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', raw.sender_id)
                .single()
              senderNamesRef.current[raw.sender_id] =
                (profile as { full_name?: string } | null)?.full_name || 'Unknown'
            }

            const newMsg: Message = {
              ...raw,
              sender_name: senderNamesRef.current[raw.sender_id],
            }

            setMessages((prev) => {
              // Deduplicate by id
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          }
        )
        .subscribe()

      msgChannelRef.current = channel
    },
    []
  )

  // ── Load conversations + subscribe to new ones ───────────────────────────
  const loadConversations = useCallback(async (userId: string) => {
    const supabase = createClient()

    const { data: memberConvs } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId)

    let convData: Conversation[] = []

    if (memberConvs && memberConvs.length > 0) {
      const convIds = memberConvs.map((m: { conversation_id: string }) => m.conversation_id)
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .in('id', convIds)
        .order('created_at', { ascending: false })
      convData = (data as Conversation[]) || []
    } else {
      // Admins: show all
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false })
      convData = (data as Conversation[]) || []
    }

    setConversations(convData)
    return convData
  }, [])

  // ── Subscribe to new conversations appearing ─────────────────────────────
  const subscribeToConversations = useCallback((userId: string) => {
    const supabase = createClient()

    if (convChannelRef.current) {
      supabase.removeChannel(convChannelRef.current)
    }

    const channel = supabase
      .channel('conversations:new')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        () => {
          // Re-fetch conversations list when a new one is created
          loadConversations(userId)
        }
      )
      .subscribe()

    convChannelRef.current = channel
  }, [loadConversations])

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      setLoading(true)
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      const uid = user?.id || ''
      if (uid) setCurrentUserId(uid)

      await loadConversations(uid)
      subscribeToConversations(uid)

      // Load users for new conversation modal
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .order('full_name')
      setUsers((usersData as Profile[]) || [])

      setLoading(false)
    }

    init()

    return () => {
      const supabase = createClient()
      if (msgChannelRef.current) supabase.removeChannel(msgChannelRef.current)
      if (convChannelRef.current) supabase.removeChannel(convChannelRef.current)
    }
  }, [loadConversations, subscribeToConversations])

  // ── Select a conversation ────────────────────────────────────────────────
  async function selectConversation(conv: Conversation) {
    setSelectedConv(conv)
    setMessages([])
    const msgs = await fetchMessages(conv.id)
    setMessages(msgs)
    subscribeToMessages(conv)
  }

  // ── Send a message ───────────────────────────────────────────────────────
  async function sendMessage() {
    if (!newMessage.trim() || !selectedConv) return
    setSending(true)
    const supabase = createClient()

    await supabase.from('messages').insert({
      conversation_id: selectedConv.id,
      sender_id: currentUserId,
      content: newMessage.trim(),
    })

    setNewMessage('')
    setSending(false)
    // Realtime will handle appending the message — no need to re-fetch
  }

  // ── Create a new conversation ────────────────────────────────────────────
  async function createConversation() {
    const supabase = createClient()
    let recipients = [...selectedRecipients]

    if (convType === 'announcement' && announcementDivision) {
      const { data: divUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('division', announcementDivision)
        .eq('role', 'student')
      if (divUsers) {
        const divIds = (divUsers as { id: string }[]).map((u) => u.id)
        const combined = [...recipients, ...divIds]
        recipients = combined.filter((id, index) => combined.indexOf(id) === index)
      }
    }

    const { data: conv } = await supabase
      .from('conversations')
      .insert({
        title: convTitle || null,
        type: convType,
        created_by: currentUserId,
      })
      .select()
      .single()

    if (conv) {
      const members = [
        { conversation_id: (conv as { id: string }).id, user_id: currentUserId },
        ...recipients.map((id) => ({
          conversation_id: (conv as { id: string }).id,
          user_id: id,
        })),
      ]
      await supabase.from('conversation_members').insert(members)

      setShowNewConv(false)
      setSelectedRecipients([])
      setConvTitle('')
      setConvType('direct')
      setAnnouncementDivision('')

      await loadConversations(currentUserId)
      await selectConversation(conv as Conversation)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messaging</h1>
          <p className="text-gray-500 text-sm mt-1">
            Direct messages and group announcements · <span className="text-green-600 font-medium">● Live</span>
          </p>
        </div>
        <button
          onClick={() => setShowNewConv(true)}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={16} />
          New Message
        </button>
      </div>

      <div className="flex gap-6 h-[calc(100vh-240px)] min-h-[500px]">
        {/* Conversation list */}
        <div className="w-72 shrink-0 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800 text-sm">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm px-4">
                No conversations yet. Start one!
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${
                    selectedConv?.id === conv.id ? 'bg-green-50 border-l-2 border-l-green-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {conv.title || `${conv.type} conversation`}
                    </p>
                    <span className="text-xs text-gray-400 capitalize shrink-0">
                      {conv.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {formatDateTime(conv.created_at)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Messages panel */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a conversation to view messages</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {selectedConv.title || `${selectedConv.type} conversation`}
                  </h2>
                  <p className="text-xs text-gray-400 capitalize mt-0.5">
                    {selectedConv.type}
                  </p>
                </div>
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse" />
                  Live
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-8">
                    No messages yet
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender_id === currentUserId
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                      >
                        <p className="text-xs text-gray-400 mb-1">
                          {isOwn ? 'You' : msg.sender_name}
                        </p>
                        <div
                          className={`max-w-md px-4 py-3 rounded-2xl text-sm ${
                            isOwn
                              ? 'bg-green-500 text-white rounded-tr-sm'
                              : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <p className="text-xs text-gray-300 mt-1">
                          {formatDateTime(msg.created_at)}
                        </p>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder="Type a message…"
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <Send size={16} />
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewConv && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">New Conversation</h2>
              <button
                onClick={() => setShowNewConv(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={convType}
                  onChange={(e) =>
                    setConvType(e.target.value as 'direct' | 'group' | 'announcement')
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="direct">Direct Message</option>
                  <option value="group">Group Channel</option>
                  <option value="announcement">Division Announcement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={convTitle}
                  onChange={(e) => setConvTitle(e.target.value)}
                  placeholder="Conversation title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {convType === 'announcement' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                  <select
                    value={announcementDivision}
                    onChange={(e) => setAnnouncementDivision(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    <option value="">All Divisions</option>
                    {DIVISIONS.map((d) => (
                      <option key={d} value={d}>
                        {DIVISION_LABELS[d]}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipients</label>
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg divide-y divide-gray-100">
                  {users.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRecipients.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRecipients([...selectedRecipients, user.id])
                          } else {
                            setSelectedRecipients(
                              selectedRecipients.filter((id) => id !== user.id)
                            )
                          }
                        }}
                        className="rounded border-gray-300 text-green-500 focus:ring-green-500"
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 truncate">{user.full_name}</p>
                        <p className="text-xs text-gray-400 capitalize">
                          {user.role} · {user.email}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewConv(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createConversation}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
