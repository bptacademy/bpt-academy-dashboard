'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Plus, X, Users, Trophy, ChevronDown, ChevronUp } from 'lucide-react'
import { DIVISIONS, DIVISION_LABELS } from '@/lib/constants'

interface Tournament {
  id: string
  title: string
  description: string | null
  status: 'upcoming' | 'registration_open' | 'ongoing' | 'completed'
  start_date: string
  end_date: string | null
  registration_deadline: string | null
  location: string | null
  entry_fee_gbp: number | null
  max_participants: number | null
  eligible_divisions: string[] | null
  confirmed_count?: number
}

interface Registration {
  id: string
  student_id: string
  status: 'pending' | 'confirmed' | 'cancelled'
  full_name: string
  role: string
}

type TournamentStatus = Tournament['status']

const STATUS_ORDER: TournamentStatus[] = ['upcoming', 'registration_open', 'ongoing', 'completed']

const STATUS_BADGE: Record<TournamentStatus, string> = {
  upcoming: 'bg-blue-100 text-blue-800',
  registration_open: 'bg-green-100 text-green-800',
  ongoing: 'bg-amber-100 text-amber-800',
  completed: 'bg-gray-100 text-gray-800',
}

const STATUS_LABEL: Record<TournamentStatus, string> = {
  upcoming: 'Upcoming',
  registration_open: 'Registration Open',
  ongoing: 'Ongoing',
  completed: 'Completed',
}

const REG_STATUS_ORDER: Registration['status'][] = ['pending', 'confirmed', 'cancelled']

