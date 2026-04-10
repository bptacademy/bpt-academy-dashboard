'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils'
import { Send, Plus, X, Users, Megaphone, Trash2, MessageSquare } from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { DIVISIONS, DIVISION_LABELS } from '@/lib/constants'

interface Conversation {
  id: string
  title: string | null
  conversation_type: string | null
  is_group: boolean
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
  role: string
}

interface Member {
  profile_id: string
  full_name: string
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
  const [showAnnounce, setShowAnnounce] = useState(false)
  const [users, setUsers] = useState<Profile[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [convTitle, setConvTitle] = useState('')
  const [convType, setConvType] = useState<'direct' | 'group' | 'announcement'>('direct')
  const [announcementDivision, setAnnouncementDivision] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [convError, setConvError] = useState('')
  const [creating, setCreating] = useState(false)
  const [announceDivision, setAnnounceDivision] = useState('')
  const [announceMessage, setAnnounceMessage] = useState('')
  const [announcing, setAnnouncing] = useState(false)
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [dmNames, setDmNames] = useState<Record<string, string>>({})

  // Members panel state
  const [showMembers, setShowMembers] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const msgChannelRef = useRef<RealtimeChannel | null>(null)
  const convChannelRef = useRef<RealtimeChannel | null>(null)
  const senderNamesRef = useRef<Record<string, string>>({})
  const selectedConvRef = useRef<Conversation | null>(null)

  useEffect(() => { selectedConvRef.current = selectedConv }, [selectedConv])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // ── Fetch members for a group conversation ───────────────────────────────
  const fetchMembers = useCallback(async (convId: string) => {
    setMembersLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('conversation_members')
      .select('profile_id, profiles:profile_id(full_name, role)')
      .eq('conversation_id', convId)

    if (data) {
      const parsed: Member[] = data.map((m: any) => ({
        profile_id: m.profile_id,
        full_name: (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles)?.full_name ?? 'Unknown',
        role: (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles)?.role ?? 'student',
      }))
      // Coaches/admins first, then students, both alphabetical
      parsed.sort((a, b) => {
        const aIsCoach = ['coach', 'admin', 'super_admin'].includes(a.role)
        const bIsCoach = ['coach', 'admin', 'super_admin'].includes(b.role)
        if (aIsCoach && !bIsCoach) return -1
        if (!aIsCoach && bIsCoach) return 1
        return a.full_name.localeCompare(b.full_name)
      })
      setMembers(parsed)
    }
    setMembersLoading(false)
  }, [])

  // ── Start a DM with a member ─────────────────────────────────────────────
  const handleDM = async (member: Member) => {
    if (member.profile_id === currentUserId) return
    const supabase = createClient()
    const { data: convId, error } = await supabase
      .rpc('create_direct_conversation', { p_recipient_id: member.profile_id })

    if (error || !convId) return

    // Find or reload conversation
    await loadConversations(currentUserId)
    const { data: conv } = await supabase.from('conversations').select('*').eq('id', convId).single()
    if (conv) {
      setShowMembers(false)
      await selectConversation(conv as Conversation)
    }
  }

  const isGroupConv = (conv: Conversation | null) =>
    conv?.conversation_type !== 'direct'

  const fetchMessages = useCallback(async (convId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('messages')
      .select('id, content, created_at, sender_id')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })

    if (!data) return []

    const allSenderIds = data.map((m) => m.sender_id)
    const uniqueSenderIds = allSenderIds.filter((id, i, arr) => arr.indexOf(id) === i)
    const unknownIds = uniqueSenderIds.filter((id) => !senderNamesRef.current[id])
    if (unknownIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', unknownIds)
      if (profiles) {
        for (const p of profiles as { id: string; full_name: string }[]) {
          senderNamesRef.current[p.id] = p.full_name || 'Unknown'
        }
      }
    }
    return data.map((m) => ({ ...m, sender_name: senderNamesRef.current[m.sender_id] || 'Unknown' }))
  }, [])

  const subscribeToMessages = useCallback((conv: Conversation) => {
    const supabase = createClient()
    if (msgChannelRef.current) { supabase.removeChannel(msgChannelRef.current); msgChannelRef.current = null }
    const channel = supabase.channel(`messages:${conv.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conv.id}` },
        async (payload) => {
          const raw = payload.new as { id: string; content: string; created_at: string; sender_id: string }
          if (!senderNamesRef.current[raw.sender_id]) {
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', raw.sender_id).single()
            senderNamesRef.current[raw.sender_id] = (profile as { full_name?: string } | null)?.full_name || 'Unknown'
          }
          const newMsg: Message = { ...raw, sender_name: senderNamesRef.current[raw.sender_id] }
          setMessages((prev) => prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg])
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conv.id}` },
        (payload) => {
          const deleted = payload.old as { id: string }
          setMessages((prev) => prev.filter((m) => m.id !== deleted.id))
        })
      .subscribe()
    msgChannelRef.current = channel
  }, [])

  const loadConversations = useCallback(async (userId: string) => {
    const supabase = createClient()
    const { data: memberConvs } = await supabase.from('conversation_members').select('conversation_id').eq('profile_id', userId)
    let convData: Conversation[] = []
    if (memberConvs && memberConvs.length > 0) {
      const convIds = memberConvs.map((m: { conversation_id: string }) => m.conversation_id)
      const { data } = await supabase.from('conversations').select('*').in('id', convIds).order('created_at', { ascending: false })
      convData = (data as Conversation[]) || []
    } else {
      const { data } = await supabase.from('conversations').select('*').order('created_at', { ascending: false })
      convData = (data as Conversation[]) || []
    }
    setConversations(convData)

    const directConvs = convData.filter((c) => c.conversation_type === 'direct' && !c.title)
    if (directConvs.length > 0 && userId) {
      const directIds = directConvs.map((c) => c.id)
      const { data: mems } = await supabase
        .from('conversation_members')
        .select('conversation_id, profile_id')
        .in('conversation_id', directIds)
        .neq('profile_id', userId)
      if (mems) {
        const otherIds = (mems as { conversation_id: string; profile_id: string }[])
          .map((m) => m.profile_id)
          .filter((id, i, arr) => arr.indexOf(id) === i)
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', otherIds)
        const profileMap: Record<string, string> = {}
        if (profiles) {
          for (const p of profiles as { id: string; full_name: string }[]) {
            profileMap[p.id] = p.full_name || 'Unknown'
          }
        }
        const newDmNames: Record<string, string> = {}
        for (const m of mems as { conversation_id: string; profile_id: string }[]) {
          newDmNames[m.conversation_id] = profileMap[m.profile_id] || 'Unknown'
        }
        setDmNames((prev) => ({ ...prev, ...newDmNames }))
      }
    }
    return convData
  }, [])

  const subscribeToConversations = useCallback((userId: string) => {
    const supabase = createClient()
    if (convChannelRef.current) supabase.removeChannel(convChannelRef.current)
    const channel = supabase.channel('conversations:new')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, () => loadConversations(userId))
      .subscribe()
    convChannelRef.current = channel
  }, [loadConversations])

  useEffect(() => {
    async function init() {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const uid = user?.id || ''
      if (uid) setCurrentUserId(uid)
      await loadConversations(uid)
      subscribeToConversations(uid)
      const { data: usersData } = await supabase.from('profiles').select('id, full_name, role').order('full_name')
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

  async function selectConversation(conv: Conversation) {
    setSelectedConv(conv)
    setMessages([])
    setShowMembers(false)
    setMembers([])
    const msgs = await fetchMessages(conv.id)
    setMessages(msgs)
    subscribeToMessages(conv)
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConv) return
    setSending(true)
    const supabase = createClient()
    await supabase.from('messages').insert({ conversation_id: selectedConv.id, sender_id: currentUserId, content: newMessage.trim() })
    setNewMessage('')
    setSending(false)
  }

  async function deleteMessage(msgId: string) {
    const supabase = createClient()
    await supabase.from('messages').delete().eq('id', msgId)
    setMessages((prev) => prev.filter((m) => m.id !== msgId))
    setDeleteConfirm(null)
  }

  async function deleteConversation(convId: string) {
    const supabase = createClient()
    await supabase.from('messages').delete().eq('conversation_id', convId)
    await supabase.from('conversation_members').delete().eq('conversation_id', convId)
    await supabase.from('conversations').delete().eq('id', convId)
    if (selectedConv?.id === convId) {
      setSelectedConv(null)
      setMessages([])
      setShowMembers(false)
    }
    await loadConversations(currentUserId)
  }

  async function createConversation() {
    setCreating(true)
    setConvError('')
    const supabase = createClient()
    let recipients = [...selectedRecipients]

    if (convType === 'announcement' && announcementDivision) {
      const { data: divUsers } = await supabase.from('profiles').select('id').eq('division', announcementDivision).eq('role', 'student')
      if (divUsers) {
        const divIds = (divUsers as { id: string }[]).map((u) => u.id)
        const combined = [...recipients, ...divIds]
        recipients = combined.filter((id, index) => combined.indexOf(id) === index)
      }
    }

    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({ title: convTitle || null, conversation_type: convType, is_group: convType !== 'direct', created_by: currentUserId })
      .select().single()

    if (convErr || !conv) {
      setConvError(convErr?.message || 'Failed to create conversation')
      setCreating(false)
      return
    }

    const convId = (conv as { id: string }).id
    const mems = [
      { conversation_id: convId, profile_id: currentUserId },
      ...recipients.map((id) => ({ conversation_id: convId, profile_id: id })),
    ]
    await supabase.from('conversation_members').insert(mems)

    setShowNewConv(false)
    setSelectedRecipients([])
    setConvTitle('')
    setConvType('direct')
    setAnnouncementDivision('')
    setCreating(false)
    await loadConversations(currentUserId)
    await selectConversation(conv as Conversation)
  }

  async function sendBulkAnnouncement() {
    if (!announceMessage.trim()) return
    setAnnouncing(true)
    const supabase = createClient()

    let query = supabase.from('profiles').select('id').eq('role', 'student')
    if (announceDivision) query = query.eq('division', announceDivision)
    const { data: students } = await query

    const studentIds = (students || []).map((s: { id: string }) => s.id)
    const divLabel = announceDivision ? DIVISION_LABELS[announceDivision as keyof typeof DIVISION_LABELS] : 'All Students'
    const title = `📢 ${divLabel} — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`

    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({ title, conversation_type: 'announcement', is_group: true, created_by: currentUserId })
      .select().single()

    if (convErr || !conv) { setAnnouncing(false); return }

    const convId = (conv as { id: string }).id
    const mems = [
      { conversation_id: convId, profile_id: currentUserId },
      ...studentIds.map((id: string) => ({ conversation_id: convId, profile_id: id })),
    ]
    await supabase.from('conversation_members').insert(mems)
    await supabase.from('messages').insert({ conversation_id: convId, sender_id: currentUserId, content: announceMessage.trim() })

    setShowAnnounce(false)
    setAnnounceDivision('')
    setAnnounceMessage('')
    setAnnouncing(false)
    await loadConversations(currentUserId)
    await selectConversation(conv as Conversation)
  }

  const convLabel = (conv: Conversation) => {
    if (conv.title) return conv.title
    if (conv.conversation_type === 'direct') return dmNames[conv.id] || 'Direct Message'
    if (conv.conversation_type) return conv.conversation_type.charAt(0).toUpperCase() + conv.conversation_type.slice(1)
    return 'Conversation'
  }

  const roleLabel = (role: string) => {
    if (role === 'super_admin') return 'Super Admin'
    if (role === 'admin') return 'Admin'
    if (role === 'coach') return 'Coach'
    return 'Student'
  }

  const isCoachRole = (role: string) => ['coach', 'admin', 'super_admin'].includes(role)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messaging</h1>
          <p className="text-gray-500 text-sm mt-1">
            Direct messages and announcements · <span className="text-green-600 font-medium">● Live</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAnnounce(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Megaphone size={16} />Announce
          </button>
          <button onClick={() => { setShowNewConv(true); setConvError('') }}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} />New Message
          </button>
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-240px)] min-h-[500px]">

        {/* Conversation list */}
        <div className="w-64 shrink-0 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800 text-sm">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm px-4">No conversations yet. Start one!</div>
            ) : (
              conversations.map((conv) => (
                <div key={conv.id}
                  className={`group flex items-center border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${selectedConv?.id === conv.id ? 'bg-green-50 border-l-2 border-l-green-500' : ''}`}>
                  <button onClick={() => selectConversation(conv)} className="flex-1 text-left px-4 py-3 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-gray-900 truncate">{convLabel(conv)}</p>
                      <span className="text-xs text-gray-400 capitalize shrink-0">{conv.conversation_type}</span>
                    </div>
                    <p className="text-xs text-gray-400">{formatDateTime(conv.created_at)}</p>
                  </button>
                  <button onClick={() => { if (window.confirm(`Delete "${convLabel(conv)}" and all its messages?`)) deleteConversation(conv.id) }}
                    className="px-2 py-1 mr-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages panel */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col min-w-0">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a conversation to view messages</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="font-semibold text-gray-900">{convLabel(selectedConv)}</h2>
                  <p className="text-xs text-gray-400 capitalize mt-0.5">{selectedConv.conversation_type}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse" />Live
                  </span>
                  {/* Members button — only for group convs */}
                  {isGroupConv(selectedConv) && (
                    <button
                      onClick={() => {
                        if (!showMembers) fetchMembers(selectedConv.id)
                        setShowMembers((v) => !v)
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        showMembers
                          ? 'bg-green-50 border-green-200 text-green-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Users size={14} />
                      Members{members.length > 0 ? ` (${members.length})` : ''}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Messages */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-400 text-sm py-8">No messages yet</div>
                    ) : (
                      messages.map((msg) => {
                        const isOwn = msg.sender_id === currentUserId
                        const isHovered = hoveredMsgId === msg.id
                        const isConfirming = deleteConfirm === msg.id
                        return (
                          <div key={msg.id}
                            className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                            onMouseEnter={() => setHoveredMsgId(msg.id)}
                            onMouseLeave={() => { setHoveredMsgId(null); setDeleteConfirm(null) }}>
                            <p className="text-xs text-gray-400 mb-1">{isOwn ? 'You' : msg.sender_name}</p>
                            <div className="flex items-end gap-2">
                              {isOwn && isHovered && (
                                <div className="flex items-center gap-1 mb-1">
                                  {isConfirming ? (
                                    <>
                                      <button onClick={() => deleteMessage(msg.id)}
                                        className="text-xs text-red-600 font-medium hover:text-red-800">Delete</button>
                                      <button onClick={() => setDeleteConfirm(null)}
                                        className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                                    </>
                                  ) : (
                                    <button onClick={() => setDeleteConfirm(msg.id)}
                                      className="text-gray-300 hover:text-red-400 transition-colors">
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              )}
                              <div className={`max-w-md px-4 py-3 rounded-2xl text-sm ${isOwn ? 'bg-green-500 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-900 rounded-tl-sm'}`}>
                                {msg.content}
                              </div>
                              {!isOwn && isHovered && (
                                <div className="flex items-center gap-1 mb-1">
                                  {isConfirming ? (
                                    <>
                                      <button onClick={() => deleteMessage(msg.id)}
                                        className="text-xs text-red-600 font-medium hover:text-red-800">Delete</button>
                                      <button onClick={() => setDeleteConfirm(null)}
                                        className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                                    </>
                                  ) : (
                                    <button onClick={() => setDeleteConfirm(msg.id)}
                                      className="text-gray-300 hover:text-red-400 transition-colors">
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-300 mt-1">{formatDateTime(msg.created_at)}</p>
                          </div>
                        )
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="px-6 py-4 border-t border-gray-200 shrink-0">
                    <div className="flex gap-3">
                      <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                        placeholder="Type a message…"
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      <button onClick={sendMessage} disabled={sending || !newMessage.trim()}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                        <Send size={16} />Send
                      </button>
                    </div>
                  </div>
                </div>

                {/* Members panel — slides in on the right */}
                {showMembers && isGroupConv(selectedConv) && (
                  <div className="w-64 shrink-0 border-l border-gray-200 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-800">
                        Members {members.length > 0 && <span className="text-gray-400 font-normal">({members.length})</span>}
                      </span>
                      <button onClick={() => setShowMembers(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {membersLoading ? (
                        <div className="py-8 text-center text-gray-400 text-sm">Loading...</div>
                      ) : members.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 text-sm">No members found</div>
                      ) : (
                        members.map((member) => {
                          const isCoach = isCoachRole(member.role)
                          const isMe = member.profile_id === currentUserId
                          const initials = member.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                          return (
                            <div key={member.profile_id}
                              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                              {/* Avatar */}
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${isCoach ? 'bg-orange-500' : 'bg-green-500'}`}>
                                {initials}
                              </div>
                              {/* Name + badge */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {member.full_name}{isMe ? ' (you)' : ''}
                                </p>
                                <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full mt-0.5 ${
                                  isCoach ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                                }`}>
                                  {isCoach ? '🎓' : '🎾'} {roleLabel(member.role)}
                                </span>
                              </div>
                              {/* DM button */}
                              {!isMe && (
                                <button
                                  onClick={() => handleDM(member)}
                                  title={`Message ${member.full_name}`}
                                  className="shrink-0 p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                                  <MessageSquare size={15} />
                                </button>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bulk Announce Modal */}
      {showAnnounce && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">📢 Announce to Division</h2>
              <button onClick={() => setShowAnnounce(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                <select value={announceDivision} onChange={(e) => setAnnounceDivision(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white">
                  <option value="">All Students</option>
                  {DIVISIONS.map((d) => <option key={d} value={d}>{DIVISION_LABELS[d]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                <textarea value={announceMessage} onChange={(e) => setAnnounceMessage(e.target.value)} rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Write your announcement..." />
              </div>
              <p className="text-xs text-gray-400">
                Sends to {announceDivision ? `all ${DIVISION_LABELS[announceDivision as keyof typeof DIVISION_LABELS]} students` : 'all students'}.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAnnounce(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={sendBulkAnnouncement} disabled={announcing || !announceMessage.trim()}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg text-sm font-medium">
                {announcing ? 'Sending...' : 'Send Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Conversation Modal */}
      {showNewConv && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">New Conversation</h2>
              <button onClick={() => setShowNewConv(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {convError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{convError}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={convType} onChange={(e) => setConvType(e.target.value as 'direct' | 'group' | 'announcement')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                  <option value="direct">Direct Message</option>
                  <option value="group">Group Channel</option>
                  <option value="announcement">Division Announcement</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                <input type="text" value={convTitle} onChange={(e) => setConvTitle(e.target.value)} placeholder="Conversation title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              {convType === 'announcement' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                  <select value={announcementDivision} onChange={(e) => setAnnouncementDivision(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    <option value="">All Divisions</option>
                    {DIVISIONS.map((d) => <option key={d} value={d}>{DIVISION_LABELS[d]}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipients</label>
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg divide-y divide-gray-100">
                  {users.map((user) => (
                    <label key={user.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={selectedRecipients.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedRecipients([...selectedRecipients, user.id])
                          else setSelectedRecipients(selectedRecipients.filter((id) => id !== user.id))
                        }}
                        className="rounded border-gray-300 text-green-500 focus:ring-green-500" />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 truncate">{user.full_name}</p>
                        <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowNewConv(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={createConversation} disabled={creating}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg text-sm font-medium">
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
