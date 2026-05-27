'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, X, Users, Trophy, Clock, CheckCircle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type DrawType = 'mens' | 'womens' | 'mixed'
type RegStatus = 'confirmed' | 'withdrawn' | 'pending'

interface Tournament {
  id: string
  title: string
  draws: DrawType[] | null
}

interface Profile {
  id: string
  full_name: string
  division: string | null
}

interface Reg {
  id: string
  student_id: string
  partner_id: string | null
  team_name: string | null
  seed: number | null
  status: RegStatus
  draw: DrawType | null
  player1: { full_name: string } | null
  partner: { full_name: string } | null
}

interface GuestReg {
  id: string
  full_name: string
  email: string
  draw: DrawType
  partner_name: string | null
  seed: number | null
  status: string
  notified_at: string | null
}

interface Match {
  id: string
  round: string
  court: string | null
  scheduled_at: string | null
  score: string | null
  winner_id: string | null
  draw: DrawType | null
  notes: string | null
  team1_registration_id: string | null
  team2_registration_id: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DRAW_LABELS: Record<DrawType, string> = { mens: "Men's", womens: "Women's", mixed: 'Mixed' }
const DRAW_COLORS: Record<DrawType, { bg: string; text: string; border: string; active: string }> = {
  mens:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   active: 'bg-blue-600 text-white border-blue-600' },
  womens: { bg: 'bg-pink-50',   text: 'text-pink-700',   border: 'border-pink-200',   active: 'bg-pink-600 text-white border-pink-600' },
  mixed:  { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', active: 'bg-purple-600 text-white border-purple-600' },
}

const ROUNDS = ['Group A', 'Group B', 'Group C', 'Round of 16', 'Quarter Final', 'Semi Final', 'Final']

function teamLabel(reg: Reg | GuestReg | undefined): string {
  if (!reg) return 'TBD'
  if ('player1' in reg) {
    if (reg.team_name) return reg.team_name
    const p1 = reg.player1?.full_name ?? '?'
    const p2 = reg.partner?.full_name
    return p2 ? `${p1} & ${p2}` : p1
  }
  return reg.partner_name ? `${reg.full_name} & ${reg.partner_name}` : reg.full_name
}

function uniqueRounds(matches: Match[]): string[] {
  const seen: Record<string, boolean> = {}
  const result: string[] = []
  for (const m of matches) {
    if (!seen[m.round]) { seen[m.round] = true; result.push(m.round) }
  }
  return result
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TournamentDrawPage() {
  const params = useParams()
  const router = useRouter()
  const tournamentId = params.id as string

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [selectedDraw, setSelectedDraw] = useState<DrawType>('mens')
  const [activeTab, setActiveTab] = useState<'players' | 'draw' | 'schedule' | 'results'>('players')

  const [regs, setRegs] = useState<Reg[]>([])
  const [guests, setGuests] = useState<GuestReg[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [playerSearch, setPlayerSearch] = useState('')

  const [showAddGuest, setShowAddGuest] = useState(false)
  const [guestForm, setGuestForm] = useState({ full_name: '', email: '', partner_name: '' })
  const [guestSaving, setGuestSaving] = useState(false)
  const [guestError, setGuestError] = useState('')

  const [matchModal, setMatchModal] = useState<{
    open: boolean; editing: Match | null
    t1: string; t2: string; round: string; court: string; datetime: string; notes: string
  }>({ open: false, editing: null, t1: '', t2: '', round: '', court: '', datetime: '', notes: '' })
  const [matchSaving, setMatchSaving] = useState(false)

  const [resultState, setResultState] = useState<Record<string, { score: string; winner: string }>>({})

  // ─── Load ─────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    const supabase = createClient()
    const [tRes, rRes, gRes, mRes, pRes] = await Promise.all([
      supabase.from('tournaments').select('id, title, draws').eq('id', tournamentId).single(),
      supabase.from('tournament_registrations')
        .select('id, student_id, partner_id, team_name, seed, status, draw, player1:profiles!student_id(full_name), partner:profiles!partner_id(full_name)')
        .eq('tournament_id', tournamentId)
        .order('seed', { nullsFirst: false }),
      supabase.from('tournament_guest_registrations').select('*').eq('tournament_id', tournamentId).order('created_at'),
      supabase.from('tournament_matches').select('*').eq('tournament_id', tournamentId).order('created_at'),
      supabase.from('profiles').select('id, full_name, division').in('role', ['student', 'coach', 'admin']).order('full_name'),
    ])

    if (tRes.data) {
      const t = tRes.data as Tournament
      setTournament(t)
      const draws = t.draws ?? ['mens', 'womens']
      setSelectedDraw(draws[0] ?? 'mens')
    }
    if (rRes.data) setRegs(rRes.data as Reg[])
    if (gRes.data) setGuests(gRes.data as GuestReg[])
    if (mRes.data) setMatches(mRes.data as Match[])
    if (pRes.data) setAllProfiles(pRes.data as Profile[])
    setLoading(false)
  }, [tournamentId])

  useEffect(() => { load() }, [load])

  // ─── Derived ──────────────────────────────────────────────────────────────────

  const availableDraws: DrawType[] = tournament?.draws ?? ['mens', 'womens']
  const drawRegs = regs.filter(r => r.draw === selectedDraw || r.draw === null)
  const drawGuests = guests.filter(g => g.draw === selectedDraw && g.status !== 'withdrawn')
  const drawMatches = matches.filter(m => m.draw === selectedDraw || m.draw === null)
  const confirmedRegs = drawRegs.filter(r => r.status === 'confirmed')
  const registeredStudentIds = new Set(regs.filter(r => r.status === 'confirmed').map(r => r.student_id))
  const unregisteredProfiles = allProfiles.filter(p => !registeredStudentIds.has(p.id))
  const regById = (id: string | null): Reg | undefined => confirmedRegs.find(r => r.id === id)
  const rounds = uniqueRounds(drawMatches)
  const completedCount = drawMatches.filter(m => m.winner_id).length

  // ─── Player actions ───────────────────────────────────────────────────────────

  const addPlayer = async (profile: Profile) => {
    setShowAddPlayer(false)
    const supabase = createClient()
    await supabase.from('tournament_registrations').insert({
      tournament_id: tournamentId, student_id: profile.id, status: 'confirmed', draw: selectedDraw,
    })
    load()
  }

  const removePlayer = async (reg: Reg) => {
    if (!confirm(`Remove ${reg.player1?.full_name} from the ${DRAW_LABELS[selectedDraw]} draw?`)) return
    const supabase = createClient()
    await supabase.from('tournament_registrations').update({ status: 'withdrawn' }).eq('id', reg.id)
    load()
  }

  const updateSeed = async (regId: string, seed: number | null) => {
    const supabase = createClient()
    await supabase.from('tournament_registrations').update({ seed }).eq('id', regId)
    load()
  }

  const setPartner = async (regId: string, partnerId: string) => {
    const supabase = createClient()
    await supabase.from('tournament_registrations').update({ partner_id: partnerId }).eq('id', regId)
    load()
  }

  const removeGuest = async (guestId: string, name: string) => {
    if (!confirm(`Remove guest ${name}?`)) return
    const supabase = createClient()
    await supabase.from('tournament_guest_registrations').update({ status: 'withdrawn' }).eq('id', guestId)
    load()
  }

  // ─── Add guest ────────────────────────────────────────────────────────────────

  const saveGuest = async () => {
    setGuestError('')
    if (!guestForm.full_name.trim()) { setGuestError('Full name is required'); return }
    if (!guestForm.email.trim().includes('@')) { setGuestError('Valid email is required'); return }
    setGuestSaving(true)
    const supabase = createClient()

    const { data: existing } = await supabase
      .from('tournament_guest_registrations')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('email', guestForm.email.trim().toLowerCase())
      .maybeSingle()

    if (existing) { setGuestError('A guest with this email is already registered.'); setGuestSaving(false); return }

    const { error } = await supabase.from('tournament_guest_registrations').insert({
      tournament_id: tournamentId,
      full_name: guestForm.full_name.trim(),
      email: guestForm.email.trim().toLowerCase(),
      partner_name: guestForm.partner_name.trim() || null,
      draw: selectedDraw,
      status: 'confirmed',
    })

    if (error) { setGuestError(error.message); setGuestSaving(false); return }

    // Send invite email (fire and forget)
    try {
      await supabase.functions.invoke('process-notifications', {
        body: {
          type: 'tournament_guest_invite',
          email: guestForm.email.trim().toLowerCase(),
          full_name: guestForm.full_name.trim(),
          tournament_title: tournament?.title ?? 'BPT Academy Tournament',
        },
      })
      await supabase
        .from('tournament_guest_registrations')
        .update({ notified_at: new Date().toISOString() })
        .eq('tournament_id', tournamentId)
        .eq('email', guestForm.email.trim().toLowerCase())
    } catch { /* silent */ }

    setGuestSaving(false)
    setShowAddGuest(false)
    setGuestForm({ full_name: '', email: '', partner_name: '' })
    load()
  }

  // ─── Match actions ────────────────────────────────────────────────────────────

  const openAddMatch = () => setMatchModal({ open: true, editing: null, t1: '', t2: '', round: '', court: '', datetime: '', notes: '' })

  const openEditMatch = (m: Match) => setMatchModal({
    open: true, editing: m,
    t1: m.team1_registration_id ?? '', t2: m.team2_registration_id ?? '',
    round: m.round, court: m.court ?? '',
    datetime: m.scheduled_at ? new Date(m.scheduled_at).toISOString().slice(0, 16) : '',
    notes: m.notes ?? '',
  })

  const saveMatch = async () => {
    const { t1, t2, round, court, datetime, notes, editing } = matchModal
    if (!t1 || !t2 || !round) return
    setMatchSaving(true)
    const supabase = createClient()
    const payload = {
      tournament_id: tournamentId,
      team1_registration_id: t1, team2_registration_id: t2,
      round, court: court || null,
      scheduled_at: datetime ? new Date(datetime).toISOString() : null,
      notes: notes || null,
      draw: selectedDraw,
    }
    if (editing) {
      await supabase.from('tournament_matches').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('tournament_matches').insert(payload)
    }
    setMatchSaving(false)
    setMatchModal({ open: false, editing: null, t1: '', t2: '', round: '', court: '', datetime: '', notes: '' })
    load()
  }

  const deleteMatch = async (id: string) => {
    if (!confirm('Delete this match?')) return
    const supabase = createClient()
    await supabase.from('tournament_matches').delete().eq('id', id)
    load()
  }

  // ─── Results ──────────────────────────────────────────────────────────────────

  const saveResult = async (m: Match) => {
    const st = resultState[m.id]
    if (!st?.score || !st?.winner) return
    const winnerReg = confirmedRegs.find(r => r.id === st.winner)
    if (!winnerReg) return
    const supabase = createClient()
    await supabase.from('tournament_matches').update({
      score: st.score,
      winner_id: winnerReg.student_id,
      played_at: new Date().toISOString(),
    }).eq('id', m.id)
    load()
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (loading) return <div className="flex items-center justify-center py-24 text-gray-400">Loading draw...</div>
  if (!tournament) return <div className="flex items-center justify-center py-24 text-gray-400">Tournament not found</div>

  const dc = DRAW_COLORS[selectedDraw]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/tournaments')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> Tournaments
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tournament.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Draw Manager</p>
        </div>
      </div>

      {/* Draw selector */}
      {availableDraws.length > 1 && (
        <div className="flex gap-2">
          {availableDraws.map(d => {
            const c = DRAW_COLORS[d]
            const active = selectedDraw === d
            return (
              <button key={d} onClick={() => setSelectedDraw(d)} className={`px-5 py-2 rounded-full text-sm font-semibold border transition-all ${active ? c.active : `${c.bg} ${c.text} ${c.border}`}`}>
                {DRAW_LABELS[d]}
              </button>
            )
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {([
            { key: 'players',  label: 'Players',       icon: <Users size={15} /> },
            { key: 'draw',     label: 'Draw & Groups', icon: <Trophy size={15} /> },
            { key: 'schedule', label: 'Schedule',      icon: <Clock size={15} /> },
            { key: 'results',  label: 'Results',       icon: <CheckCircle size={15} /> },
          ] as const).map(({ key, label, icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === key ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── PLAYERS ── */}
      {activeTab === 'players' && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className={`${dc.bg} ${dc.border} border rounded-xl px-5 py-3`}>
              <p className={`text-xs font-semibold ${dc.text} uppercase tracking-wide`}>Registered</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{confirmedRegs.length + drawGuests.length}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">App Users</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{confirmedRegs.length}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Guests</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{drawGuests.length}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setPlayerSearch(''); setShowAddPlayer(true) }} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus size={15} /> Add Existing Player
            </button>
            <button onClick={() => { setGuestForm({ full_name: '', email: '', partner_name: '' }); setGuestError(''); setShowAddGuest(true) }} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus size={15} /> Add Guest Player
            </button>
          </div>

          {confirmedRegs.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700">App Users — {DRAW_LABELS[selectedDraw]}</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                    <th className="text-left px-5 py-2.5 font-medium">Seed</th>
                    <th className="text-left px-5 py-2.5 font-medium">Player</th>
                    <th className="text-left px-5 py-2.5 font-medium">Partner</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {confirmedRegs.map(reg => (
                    <tr key={reg.id} className="hover:bg-gray-50 group">
                      <td className="px-5 py-3">
                        <input type="number" min={1} className="w-14 px-2 py-1 border border-gray-200 rounded text-xs text-center"
                          value={reg.seed ?? ''} placeholder="—"
                          onChange={e => updateSeed(reg.id, e.target.value ? parseInt(e.target.value) : null)}
                        />
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900">{reg.player1?.full_name ?? '—'}</td>
                      <td className="px-5 py-3">
                        {reg.partner ? (
                          <span className="text-gray-600">{reg.partner.full_name}</span>
                        ) : (
                          <select className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-500" defaultValue=""
                            onChange={e => { if (e.target.value) setPartner(reg.id, e.target.value) }}>
                            <option value="" disabled>Set partner…</option>
                            {confirmedRegs.filter(r => r.id !== reg.id && !r.partner_id).map(r => (
                              <option key={r.id} value={r.student_id}>{r.player1?.full_name}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => removePlayer(reg)} className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 text-xs font-medium">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {drawGuests.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-amber-100 bg-amber-50">
                <h3 className="text-sm font-semibold text-amber-700">Guest Players — {DRAW_LABELS[selectedDraw]}</h3>
                <p className="text-xs text-amber-600 mt-0.5">These players don&apos;t have a BPT Academy account yet</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                    <th className="text-left px-5 py-2.5 font-medium">Name</th>
                    <th className="text-left px-5 py-2.5 font-medium">Email</th>
                    <th className="text-left px-5 py-2.5 font-medium">Partner</th>
                    <th className="text-left px-5 py-2.5 font-medium">Invited</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {drawGuests.map(g => (
                    <tr key={g.id} className="hover:bg-gray-50 group">
                      <td className="px-5 py-3 font-medium text-gray-900">{g.full_name}</td>
                      <td className="px-5 py-3 text-gray-500">{g.email}</td>
                      <td className="px-5 py-3 text-gray-500">{g.partner_name ?? '—'}</td>
                      <td className="px-5 py-3">
                        {g.notified_at ? <span className="text-green-600 text-xs font-medium">✓ Sent</span> : <span className="text-amber-500 text-xs">Pending</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => removeGuest(g.id, g.full_name)} className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 text-xs font-medium">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {confirmedRegs.length === 0 && drawGuests.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <Users size={32} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No players in {DRAW_LABELS[selectedDraw]} draw yet</p>
              <p className="text-sm mt-1">Use the buttons above to add players</p>
            </div>
          )}
        </div>
      )}

      {/* ── DRAW & GROUPS ── */}
      {activeTab === 'draw' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{confirmedRegs.length + drawGuests.length} players · {DRAW_LABELS[selectedDraw]}</p>
            <button onClick={openAddMatch} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus size={15} /> Add Match
            </button>
          </div>
          {rounds.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Trophy size={32} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No matches yet</p>
              <p className="text-sm mt-1">Click + Add Match to build the draw</p>
            </div>
          ) : (
            <div className="space-y-6">
              {rounds.map(round => (
                <div key={round}>
                  <h3 className="text-xs font-bold text-green-600 uppercase tracking-widest mb-3">{round}</h3>
                  <div className="space-y-2">
                    {drawMatches.filter(m => m.round === round).map(m => {
                      const t1 = regById(m.team1_registration_id)
                      const t2 = regById(m.team2_registration_id)
                      return (
                        <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1">
                              <span className="font-semibold text-gray-900 text-sm flex-1 text-right">{teamLabel(t1)}</span>
                              <span className="text-xs text-gray-400 font-medium px-2">vs</span>
                              <span className="font-semibold text-gray-900 text-sm flex-1">{teamLabel(t2)}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              {m.court && <span>🎾 {m.court}</span>}
                              {m.scheduled_at && <span>🕐 {new Date(m.scheduled_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                              {m.winner_id && <span className="text-green-600 font-semibold">✓ Done</span>}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => openEditMatch(m)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                              <button onClick={() => deleteMatch(m.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SCHEDULE ── */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{drawMatches.filter(m => m.scheduled_at).length} of {drawMatches.length} matches scheduled</p>
            <button onClick={openAddMatch} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus size={15} /> Add Match
            </button>
          </div>
          {drawMatches.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Clock size={32} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No matches to schedule</p>
              <p className="text-sm mt-1">Create matches in the Draw tab first</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 font-medium">Round</th>
                    <th className="text-left px-5 py-3 font-medium">Match</th>
                    <th className="text-left px-5 py-3 font-medium">Court</th>
                    <th className="text-left px-5 py-3 font-medium">Date & Time</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {drawMatches.slice().sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? '')).map(m => {
                    const t1 = regById(m.team1_registration_id)
                    const t2 = regById(m.team2_registration_id)
                    return (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 text-xs text-green-600 font-bold uppercase">{m.round}</td>
                        <td className="px-5 py-3 font-medium text-gray-900">{teamLabel(t1)} <span className="text-gray-400 font-normal">vs</span> {teamLabel(t2)}</td>
                        <td className="px-5 py-3 text-gray-500">{m.court ?? '—'}</td>
                        <td className="px-5 py-3 text-gray-500">
                          {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : <span className="text-amber-500 text-xs">Not scheduled</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button onClick={() => openEditMatch(m)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── RESULTS ── */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{completedCount} / {drawMatches.length} matches completed</p>
          {drawMatches.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <CheckCircle size={32} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No matches yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {drawMatches.map(m => {
                const t1 = regById(m.team1_registration_id)
                const t2 = regById(m.team2_registration_id)
                const done = !!m.winner_id
                const winnerReg = done ? confirmedRegs.find(r => r.student_id === m.winner_id) : null
                const st = resultState[m.id] ?? { score: m.score ?? '', winner: winnerReg?.id ?? '' }
                return (
                  <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-green-600 uppercase tracking-wide">{m.round}</span>
                      {done && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Complete</span>}
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <span className={`flex-1 text-right font-semibold text-sm ${winnerReg?.id === t1?.id ? 'text-green-600' : 'text-gray-900'}`}>{teamLabel(t1)}</span>
                      <span className={`text-lg font-bold px-2 ${done ? 'text-gray-900' : 'text-gray-400'}`}>{done ? m.score : 'vs'}</span>
                      <span className={`flex-1 font-semibold text-sm ${winnerReg?.id === t2?.id ? 'text-green-600' : 'text-gray-900'}`}>{teamLabel(t2)}</span>
                    </div>
                    {!done && (
                      <div className="space-y-3 border-t border-gray-100 pt-3">
                        <input type="text" placeholder="Score (e.g. 6-3 7-5)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          value={st.score} onChange={e => setResultState(prev => ({ ...prev, [m.id]: { ...st, score: e.target.value } }))} />
                        <div className="flex gap-2">
                          <button onClick={() => t1 && setResultState(prev => ({ ...prev, [m.id]: { ...st, winner: t1.id } }))}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${st.winner === t1?.id ? 'bg-green-500 text-white border-green-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            {teamLabel(t1)} Wins
                          </button>
                          <button onClick={() => t2 && setResultState(prev => ({ ...prev, [m.id]: { ...st, winner: t2.id } }))}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${st.winner === t2?.id ? 'bg-green-500 text-white border-green-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            {teamLabel(t2)} Wins
                          </button>
                        </div>
                        <button onClick={() => saveResult(m)} disabled={!st.score || !st.winner}
                          className="w-full py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg text-sm font-medium">
                          Save Result
                        </button>
                      </div>
                    )}
                    {done && winnerReg && <p className="text-center text-sm text-green-600 font-semibold border-t border-gray-100 pt-3">🏆 {teamLabel(winnerReg)}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── ADD PLAYER MODAL ─── */}
      {showAddPlayer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add to {DRAW_LABELS[selectedDraw]}</h2>
              <button onClick={() => setShowAddPlayer(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <input type="text" placeholder="Search by name…" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3"
              value={playerSearch} onChange={e => setPlayerSearch(e.target.value)} autoFocus />
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
              {unregisteredProfiles.filter(p => p.full_name.toLowerCase().includes(playerSearch.toLowerCase())).map(p => (
                <button key={p.id} onClick={() => addPlayer(p)} className="w-full flex items-center justify-between px-2 py-3 hover:bg-gray-50 text-left">
                  <span className="text-sm font-medium text-gray-900">{p.full_name}</span>
                  <span className="text-xs text-gray-400">{p.division ?? ''}</span>
                </button>
              ))}
              {unregisteredProfiles.filter(p => p.full_name.toLowerCase().includes(playerSearch.toLowerCase())).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No unregistered players found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD GUEST MODAL ─── */}
      {showAddGuest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Add Guest — {DRAW_LABELS[selectedDraw]}</h2>
                <p className="text-sm text-gray-500 mt-0.5">Player without a BPT Academy account</p>
              </div>
              <button onClick={() => setShowAddGuest(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {guestError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{guestError}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={guestForm.full_name} onChange={e => setGuestForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. John Smith" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={guestForm.email} onChange={e => setGuestForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Partner Name <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={guestForm.partner_name} onChange={e => setGuestForm(f => ({ ...f, partner_name: e.target.value }))} placeholder="e.g. Jane Smith" />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                📧 An invitation email will be sent to this player with a link to download the BPT Academy app.
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddGuest(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={saveGuest} disabled={guestSaving} className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg text-sm font-medium">
                {guestSaving ? 'Saving…' : 'Add & Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MATCH MODAL ─── */}
      {matchModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 my-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">{matchModal.editing ? 'Edit Match' : `Add Match — ${DRAW_LABELS[selectedDraw]}`}</h2>
              <button onClick={() => setMatchModal(m => ({ ...m, open: false }))} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team 1</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={matchModal.t1} onChange={e => setMatchModal(m => ({ ...m, t1: e.target.value }))}>
                  <option value="">Select team…</option>
                  {confirmedRegs.map(r => <option key={r.id} value={r.id}>{teamLabel(r)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team 2</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={matchModal.t2} onChange={e => setMatchModal(m => ({ ...m, t2: e.target.value }))}>
                  <option value="">Select team…</option>
                  {confirmedRegs.filter(r => r.id !== matchModal.t1).map(r => <option key={r.id} value={r.id}>{teamLabel(r)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Round</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {ROUNDS.map(r => (
                    <button key={r} onClick={() => setMatchModal(m => ({ ...m, round: r }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${matchModal.round === r ? 'bg-green-500 text-white border-green-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{r}</button>
                  ))}
                </div>
                <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Or type custom round…" value={matchModal.round} onChange={e => setMatchModal(m => ({ ...m, round: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Court</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="e.g. Court 1" value={matchModal.court} onChange={e => setMatchModal(m => ({ ...m, court: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                <input type="datetime-local" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value={matchModal.datetime} onChange={e => setMatchModal(m => ({ ...m, datetime: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value={matchModal.notes} onChange={e => setMatchModal(m => ({ ...m, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setMatchModal(m => ({ ...m, open: false }))} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={saveMatch} disabled={matchSaving || !matchModal.t1 || !matchModal.t2 || !matchModal.round}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg text-sm font-medium">
                {matchSaving ? 'Saving…' : matchModal.editing ? 'Save Changes' : 'Add Match'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
