'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils'
import { CheckCircle, XCircle, Clock } from 'lucide-react'

interface Program {
  id: string
  title: string
}

interface Session {
  id: string
  scheduled_at: string
  duration_minutes: number | null
  location: string | null
}

interface Student {
  id: string
  full_name: string
}

type AttendanceStatus = 'present' | 'absent' | 'late'

export default function AttendancePage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedProgram, setSelectedProgram] = useState('')
  const [selectedSession, setSelectedSession] = useState('')
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadPrograms() {
      const supabase = createClient()
      const { data } = await supabase
        .from('programs')
        .select('id, title')
        .eq('is_active', true)
        .order('title')
      setPrograms(data || [])
    }
    loadPrograms()
  }, [])

  async function handleProgramChange(programId: string) {
    setSelectedProgram(programId)
    setSelectedSession('')
    setStudents([])
    setAttendance({})
    if (!programId) { setSessions([]); return }

    const supabase = createClient()
    const { data } = await supabase
      .from('program_sessions')
      .select('*')
      .eq('program_id', programId)
      .order('scheduled_at', { ascending: false })
    setSessions(data || [])
  }

  async function handleSessionChange(sessionId: string) {
    setSelectedSession(sessionId)
    if (!sessionId || !selectedProgram) return
    setLoading(true)
    const supabase = createClient()

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('student_id, profiles!enrollments_student_id_fkey(id, full_name)')
      .eq('program_id', selectedProgram)
      .eq('status', 'active')

    const studentList: Student[] = []
    if (enrollments) {
      for (const e of enrollments) {
        const p = e.profiles as { id?: string; full_name?: string } | null
        if (p?.id) studentList.push({ id: p.id, full_name: p.full_name || 'Unknown' })
      }
    }
    setStudents(studentList)

    const { data: existing } = await supabase
      .from('session_attendance')
      .select('student_id, status')
      .eq('session_id', sessionId)

    const map: Record<string, AttendanceStatus> = {}
    for (const a of existing || []) map[a.student_id] = a.status as AttendanceStatus
    for (const s of studentList) if (!map[s.id]) map[s.id] = 'absent'
    setAttendance(map)
    setLoading(false)
  }

  async function saveAttendance() {
    if (!selectedSession) return
    setSaving(true)
    const supabase = createClient()
    const records = students.map((s) => ({
      session_id: selectedSession,
      student_id: s.id,
      status: attendance[s.id] || 'absent',
    }))
    const { error } = await supabase
      .from('session_attendance')
      .upsert(records, { onConflict: 'session_id,student_id' })
    setSaving(false)
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

  const statusConfig = {
    present: { label: 'Present', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
    late:    { label: 'Late',    color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
    absent:  { label: 'Absent',  color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-500 text-sm mt-1">Mark session attendance for enrolled students</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
            <select
              value={selectedProgram}
              onChange={(e) => handleProgramChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="">Select a program...</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
            <select
              value={selectedSession}
              onChange={(e) => handleSessionChange(e.target.value)}
              disabled={!selectedProgram || sessions.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white disabled:opacity-50"
            >
              <option value="">
                {selectedProgram && sessions.length === 0 ? 'No sessions — add in Programs' : 'Select a session...'}
              </option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatDateTime(s.scheduled_at)}{s.location ? ` — ${s.location}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedSession && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Student Attendance ({students.length} students)
            </h2>
            <div className="flex items-center gap-3">
              {saved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
              <button
                onClick={saveAttendance}
                disabled={saving || students.length === 0}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg text-sm font-medium"
              >
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>
          {loading ? (
            <div className="py-8 text-center text-gray-400">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="py-8 text-center text-gray-400">No enrolled students for this program</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const current = attendance[student.id] || 'absent'
                  return (
                    <tr key={student.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 px-4 font-medium text-gray-900">{student.full_name}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {(['present', 'late', 'absent'] as AttendanceStatus[]).map((status) => {
                            const cfg = statusConfig[status]
                            const Icon = cfg.icon
                            return (
                              <button
                                key={status}
                                onClick={() => setAttendance(prev => ({ ...prev, [student.id]: status }))}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                  current === status ? cfg.color : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <Icon size={14} />{cfg.label}
                              </button>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {selectedSession && students.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {(['present', 'late', 'absent'] as AttendanceStatus[]).map((status) => {
            const count = Object.values(attendance).filter(s => s === status).length
            const cfg = statusConfig[status]
            return (
              <div key={status} className={`rounded-xl border p-4 text-center ${cfg.color}`}>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm font-medium capitalize">{status}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
