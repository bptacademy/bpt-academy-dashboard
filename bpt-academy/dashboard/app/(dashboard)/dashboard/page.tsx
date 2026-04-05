'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatsCard } from '@/components/stats-card'
import { RevenueChart } from '@/components/charts/revenue-chart'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Users, BookOpen, DollarSign, Calendar, Plus, Megaphone } from 'lucide-react'
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

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Total students
      const { count: studentCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')

      // Active programs
      const { count: activeProgramCount } = await supabase
        .from('programs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // Revenue this month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: monthPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'paid')
        .gte('created_at', startOfMonth.toISOString())

      const revenueThisMonth =
        (monthPayments ?? []).reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0)

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (enrollments as any[]).map((e) => ({
            id: String(e.id),
            student_name: e.profiles?.full_name || 'Unknown',
            program_title: e.programs?.title || 'Unknown',
            enrolled_at: String(e.enrolled_at),
            status: String(e.status),
          }))
        )
      }

      // Revenue last 6 months
      const months: RevenueMonth[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const start = new Date(d.getFullYear(), d.getMonth(), 1)
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)

        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('status', 'paid')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())

        const revenue = (payments ?? []).reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0)
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
        <StatsCard
          title="Total Students"
          value={loading ? '...' : stats.totalStudents}
          icon={Users}
          description="Registered students"
        />
        <StatsCard
          title="Active Programs"
          value={loading ? '...' : stats.activePrograms}
          icon={BookOpen}
          description="Currently running"
        />
        <StatsCard
          title="Revenue This Month"
          value={loading ? '...' : formatCurrency(stats.revenueThisMonth)}
          icon={DollarSign}
          description="Paid payments"
        />
        <StatsCard
          title="Upcoming Sessions"
          value={loading ? '...' : stats.upcomingSessions}
          icon={Calendar}
          description="Scheduled sessions"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/users"
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Student
        </Link>
        <Link
          href="/programs"
          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <BookOpen size={16} />
          New Program
        </Link>
        <Link
          href="/messaging"
          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Megaphone size={16} />
          Send Announcement
        </Link>
      </div>

      {/* Charts & Table */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            Revenue — Last 6 Months
          </h2>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              Loading chart...
            </div>
          ) : (
            <RevenueChart data={revenueData} />
          )}
        </div>

        {/* Recent Enrollments */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            Recent Enrollments
          </h2>
          {loading ? (
            <div className="py-8 text-center text-gray-400 text-sm">
              Loading...
            </div>
          ) : recentEnrollments.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">
              No enrollments yet
            </div>
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
                        }`}>
                          {e.status}
                        </span>
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
