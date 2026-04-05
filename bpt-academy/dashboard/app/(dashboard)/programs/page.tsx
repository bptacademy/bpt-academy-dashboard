'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency, getStatusBadgeColor } from '@/lib/utils'
import { Plus, X, Users, Calendar } from 'lucide-react'
import { DIVISIONS, DIVISION_LABELS } from '@/lib/constants'

interface Program {
  id: string
  title: string
  description: string | null
  division: string | null
  coach_id: string | null
  coach_name?: string
  start_date: string | null
  end_date: string | null
  max_students: number | null
  price_gbp: number | null
  is_active: boolean
  enrolled_count?: number
}

interface Session {
  id: string
  program_id: string
  scheduled_at: string
  duration_minutes: number | null
  location: string | null
}

interface Coach {
  id: string
  full_name: string
}

const emptyForm = {
  title: '',
  description: '',
  division: '',
  coach_id: '',
  start_date: '',
  end_date: '',
  max_students: '',
  price_gbp: '',
  is_active: true,
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProgram, setEditingProgram] = useState<Program | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [viewRoster, setViewRoster] = useState<Program | null>(null)
  const [roster, setRoster] = useState<{ student_id: string; full_name: string; status: string }[]>([])
  const [allStudents, setAllStudents] = useState<{id: string, full_name: string}[]>([])
  const [enrollStudentId, setEnrollStudentId] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [viewSessions, setViewSessions] = useState<Program | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [newSession, setNewSession] = useState({ scheduled_at: '', duration_minutes: '60', location: '' })

  const fetchPrograms = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: programData } = await supabase
      .from('programs')
      .select('*')
      .order('created_at', { ascending: false })

    if (programData) {
      const enriched = await Promise.all(
        programData.map(async (p: Program) => {
          let coach_name = 'Unassigned'
          if (p.coach_id) {
            const { data: coach } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', p.coach_id)
              .single()
            coach_name = coach?.full_name || 'Unknown'
          }
          const { count } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('program_id', p.id)
          return { ...p, coach_name, enrolled_count: count || 0 }
        })
      )
      setPrograms(enriched)
    }

    const { data: coachData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'coach')

    setCoaches(coachData || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchPrograms() }, [fetchPrograms])

  async function handleSave() {
    setSaving(true)
    setError('')
    const supabase = createClient()

    const payload = {
      title: form.title,
      description: form.description || null,
      division: form.division || null,
      coach_id: form.coach_id || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      max_students: form.max_students ? parseInt(form.max_students) : null,
      price_gbp: form.price_gbp ? parseFloat(form.price_gbp) : null,
      is_active: form.is_active,
    }

    if (editingProgram) {
      const { error: err } = await supabase.from('programs').update(payload).eq('id', editingProgram.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('programs').insert(payload)
      if (err) { setError(err.message); setSaving(false); return }
    }

    setSaving(false)
    setShowForm(false)
    setEditingProgram(null)
    setForm(emptyForm)
    fetchPrograms()
  }

  async function loadRoster(program: Program) {
    setViewRoster(program)
    const supabase = createClient()
    const { data } = await supabase
      .from('enrollments')
      .select('student_id, status, profiles!enrollments_student_id_fkey(full_name)')
      .eq('program_id', program.id)

    if (data) {
      setRoster(data.map((e: Record<string, unknown>) => {
        const p = e.profiles as { full_name?: string } | null
        return { student_id: String(e.student_id), full_name: p?.full_name || 'Unknown', status: String(e.status) }
      }))
    }

    const { data: students } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'student')
      .order('full_name', { ascending: true })
    setAllStudents(students || [])
  }

  async function enrollStudent() {
    if (!viewRoster || !enrollStudentId) return
    setEnrolling(true)
    const supabase = createClient()
    await supabase.from('enrollments').upsert({
      student_id: enrollStudentId,
      program_id: viewRoster.id,
      status: 'active',
    }, { onConflict: 'student_id,program_id' })
    setEnrollStudentId('')
    setEnrolling(false)
    loadRoster(viewRoster)
    fetchPrograms()
  }

  async function removeEnrollment(studentId: string) {
    if (!viewRoster) return
    const supabase = createClient()
    await supabase.from('enrollments').update({ status: 'cancelled' })
      .eq('student_id', studentId).eq('program_id', viewRoster.id)
    loadRoster(viewRoster)
    fetchPrograms()
  }

  async function loadSessions(program: Program) {
    setViewSessions(program)
    const supabase = createClient()
    const { data } = await supabase.from('program_sessions').select('*')
      .eq('program_id', program.id).order('scheduled_at', { ascending: true })
    setSessions(data || [])
  }

  async function addSession() {
    if (!viewSessions) return
    const supabase = createClient()
    await supabase.from('program_sessions').insert({
      program_id: viewSessions.id,
      scheduled_at: newSession.scheduled_at,
      duration_minutes: parseInt(newSession.duration_minutes) || 60,
      location: newSession.location || null,
    })
    setNewSession({ scheduled_at: '', duration_minutes: '60', location: '' })
    loadSessions(viewSessions)
  }

  async function removeSession(sessionId: string) {
    const supabase = createClient()
    await supabase.from('program_sessions').delete().eq('id', sessionId)
    if (viewSessions) loadSessions(viewSessions)
  }

  function openEdit(program: Program) {
    setEditingProgram(program)
    setForm({
      title: program.title,
      description: program.description || '',
      division: program.division || '',
      coach_id: program.coach_id || '',
      start_date: program.start_date?.split('T')[0] || '',
      end_date: program.end_date?.split('T')[0] || '',
      max_students: String(program.max_students || ''),
      price_gbp: String(program.price_gbp || ''),
      is_active: program.is_active,
    })
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programs</h1>
          <p className="text-gray-500 text-sm mt-1">Manage padel coaching programs</p>
        </div>
        <button
          onClick={() => { setEditingProgram(null); setForm(emptyForm); setShowForm(true) }}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          New Program
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Loading programs...</div>
      ) : programs.length === 0 ? (
        <div className="py-12 text-center text-gray-400">No programs yet</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {programs.map((program) => (
            <div key={program.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900">{program.title}</h3>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0 ${getStatusBadgeColor(program.is_active ? 'active' : 'inactive')}`}>
                  {program.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {program.description && (
                <p className="text-sm text-gray-500 line-clamp-2">{program.description}</p>
              )}

              <div className="space-y-1 text-xs text-gray-500">
                {program.division && (
                  <p><span className="font-medium">Division:</span>{' '}
                    {DIVISION_LABELS[program.division as keyof typeof DIVISION_LABELS] ?? program.division}
                  </p>
                )}
                <p><span className="font-medium">Coach:</span> {program.coach_name}</p>
                {program.price_gbp != null && program.price_gbp > 0 && (
                  <p><span className="font-medium">Price:</span> {formatCurrency(program.price_gbp)}</p>
                )}
                {program.start_date && (
                  <p><span className="font-medium">Dates:</span>{' '}
                    {formatDate(program.start_date)}{program.end_date && ` — ${formatDate(program.end_date)}`}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Users size={12} />
                  {program.enrolled_count}/{program.max_students || '∞'}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => loadSessions(program)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                    <Calendar size={12} />Sessions
                  </button>
                  <button onClick={() => loadRoster(program)} className="text-xs text-green-600 hover:text-green-800">Roster</button>
                  <button onClick={() => openEdit(program)} className="text-xs text-blue-600 hover:text-blue-800">Edit</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Program Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 my-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingProgram ? 'Edit Program' : 'New Program'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Program title" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Program description" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                  <select value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    <option value="">Select division</option>
                    {DIVISIONS.map((d) => <option key={d} value={d}>{DIVISION_LABELS[d]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Coach</label>
                  <select value={form.coach_id} onChange={(e) => setForm({ ...form, coach_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    <option value="">Unassigned</option>
                    {coaches.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Students</label>
                  <input type="number" value={form.max_students} onChange={(e) => setForm({ ...form, max_students: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (£)</label>
                  <input type="number" value={form.price_gbp} onChange={(e) => setForm({ ...form, price_gbp: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="99.99" step="0.01" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_active" checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-green-500 focus:ring-green-500" />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active (visible to students)</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !form.title}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg text-sm font-medium">
                {saving ? 'Saving...' : editingProgram ? 'Save Changes' : 'Create Program'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roster Modal */}
      {viewRoster && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{viewRoster.title} — Roster</h2>
              <button onClick={() => setViewRoster(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Enroll a Student</p>
              <div className="flex gap-2">
                <select value={enrollStudentId} onChange={(e) => setEnrollStudentId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                  <option value="">Select student...</option>
                  {allStudents
                    .filter(s => !roster.some(r => r.student_id === s.id && r.status === 'active'))
                    .map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
                <button onClick={enrollStudent} disabled={!enrollStudentId || enrolling}
                  className="px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg text-sm font-medium">
                  {enrolling ? '...' : 'Enroll'}
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {roster.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No enrolled students</p>
              ) : (
                roster.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">{s.full_name}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getStatusBadgeColor(s.status)}`}>
                        {s.status}
                      </span>
                      {s.status === 'active' && (
                        <button onClick={() => removeEnrollment(s.student_id)}
                          className="text-red-400 hover:text-red-600 text-xs font-medium">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sessions Modal */}
      {viewSessions && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{viewSessions.title} — Sessions</h2>
              <button onClick={() => setViewSessions(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Add Session</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Date & Time</label>
                  <input type="datetime-local" value={newSession.scheduled_at}
                    onChange={(e) => setNewSession({ ...newSession, scheduled_at: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Duration (min)</label>
                  <input type="number" value={newSession.duration_minutes}
                    onChange={(e) => setNewSession({ ...newSession, duration_minutes: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Location</label>
                  <div className="flex gap-2">
                    <input type="text" value={newSession.location}
                      onChange={(e) => setNewSession({ ...newSession, location: e.target.value })}
                      placeholder="e.g. Court 1"
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
                    <button onClick={addSession} disabled={!newSession.scheduled_at}
                      className="px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg text-xs font-medium">
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {sessions.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No sessions yet</p>
              ) : (
                sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(s.scheduled_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-gray-500">{s.duration_minutes} min{s.location ? ` · ${s.location}` : ''}</p>
                    </div>
                    <button onClick={() => removeSession(s.id)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
