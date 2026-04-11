'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatsCard } from '@/components/stats-card'
import { RevenueChart } from '@/components/charts/revenue-chart'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Users, BookOpen, DollarSign, Calendar, Plus, Megaphone, Clock, AlertTriangle, Shield } from 'lucide-react'
import Link from 'next/link'

type EnrollmentRow = {
  id: string
  student_name: string
  program_title: string
  enrolled_at: string
  status: string
}

interface RevenueMonth {
  month: string
  revenue: number
}

interface AttendanceDueRow {
  session_id: string
  program_title: string
  scheduled_at: string
  attendance_deadline: string
}

interface PenaltyRow {
  coach_id: string
  coach_name: string
  program_id: string
  program_title: string
  strike_count: number
}

function hoursRemaining(deadline: string): number {
  return (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60)
}

function formatDeadline(deadline: string): string {
  return new Date(deadline).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function currentMonthLabel(): string {
  return new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' })
}

function currentMonthFormat(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activePrograms: 0,
    revenueThisMonth: 0,
    upcomingSessions: 0,
  })
  const [recentEnrollments, setRecentEnrollments] = useState<EnrollmentRow[]>([])
  const [revenueData, setRevenueData] = useState<RevenueMonth[]>([])
  const [loading, setLoading] = useState(true)

  const [attendanceDue, setAttendanceDue] = useState<AttendanceDueRow[]>([])
  const [attendanceDueLoading, setAttendanceDueLoading] = useState(true)

  const [penalties, setPenalties] = useState<PenaltyRow[]>([])
  const [penaltiesLoading, setPenaltiesLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Current user role
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        setUserRole(profile?.role || '')
      }

      // Total students
      const { count: studentCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')

      // Active programs — use is_active (boolean), not status
      const { count: activeProgramCount } = await supabase
        .from('programs')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Revenue this month — column is amount_gbp
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: monthPayments } = await supabase
        .from('payments')
        .select('amount_gbp')
        .eq('status', 'paid')
        .gte('created_at', startOfMonth.toISOString())

      const revenueThisMonth =
        (monthPayments ?? []).reduce((sum: number, p: { amount_gbp: number }) => sum + (p.amount_gbp || 0), 0)

      // Upcoming sessions
      const { count: upcomingCount } = await supabase
        .from('program_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_at', new Date().toISOString())

      setStats({
        totalStudents: studentCount || 0,
        activePrograms: activeProgramCount || 0,
        revenueThisMonth,
        upcomingSessions: upcomingCount || 0,
      })

      // Recent enrollments
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          id,
          enrolled_at,
          status,
          profiles!enrollments_student_id_fkey(full_name),
          programs!enrollments_program_id_fkey(title)
        `)
        .order('enrolled_at', { ascending: false })
        .limit(10)

      if (enrollments) {
        setRecentEnrollments(
          (enrollments as any[]).map((e) => ({
            id: String(e.id),
            student_name: e.profiles?.full_name || 'Unknown',
            program_title: e.programs?.title || 'Unknown',
            enrolled_at: String(e.enrolled_at),
            status: String(e.status),
          }))
        )
      }

      // Revenue last 6 months — column is amount_gbp
      const months: RevenueMonth[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const start = new Date(d.getFullYear(), d.getMonth(), 1)
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)

        const { data: payments } = await supabase
          .from('payments')
          .select('amount_gbp')
          .eq('status', 'paid')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())

        const revenue = (payments ?? []).reduce((sum: number, p: { amount_gbp: number }) => sum + (p.amount_gbp || 0), 0)
        months.push({
          month: d.toLocaleString('default', { month: 'short' }),
          revenue,
        })
      }
      setRevenueData(months)
      setLoading(false)
    }

    fetchData()
  }, [])

  // Attendance due panel
  useEffect(() => {
    async function fetchAttendanceDue() {
      setAttendanceDueLoading(true)
      const supabase = createClient()
      const now = new Date().toISOString()

      const { data } = await supabase
        .from('program_sessions')
        .select('id, scheduled_at, attendance_deadline, programs!program_sessions_program_id_fkey(title)')
        .eq('attendance_completed', false)
        .gt('attendance_deadline', now)
        .lt('scheduled_at', now)
        .order('attendance_deadline', { ascending: true })

      if (data) {
        setAttendanceDue(
          (data as any[]).map((row) => ({
            session_id: row.id,
            program_title: row.programs?.title || 'Unknown',
            scheduled_at: row.scheduled_at,
            attendance_deadline: row.attendance_deadline,
          }))
        )
      }
      setAttendanceDueLoading(false)
    }
    fetchAttendanceDue()
  }, [])

  // Coach penalties panel
  useEffect(() => {
    async function fetchPenalties() {
      setPenaltiesLoading(true)
      const supabase = createClient()
      const month = currentMonthFormat()

      const { data } = await supabase
        .from('coach_penalties')
        .select('coach_id, program_id, strike_count, profiles!coach_penalties_coach_id_fkey(full_name), programs!coach_penalties_program_id_fkey(title)')
        .eq('month', month)
        .order('strike_count', { ascending: false })

      if (data) {
        // Group by coach+program, keep highest strike_count
        const map = new Map<string, PenaltyRow>()
        for (const row of data as any[]) {
          const key = `${row.coach_id}:${row.program_id}`
          const existing = map.get(key)
          if (!existing || row.strike_count > existing.strike_count) {
            map.set(key, {
              coach_id: row.coach_id,
              coach_name: row.profiles?.full_name || 'Unknown',
              program_id: row.program_id,
              program_title: row.programs?.title || 'Unknown',
              strike_count: row.strike_count,
            })
          }
        }
        setPenalties(Array.from(map.values()).sort((a, b) => b.strike_count - a.strike_count))
      }
      setPenaltiesLoading(false)
    }
    fetchPenalties()
  }, [])

  const isAdminOrSuper = userRole === 'admin' || userRole === 'super_admin'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome back. Here&apos;s what&apos;s happening at BPT Academy.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard title="Total Students" value={loading ? '...' : stats.totalStudents} icon={Users} description="Registered students" />
        <StatsCard title="Active Programs" value={loading ? '...' : stats.activePrograms} icon={BookOpen} description="Currently running" />
        <StatsCard title="Revenue This Month" value={loading ? '...' : formatCurrency(stats.revenueThisMonth)} icon={DollarSign} description="Paid payments" />
        <StatsCard title="Upcoming Sessions" value={loading ? '...' : stats.upcomingSessions} icon={Calendar} description="Scheduled sessions" />
      </div>

      {/* Attendance Due Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-yellow-500" />
          <h2 className="font-semibold text-gray-900">⏰ Attendance Required</h2>
        </div>
        {attendanceDueLoading ? (
          <div className="py-4 text-center text-gray-400 text-sm">Loading...</div>
        ) : attendanceDue.length === 0 ? (
          <div className="py-4 text-center text-gray-400 text-sm">No attendance pending ✅</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Program</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Session</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Deadline</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hours Remaining</th>
                </tr>
              </thead>
              <tbody>
                {attendanceDue.map((row) => {
                  const hours = hoursRemaining(row.attendance_deadline)
                  const isUrgent = hours <= 4
                  return (
                    <tr
                      key={row.session_id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => window.location.href = '/attendance'}
                    >
                      <td className="py-2 px-3 text-gray-900 font-medium">{row.program_title}</td>
                      <td className="py-2 px-3 text-gray-600">
                        {new Date(row.scheduled_at).toLocaleString('en-GB', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="py-2 px-3 text-gray-500">{formatDeadline(row.attendance_deadline)}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          isUrgent
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          <Clock size={11} />
                          {hours.toFixed(1)}h
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Coach Penalties Panel — admin/super_admin only */}
      {isAdminOrSuper && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-red-500" />
            <h2 className="font-semibold text-gray-900">🚨 Coach Penalties — {currentMonthLabel()}</h2>
          </div>
          {penaltiesLoading ? (
            <div className="py-4 text-center text-gray-400 text-sm">Loading...</div>
          ) : penalties.length === 0 ? (
            <div className="py-4 text-center text-gray-400 text-sm">No penalties this month ✅</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Coach</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Program</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Strikes</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {penalties.map((row) => (
                    <tr key={`${row.coach_id}:${row.program_id}`} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 px-3 text-gray-900 font-medium flex items-center gap-1.5">
                        <Shield size={13} className="text-gray-400" />
                        {row.coach_name}
                      </td>
                      <td className="py-2 px-3 text-gray-600">{row.program_title}</td>
                      <td className="py-2 px-3 text-gray-700 font-semibold">{row.strike_count}</td>
                      <td className="py-2 px-3">
                        {row.strike_count >= 2 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            🔴 Review Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                            🟡 Warning
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/users?add=student"
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} />Add Student
        </Link>
        <Link href="/programs"
          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <BookOpen size={16} />New Program
        </Link>
        <Link href="/messaging"
          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Megaphone size={16} />Send Announcement
        </Link>
      </div>

      {/* Charts & Table */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Revenue — Last 6 Months</h2>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-gray-400">Loading chart...</div>
          ) : (
            <RevenueChart data={revenueData} />
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Enrollments</h2>
          {loading ? (
            <div className="py-8 text-center text-gray-400 text-sm">Loading...</div>
          ) : recentEnrollments.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">No enrollments yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Student</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Program</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Date</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEnrollments.map((e) => (
                    <tr key={e.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 px-3 text-gray-900">{e.student_name}</td>
                      <td className="py-2 px-3 text-gray-600">{e.program_title}</td>
                      <td className="py-2 px-3 text-gray-500">{formatDate(e.enrolled_at)}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          e.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>{e.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