const REG_STATUS_BADGE: Record<Registration['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

const emptyForm = {
  title: '',
  description: '',
  start_date: '',
  end_date: '',
  registration_deadline: '',
  location: '',
  entry_fee_gbp: '',
  max_participants: '',
  eligible_divisions: [] as string[],
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Registration panel state: tournamentId → registrations
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [regLoading, setRegLoading] = useState(false)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Tournament | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Confirm status change dialog
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    tournament: Tournament
    newStatus: TournamentStatus
  } | null>(null)

  const fetchTournaments = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .order('start_date', { ascending: true })

    if (data) {
      // Fetch confirmed registration counts
      const enriched = await Promise.all(
        (data as Tournament[]).map(async (t) => {
          const { count } = await supabase
            .from('tournament_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', t.id)
            .eq('status', 'confirmed')
          return { ...t, confirmed_count: count || 0 }
        })
      )
      setTournaments(enriched)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTournaments()
  }, [fetchTournaments])

  // Stats
  const totalTournaments = tournaments.length
  const openForRegistration = tournaments.filter((t) => t.status === 'registration_open').length
  const totalRegistrations = tournaments.reduce((sum, t) => sum + (t.confirmed_count || 0), 0)

  function getNextStatus(current: TournamentStatus): TournamentStatus {
    const idx = STATUS_ORDER.indexOf(current)
    return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
  }

  function handleStatusBadgeClick(tournament: Tournament) {
    const newStatus = getNextStatus(tournament.status)
    setPendingStatusChange({ tournament, newStatus })
  }

  async function confirmStatusChange() {
    if (!pendingStatusChange) return
    const supabase = createClient()
    await supabase
      .from('tournaments')
      .update({ status: pendingStatusChange.newStatus })
      .eq('id', pendingStatusChange.tournament.id)
    setPendingStatusChange(null)
    fetchTournaments()
  }

  async function loadRegistrations(tournamentId: string) {
    if (expandedId === tournamentId) {
      setExpandedId(null)
      return
    }
    setExpandedId(tournamentId)
    setRegLoading(true)
    const supabase = createClient()

    const { data } = await supabase
      .from('tournament_registrations')
      .select(`
        id,
        student_id,
        status,
        profiles!tournament_registrations_student_id_fkey(full_name, role)
      `)
      .eq('tournament_id', tournamentId)

    if (data) {
      setRegistrations(
        data.map((r: Record<string, unknown>) => {
          const p = r.profiles as { full_name?: string; role?: string } | null
          return {
            id: String(r.id),
            student_id: String(r.student_id),
            status: r.status as Registration['status'],
            full_name: p?.full_name || 'Unknown',
            role: p?.role || '',
          }
        })
      )
    }
    setRegLoading(false)
  }

  async function cycleRegStatus(regId: string, current: Registration['status']) {
    const idx = REG_STATUS_ORDER.indexOf(current)
    const next = REG_STATUS_ORDER[(idx + 1) % REG_STATUS_ORDER.length]
    const supabase = createClient()
    await supabase
      .from('tournament_registrations')
      .update({ status: next })
      .eq('id', regId)

    setRegistrations((prev) =>
      prev.map((r) => (r.id === regId ? { ...r, status: next } : r))
    )

    // Refresh confirmed count for the tournament
    if (expandedId) {
      const { count } = await supabase
        .from('tournament_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', expandedId)
        .eq('status', 'confirmed')

      setTournaments((prev) =>
        prev.map((t) =>
          t.id === expandedId ? { ...t, confirmed_count: count || 0 } : t
        )
      )
    }
  }

  function openEdit(tournament: Tournament) {
    setEditingTournament(tournament)
    setForm({
      title: tournament.title,
      description: tournament.description || '',
      start_date: tournament.start_date?.split('T')[0] || '',
      end_date: tournament.end_date?.split('T')[0] || '',
      registration_deadline: tournament.registration_deadline?.split('T')[0] || '',
      location: tournament.location || '',
      entry_fee_gbp: tournament.entry_fee_gbp != null ? String(tournament.entry_fee_gbp) : '',
      max_participants: tournament.max_participants != null ? String(tournament.max_participants) : '',
      eligible_divisions: tournament.eligible_divisions || [],
    })
    setShowForm(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('tournaments').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    fetchTournaments()
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const supabase = createClient()

    const payload = {
      title: form.title,
      description: form.description || null,
      start_date: form.start_date,
      end_date: form.end_date || null,
      registration_deadline: form.registration_deadline || null,
      location: form.location || null,
      entry_fee_gbp: form.entry_fee_gbp ? parseFloat(form.entry_fee_gbp) : null,
      max_participants: form.max_participants ? parseInt(form.max_participants) : null,
      eligible_divisions: form.eligible_divisions.length > 0 ? form.eligible_divisions : null,
    }

    if (editingTournament) {
      const { error: err } = await supabase.from('tournaments').update(payload).eq('id', editingTournament.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('tournaments').insert({ ...payload, status: 'upcoming' as TournamentStatus })
      if (err) { setError(err.message); setSaving(false); return }
    }

    setSaving(false)
    setShowForm(false)
    setForm(emptyForm)
    setEditingTournament(null)
    fetchTournaments()
  }

  function toggleDivision(value: string) {
    setForm((f) => ({
      ...f,
      eligible_divisions: f.eligible_divisions.includes(value)
        ? f.eligible_divisions.filter((d) => d !== value)
        : [...f.eligible_divisions, value],
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tournaments</h1>
          <p className="text-gray-500 text-sm mt-1">Manage padel tournaments</p>
        </div>
        <button
          onClick={() => {
            setEditingTournament(null)
            setForm(emptyForm)
            setShowForm(true)
          }}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          New Tournament
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Trophy size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Tournaments</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {loading ? '...' : totalTournaments}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <Trophy size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Open for Registration</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {loading ? '...' : openForRegistration}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
            <Users size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Registrations</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {loading ? '...' : totalRegistrations}
            </p>
          </div>
        </div>
      </div>

      {/* Tournament list */}
      {loading ? (
        <div className="py-12 text-center text-gray-400">Loading tournaments...</div>
      ) : tournaments.length === 0 ? (
        <div className="py-12 text-center text-gray-400">No tournaments yet</div>
      ) : (
        <div className="space-y-4">
          {tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Card body */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-gray-900 text-base">
                        {tournament.title}
                      </h3>
                      <button
                        onClick={() => handleStatusBadgeClick(tournament)}
                        title="Click to advance status"
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                          STATUS_BADGE[tournament.status]
                        }`}
                      >
                        {STATUS_LABEL[tournament.status]}
                      </button>
                    </div>

                    {tournament.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {tournament.description}
                      </p>
                    )}

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs text-gray-500">
                      <div>
                        <span className="font-medium text-gray-700">Start:</span>{' '}
                        {formatDate(tournament.start_date)}
                      </div>
                      {tournament.end_date && (
                        <div>
                          <span className="font-medium text-gray-700">End:</span>{' '}
                          {formatDate(tournament.end_date)}
                        </div>
                      )}
                      {tournament.registration_deadline && (
                        <div>
                          <span className="font-medium text-gray-700">Reg. deadline:</span>{' '}
                          {formatDate(tournament.registration_deadline)}
                        </div>
                      )}
                      {tournament.location && (
                        <div>
                          <span className="font-medium text-gray-700">Location:</span>{' '}
                          {tournament.location}
                        </div>
                      )}
                      {tournament.entry_fee_gbp != null && (
                        <div>
                          <span className="font-medium text-gray-700">Entry fee:</span>{' '}
                          {formatCurrency(tournament.entry_fee_gbp)}
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-700">Participants:</span>{' '}
                        {tournament.confirmed_count}/{tournament.max_participants ?? '∞'}
                      </div>
                    </div>

                    {tournament.eligible_divisions && tournament.eligible_divisions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tournament.eligible_divisions.map((d) => (
                          <span
                            key={d}
                            className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
                          >
                            {DIVISION_LABELS[d as keyof typeof DIVISION_LABELS] ?? d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* View Registrations button */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex gap-3">
                    <button onClick={() => openEdit(tournament)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      Edit
                    </button>
                    <button onClick={() => setDeleteTarget(tournament)} className="text-sm text-red-500 hover:text-red-700 font-medium">
                      Delete
                    </button>
                  </div>
                  <button
                    onClick={() => loadRegistrations(tournament.id)}
                    className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-800 font-medium"
                  >
                    <Users size={14} />
                    View Registrations
                    {expandedId === tournament.id ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </button>
                </div>
              </div>

              {/* Inline registrations panel */}
              {expandedId === tournament.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-5">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Registrations — {tournament.title}
                  </h4>
                  {regLoading ? (
                    <p className="text-sm text-gray-400">Loading...</p>
                  ) : registrations.length === 0 ? (
                    <p className="text-sm text-gray-400">No registrations yet</p>
                  ) : (
                    <div className="space-y-2">
                      {registrations.map((reg) => (
                        <div
                          key={reg.id}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {reg.full_name}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">{reg.role}</p>
                          </div>
                          <button
                            onClick={() => cycleRegStatus(reg.id, reg.status)}
                            title="Click to advance status"
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                              REG_STATUS_BADGE[reg.status]
                            }`}
                          >
                            {reg.status}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New / Edit Tournament Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 my-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">{editingTournament ? 'Edit Tournament' : 'New Tournament'}</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Tournament title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Tournament description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Deadline
                  </label>
                  <input
                    type="date"
                    value={form.registration_deadline}
                    onChange={(e) =>
                      setForm({ ...form, registration_deadline: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g. BPT Club, Court 1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entry Fee (£)
                  </label>
                  <input
                    type="number"
                    value={form.entry_fee_gbp}
                    onChange={(e) => setForm({ ...form, entry_fee_gbp: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    value={form.max_participants}
                    onChange={(e) => setForm({ ...form, max_participants: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="32"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Eligible Divisions
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DIVISIONS.map((d) => (
                    <label
                      key={d}
                      className="flex items-center gap-2 cursor-pointer text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={form.eligible_divisions.includes(d)}
                        onChange={() => toggleDivision(d)}
                        className="w-4 h-4 text-green-500 rounded border-gray-300 focus:ring-green-500"
                      />
                      {DIVISION_LABELS[d]}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title || !form.start_date}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg text-sm font-medium"
              >
                {saving ? 'Saving...' : editingTournament ? 'Save Changes' : 'Create Tournament'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Tournament</h2>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete <span className="font-medium text-gray-900">{deleteTarget.title}</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg text-sm font-medium">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status change confirmation dialog */}
      {pendingStatusChange && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Change Tournament Status
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Change{' '}
              <span className="font-medium">{pendingStatusChange.tournament.title}</span>{' '}
              from{' '}
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[pendingStatusChange.tournament.status]}`}>
                {STATUS_LABEL[pendingStatusChange.tournament.status]}
              </span>{' '}
              to{' '}
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[pendingStatusChange.newStatus]}`}>
                {STATUS_LABEL[pendingStatusChange.newStatus]}
              </span>
              ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingStatusChange(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusChange}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
