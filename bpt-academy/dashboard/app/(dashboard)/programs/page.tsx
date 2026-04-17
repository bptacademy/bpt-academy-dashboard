'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency, getStatusBadgeColor } from '@/lib/utils'
import { Plus, X, Users, Calendar, CalendarDays } from 'lucide-react'
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
  status?: string
  sessions_per_week?: number
  enrolled_count?: number
  next_cycle_start_date?: string | null
  current_cycle_start_date?: string | null
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

const DAYS_OF_WEEK = [
  { key: 'monday',    label: 'Mon' },
  { key: 'tuesday',   label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday',  label: 'Thu' },
  { key: 'friday',    label: 'Fri' },
]

const DAY_INDEX: Record<string, number> = { monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5,
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function isWeekday(d: Date): boolean { const dow = d.getDay(); return dow !== 0 && dow !== 6; }

function generateSessionDates(startDate: Date, selectedDays: string[]): Date[] {
  const dates: Date[] = []
  const maxSessions = Math.min(selectedDays.length * 4, 16)
  const endDate = addDays(startDate, 30)
  const indices = selectedDays.map(d => DAY_INDEX[d])
  let current = new Date(startDate)
  while (current <= endDate && dates.length < maxSessions) {
    if (indices.includes(current.getDay())) dates.push(new Date(current))
    current = addDays(current, 1)
  }
  return dates
}

const emptyForm = {
  title: '', description: '', division: '', coach_id: '',
  start_date: '', end_date: '', max_students: '', price_gbp: '', is_active: true,
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
  const [roster, setRoster] = useState<{ student_id: string; full_name: string; status: string; confirmed_next_month?: boolean }[]>([])
  const [waitlist, setWaitlist] = useState<{ position: number; joined_at: string; full_name: string }[]>([])
  const [allStudents, setAllStudents] = useState<{id: string, full_name: string}[]>([])
  const [enrollStudentId, setEnrollStudentId] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [nextCycleDate, setNextCycleDate] = useState('')
  const [savingCycleDate, setSavingCycleDate] = useState(false)
  const [viewSessions, setViewSessions] = useState<Program | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [newSession, setNewSession] = useState({ scheduled_at: '', duration_minutes: '60', location: '' })

  // Schedule Generator state
  const [scheduleProgram, setScheduleProgram] = useState<Program | null>(null)
  const [schedStartDate, setSchedStartDate] = useState('')
  const [schedDays, setSchedDays] = useState<string[]>([])
  const [schedCapacity, setSchedCapacity] = useState(10)
  const [generating, setGenerating] = useState(false)
  const [schedError, setSchedError] = useState('')

  // Build 30-day start date options
  const startDateOptions: string[] = []
  for (let i = 0; i <= 30; i++) {
    startDateOptions.push(localDateStr(addDays(new Date(), i)))
  }

  const previewDates = schedStartDate && schedDays.length > 0
    ? generateSessionDates(new Date(schedStartDate + 'T00:00:00'), schedDays)
    : []

  const fetchPrograms = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: programData } = await supabase.from('programs').select('*, next_cycle_start_date, current_cycle_start_date').order('created_at', { ascending: false })
    if (programData) {
      const enriched = await Promise.all(
        programData.map(async (p: Program) => {
          let coach_name = 'Unassigned'
          if (p.coach_id) {
            const { data: coach } = await supabase.from('profiles').select('full_name').eq('id', p.coach_id).single()
            coach_name = coach?.full_name || 'Unknown'
          }
          const { count } = await supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('program_id', p.id).eq('status', 'active')
          return { ...p, coach_name, enrolled_count: count || 0 }
        })
      )
      setPrograms(enriched)
    }
    const { data: coachData } = await supabase.from('profiles').select('id, full_name').eq('role', 'coach')
    setCoaches(coachData || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchPrograms() }, [fetchPrograms])

  async function handleSave() {
    setSaving(true); setError('')
    const supabase = createClient()
    const payload = {
      title: form.title, description: form.description || null,
      division: form.division || null, coach_id: form.coach_id || null,
      start_date: form.start_date || null, end_date: form.end_date || null,
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
    setSaving(false); setShowForm(false); setEditingProgram(null); setForm(emptyForm); fetchPrograms()
  }

  async function loadRoster(program: Program) {
    setViewRoster(program)
    setNextCycleDate(program.next_cycle_start_date || '')
    const supabase = createClient()
    const { data } = await supabase
      .from('enrollments')
      .select('student_id, status, confirmed_next_month, profiles!enrollments_student_id_fkey(full_name)')
      .eq('program_id', program.id)
    if (data) {
      setRoster(data.map((e: any) => ({
        student_id: e.student_id,
        full_name: e.profiles?.full_name || 'Unknown',
        status: e.status,
        confirmed_next_month: e.confirmed_next_month,
      })))
    }
    // Load waiting list for current month
    const month = new Date().toISOString().slice(0, 7)
    const { data: wlData } = await supabase
      .from('program_waiting_list')
      .select('position, joined_at, profiles:student_id(full_name)')
      .eq('program_id', program.id).eq('month', month)
      .order('position', { ascending: true })
    if (wlData) {
      setWaitlist(wlData.map((w: any) => ({
        position: w.position,
        joined_at: w.joined_at,
        full_name: w.profiles?.full_name || 'Unknown',
      })))
    } else { setWaitlist([]) }
    const { data: students } = await supabase.from('profiles').select('id, full_name').eq('role', 'student').order('full_name')
    setAllStudents(students || [])
  }

  async function enrollStudent() {
    if (!viewRoster || !enrollStudentId) return
    setEnrolling(true)
    const supabase = createClient()
    await supabase.from('enrollments').upsert({ student_id: enrollStudentId, program_id: viewRoster.id, status: 'active' }, { onConflict: 'student_id,program_id' })
    setEnrollStudentId(''); setEnrolling(false); loadRoster(viewRoster); fetchPrograms()
  }

  async function removeEnrollment(studentId: string) {
    if (!viewRoster) return
    const supabase = createClient()
    await supabase.from('enrollments').update({ status: 'cancelled' }).eq('student_id', studentId).eq('program_id', viewRoster.id)
    loadRoster(viewRoster); fetchPrograms()
  }

  async function confirmPayment(studentId: string, studentName: string) {
    if (!viewRoster) return
    if (!confirm(`Confirm bank transfer received from ${studentName}? They will be placed in the next program cycle.`)) return
    const supabase = createClient()
    await supabase.from('enrollments')
      .update({ status: 'pending_next_cycle', payment_confirmed: true, payment_status: 'paid' })
      .eq('student_id', studentId)
      .eq('program_id', viewRoster.id)

    // Notify student
    const cycleMsg = viewRoster.next_cycle_start_date
      ? `Your sessions start on ${new Date(viewRoster.next_cycle_start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`
      : 'Your coach will confirm your start date soon.'
    await supabase.from('notifications').insert({
      recipient_id: studentId,
      title: '✅ Payment Confirmed!',
      body: `Your enrollment in ${viewRoster.title} is confirmed. ${cycleMsg}`,
      type: 'enrollment',
      data: { program_id: viewRoster.id },
    })
    loadRoster(viewRoster)
  }

  async function saveNextCycleDate() {
    if (!viewRoster || !nextCycleDate) return
    setSavingCycleDate(true)
    const supabase = createClient()
    await supabase.from('programs').update({ next_cycle_start_date: nextCycleDate }).eq('id', viewRoster.id)

    // Notify all pending_next_cycle students
    const { data: pending } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('program_id', viewRoster.id)
      .eq('status', 'pending_next_cycle')
    if (pending && pending.length > 0) {
      const formatted = new Date(nextCycleDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      await supabase.from('notifications').insert(
        pending.map((p: any) => ({
          recipient_id: p.student_id,
          title: '📅 Your start date is confirmed',
          body: `Your program sessions will begin on ${formatted}. We'll see you on the court!`,
          type: 'enrollment',
          data: { program_id: viewRoster.id, cycle_start: nextCycleDate },
        }))
      )
    }
    setViewRoster({ ...viewRoster, next_cycle_start_date: nextCycleDate })
    setSavingCycleDate(false)
    fetchPrograms()
  }

  async function loadSessions(program: Program) {
    setViewSessions(program)
    const supabase = createClient()
    const { data } = await supabase.from('program_sessions').select('*').eq('program_id', program.id).order('scheduled_at', { ascending: true })
    setSessions(data || [])
  }

  async function addSession() {
    if (!viewSessions) return
    const supabase = createClient()
    await supabase.from('program_sessions').insert({ program_id: viewSessions.id, scheduled_at: newSession.scheduled_at, duration_minutes: parseInt(newSession.duration_minutes) || 60, location: newSession.location || null })
    setNewSession({ scheduled_at: '', duration_minutes: '60', location: '' }); loadSessions(viewSessions)
  }

  async function removeSession(sessionId: string) {
    const supabase = createClient()
    await supabase.from('program_sessions').delete().eq('id', sessionId)
    if (viewSessions) loadSessions(viewSessions)
  }

  function openEdit(program: Program) {
    setEditingProgram(program)
    setForm({ title: program.title, description: program.description || '', division: program.division || '', coach_id: program.coach_id || '', start_date: program.start_date?.split('T')[0] || '', end_date: program.end_date?.split('T')[0] || '', max_students: String(program.max_students || ''), price_gbp: String(program.price_gbp || ''), is_active: program.is_active })
    setShowForm(true)
  }

  function openSchedule(program: Program) {
    setScheduleProgram(program)
    setSchedStartDate(startDateOptions[0])
    setSchedDays([])
    setSchedCapacity(program.max_students || 10)
    setSchedError('')
  }

  async function handleGenerate() {
    if (!scheduleProgram || schedDays.length === 0 || !schedStartDate) { setSchedError('Please select a start date and at least one day.'); return }
    if (previewDates.length === 0) { setSchedError('No sessions generated. Try a different start date or days.'); return }
    setGenerating(true); setSchedError('')
    const supabase = createClient()
    const month = schedStartDate.slice(0, 7)
    try {
      // Delete ALL existing sessions and modules before regenerating
      await supabase.from('program_sessions').delete().eq('program_id', scheduleProgram.id)
      await supabase.from('modules').delete().eq('program_id', scheduleProgram.id)

      // Insert modules (trigger auto-creates sessions)
      for (let i = 0; i < previewDates.length; i++) {
        await supabase.from('modules').insert({ program_id: scheduleProgram.id, title: `Module ${i + 1}`, description: 'Schedule generated module', order_index: i + 1, session_date: localDateStr(previewDates[i]), is_published: true })
      }

      // Record schedule
      await supabase.from('program_schedules').upsert({ program_id: scheduleProgram.id, month, start_date: schedStartDate, days_of_week: schedDays }, { onConflict: 'program_id,month' })

      // Update capacity + status
      await supabase.from('programs').update({ max_students: schedCapacity, status: 'active', is_active: true }).eq('id', scheduleProgram.id)

      // Auto-enroll: confirmed+paid first, then waiting list FIFO
      const { data: confirmed } = await supabase.from('enrollments').select('id, student_id').eq('program_id', scheduleProgram.id).eq('confirmed_next_month', true).eq('payment_confirmed', true)
      let filled = (confirmed || []).length
      for (const e of (confirmed || []) as any[]) {
        await supabase.from('enrollments').update({ status: 'active', confirmed_next_month: false, payment_confirmed: false }).eq('id', e.id)
      }
      const remaining = Math.max(0, schedCapacity - filled)
      if (remaining > 0) {
        const { data: wl } = await supabase.from('program_waiting_list').select('student_id').eq('program_id', scheduleProgram.id).eq('month', month).order('position', { ascending: true }).limit(remaining)
        for (const w of (wl || []) as any[]) {
          await supabase.from('enrollments').upsert({ student_id: w.student_id, program_id: scheduleProgram.id, status: 'active', confirmed_next_month: false, payment_confirmed: false }, { onConflict: 'student_id,program_id' })
          await supabase.from('notifications').insert({ recipient_id: w.student_id, title: '🎾 You got a spot!', body: `You have been enrolled in ${scheduleProgram.title} for next month!`, type: 'enrollment', read: false })
          filled++
        }
      }

      // Set re-enrollment deadline + notify active students
      const endDate = addDays(new Date(schedStartDate + 'T00:00:00'), 30)
      const deadline = addDays(endDate, -7)
      const { data: active } = await supabase.from('enrollments').select('id, student_id').eq('program_id', scheduleProgram.id).eq('status', 'active')
      for (const e of (active || []) as any[]) {
        await supabase.from('enrollments').update({ confirmation_deadline: deadline.toISOString() }).eq('id', e.id)
        await supabase.from('notifications').insert({ recipient_id: e.student_id, title: '📅 Confirm your place next month', body: `${scheduleProgram.title} is back next month. Confirm your place by ${deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.`, type: 'reenrollment_request', read: false })
      }

      // Reset waiting list
      await supabase.from('program_waiting_list').delete().eq('program_id', scheduleProgram.id).eq('month', month)

      setGenerating(false); setScheduleProgram(null); fetchPrograms()
      alert(`✅ Schedule generated! ${previewDates.length} sessions created. ${filled} students enrolled.`)
    } catch (err: any) {
      setSchedError(err?.message || 'Failed to generate schedule')
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programs</h1>
          <p className="text-gray-500 text-sm mt-1">Manage padel coaching programs</p>
        </div>
        <button onClick={() => { setEditingProgram(null); setForm(emptyForm); setShowForm(true) }}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} />New Program
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
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0 ${
                  program.status === 'finished' ? 'bg-gray-100 text-gray-500' :
                  program.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'}`}>
                  {program.status || (program.is_active ? 'active' : 'inactive')}
                </span>
              </div>
              {program.description && <p className="text-sm text-gray-500 line-clamp-2">{program.description}</p>}
              <div className="space-y-1 text-xs text-gray-500">
                {program.division && <p><span className="font-medium">Division:</span> {DIVISION_LABELS[program.division as keyof typeof DIVISION_LABELS] ?? program.division}</p>}
                <p><span className="font-medium">Coach:</span> {program.coach_name}</p>
                {program.price_gbp != null && program.price_gbp > 0 && <p><span className="font-medium">Price:</span> {formatCurrency(program.price_gbp)}</p>}
                {program.start_date && <p><span className="font-medium">Dates:</span> {formatDate(program.start_date)}{program.end_date && ` — ${formatDate(program.end_date)}`}</p>}
                {program.next_cycle_start_date && <p className="text-blue-600"><span className="font-medium">Next cycle:</span> {formatDate(program.next_cycle_start_date)}</p>}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Users size={12} />{program.enrolled_count}/{program.max_students || '∞'}
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <button onClick={() => openSchedule(program)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                    <CalendarDays size={12} />Schedule
                  </button>
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

      {/* Schedule Generator Modal */}
      {scheduleProgram && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 my-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">📅 Generate Schedule</h2>
                <p className="text-sm text-gray-500 mt-0.5">{scheduleProgram.title}</p>
              </div>
              <button onClick={() => setScheduleProgram(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {schedError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{schedError}</div>}

            <div className="space-y-5">
              {/* Start date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                <select value={schedStartDate} onChange={e => setSchedStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                  {startDateOptions.map(d => (
                    <option key={d} value={d}>
                      {new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Days of week */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Session Days</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS_OF_WEEK.map(d => {
                    const sel = schedDays.includes(d.key)
                    return (
                      <button key={d.key}
                        onClick={() => setSchedDays(prev => sel ? prev.filter(x => x !== d.key) : [...prev, d.key])}
                        className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors ${sel ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-green-300'}`}>
                        {d.label}
                      </button>
                    )
                  })}
                </div>
                {schedDays.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    {schedDays.length} day{schedDays.length !== 1 ? 's' : ''}/week × 4 weeks = <span className="font-semibold text-green-600">{Math.min(schedDays.length * 4, 16)} sessions</span>
                  </p>
                )}
              </div>

              {/* Capacity */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Capacity (students)</label>
                <div className="flex items-center gap-4">
                  <button onClick={() => setSchedCapacity(v => Math.max(1, v - 1))}
                    className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 hover:border-gray-400">−</button>
                  <span className="text-3xl font-bold text-gray-900 w-12 text-center">{schedCapacity}</span>
                  <button onClick={() => setSchedCapacity(v => v + 1)}
                    className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 hover:border-gray-400">+</button>
                </div>
              </div>

              {/* Preview */}
              {previewDates.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Preview — {previewDates.length} sessions
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-100 rounded-lg p-3 bg-gray-50">
                    {previewDates.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center shrink-0">{i+1}</span>
                        <span className="text-gray-700">{d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setScheduleProgram(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleGenerate} disabled={generating || schedDays.length === 0 || !schedStartDate}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg text-sm font-medium">
                {generating ? 'Generating...' : `Generate ${previewDates.length > 0 ? previewDates.length + ' Sessions' : 'Schedule'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Program Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 my-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">{editingProgram ? 'Edit Program' : 'New Program'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Program title" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Program description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                  <select value={form.division} onChange={e => setForm({...form, division: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    <option value="">Select division</option>
                    {DIVISIONS.map(d => <option key={d} value={d}>{DIVISION_LABELS[d]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Coach</label>
                  <select value={form.coach_id} onChange={e => setForm({...form, coach_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    <option value="">Unassigned</option>
                    {coaches.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Students</label>
                  <input type="number" value={form.max_students} onChange={e => setForm({...form, max_students: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (£)</label>
                  <input type="number" value={form.price_gbp} onChange={e => setForm({...form, price_gbp: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="99.99" step="0.01" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})}
                  className="rounded border-gray-300 text-green-500 focus:ring-green-500" />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active (visible to students)</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{viewRoster.title} — Roster</h2>
              <button onClick={() => setViewRoster(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Enroll a Student</p>
              <div className="flex gap-2">
                <select value={enrollStudentId} onChange={e => setEnrollStudentId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                  <option value="">Select student...</option>
                  {allStudents.filter(s => !roster.some(r => r.student_id === s.id && r.status === 'active')).map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
                <button onClick={enrollStudent} disabled={!enrollStudentId || enrolling}
                  className="px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg text-sm font-medium">
                  {enrolling ? '...' : 'Enroll'}
                </button>
              </div>
            </div>
            {/* Next Cycle Date */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm font-semibold text-blue-700 mb-2">📅 Next Cycle Start Date</p>
              <div className="flex gap-2">
                <input type="date" value={nextCycleDate} onChange={e => setNextCycleDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                <button onClick={saveNextCycleDate} disabled={!nextCycleDate || savingCycleDate}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium">
                  {savingCycleDate ? '...' : 'Set & Notify'}
                </button>
              </div>
              {viewRoster?.next_cycle_start_date && (
                <p className="text-xs text-blue-500 mt-1">Current: {new Date(viewRoster.next_cycle_start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              )}
            </div>

            {/* Pending Payment */}
            {roster.filter(r => r.status === 'pending_payment').length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-amber-700 mb-2">⏳ Awaiting Payment ({roster.filter(r => r.status === 'pending_payment').length})</p>
                <div className="space-y-2">
                  {roster.filter(r => r.status === 'pending_payment').map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.full_name}</p>
                        <p className="text-xs text-amber-600">Bank transfer pending</p>
                      </div>
                      <button onClick={() => confirmPayment(s.student_id, s.full_name)}
                        className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium">
                        ✓ Confirm Payment
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Next Cycle */}
            {roster.filter(r => r.status === 'pending_next_cycle').length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-blue-700 mb-2">🗓 Starting Next Cycle ({roster.filter(r => r.status === 'pending_next_cycle').length})</p>
                <div className="space-y-2">
                  {roster.filter(r => r.status === 'pending_next_cycle').map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.full_name}</p>
                        <p className="text-xs text-blue-600">
                          Starts: {viewRoster?.next_cycle_start_date
                            ? new Date(viewRoster.next_cycle_start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'Date not set'}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Confirmed</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enrolled students */}
            <div className="space-y-2 mb-4">
              <p className="text-sm font-semibold text-gray-700">Active ({roster.filter(r => r.status === 'active').length})</p>
              {roster.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No enrolled students</p>
              ) : (
                roster.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.full_name}</p>
                      {s.confirmed_next_month && <p className="text-xs text-green-600">✅ Confirmed next month</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getStatusBadgeColor(s.status)}`}>{s.status}</span>
                      {s.status === 'active' && <button onClick={() => removeEnrollment(s.student_id)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>}
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Waiting list */}
            {waitlist.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">📋 Waiting List ({waitlist.length})</p>
                <div className="space-y-2">
                  {waitlist.map((w, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <span className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center shrink-0">#{w.position}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{w.full_name}</p>
                        <p className="text-xs text-gray-400">Joined {new Date(w.joined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                  <input type="datetime-local" value={newSession.scheduled_at} onChange={e => setNewSession({...newSession, scheduled_at: e.target.value})}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Duration (min)</label>
                  <input type="number" value={newSession.duration_minutes} onChange={e => setNewSession({...newSession, duration_minutes: e.target.value})}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Location</label>
                  <div className="flex gap-2">
                    <input type="text" value={newSession.location} onChange={e => setNewSession({...newSession, location: e.target.value})}
                      placeholder="e.g. Court 1" className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
                    <button onClick={addSession} disabled={!newSession.scheduled_at}
                      className="px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg text-xs font-medium">Add</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {sessions.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No sessions yet</p>
              ) : (
                sessions.map(s => (
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
