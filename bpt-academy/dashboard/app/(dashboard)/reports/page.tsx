'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RevenueChart } from '@/components/charts/revenue-chart'
import { DivisionPieChart, DivisionBarChart } from '@/components/charts/division-chart'
import { formatCurrency } from '@/lib/utils'
import { Download, TrendingUp, Users, BookOpen, Calendar } from 'lucide-react'

interface SummaryStats {
  totalRevenue: number
  newEnrollments: number
  activeStudents: number
  sessionsHeld: number
}

interface DivisionData {
  division: string
  value: number
}

interface TopStudent {
  id: string
  full_name: string
  division: string | null
  ranking_points: number | null
  enrollment_count: number
}

interface RevenueMonth {
  month: string
  revenue: number
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly')
  const [summary, setSummary] = useState<SummaryStats>({
    totalRevenue: 0,
    newEnrollments: 0,
    activeStudents: 0,
    sessionsHeld: 0,
  })
  const [revenueByDivision, setRevenueByDivision] = useState<DivisionData[]>([])
  const [studentsByDivision, setStudentsByDivision] = useState<DivisionData[]>([])
  const [topStudents, setTopStudents] = useState<TopStudent[]>([])
  const [revenueTimeline, setRevenueTimeline] = useState<RevenueMonth[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  async function fetchReports() {
    setLoading(true)
    const supabase = createClient()

    const now = new Date()
    let startDate: Date

    if (period === 'weekly') {
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 7)
    } else {
      startDate = new Date(now)
      startDate.setMonth(now.getMonth() - 1)
    }

    const startStr = startDate.toISOString()

    // Total revenue
    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'paid')
      .gte('created_at', startStr)

    const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    // New enrollments
    const { count: newEnrollments } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .gte('enrolled_at', startStr)

    // Active students (those with active enrollments)
    const { count: activeStudents } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student')

    // Sessions held
    const { count: sessionsHeld } = await supabase
      .from('program_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('scheduled_at', startStr)
      .lte('scheduled_at', now.toISOString())

    setSummary({
      totalRevenue,
      newEnrollments: newEnrollments || 0,
      activeStudents: activeStudents || 0,
      sessionsHeld: sessionsHeld || 0,
    })

    // Revenue by division — join payments → enrollments → programs
    const { data: divPayments } = await supabase
      .from('payments')
      .select(`
        amount,
        programs!payments_program_id_fkey(division)
      `)
      .eq('status', 'paid')
      .gte('created_at', startStr)

    const divRevenueMap: Record<string, number> = {}
    if (divPayments) {
      for (const p of divPayments) {
        const prog = p.programs as { division?: string } | null
        const div = prog?.division || 'Other'
        divRevenueMap[div] = (divRevenueMap[div] || 0) + (p.amount || 0)
      }
    }
    setRevenueByDivision(
      Object.entries(divRevenueMap).map(([division, value]) => ({
        division,
        value,
      }))
    )

    // Students by division
    const { data: studentDivs } = await supabase
      .from('profiles')
      .select('division')
      .eq('role', 'student')

    const divStudentMap: Record<string, number> = {}
    if (studentDivs) {
      for (const s of studentDivs) {
        const div = s.division || 'Unassigned'
        divStudentMap[div] = (divStudentMap[div] || 0) + 1
      }
    }
    setStudentsByDivision(
      Object.entries(divStudentMap).map(([division, value]) => ({
        division,
        value,
      }))
    )

    // Top students by ranking points
    const { data: topData } = await supabase
      .from('profiles')
      .select('id, full_name, division, ranking_points')
      .eq('role', 'student')
      .order('ranking_points', { ascending: false })
      .limit(10)

    if (topData) {
      const enriched = await Promise.all(
        topData.map(async (s: { id: string; full_name: string; division: string | null; ranking_points: number | null }) => {
          const { count } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', s.id)
          return { ...s, enrollment_count: count || 0 }
        })
      )
      setTopStudents(enriched)
    }

    // Revenue timeline
    const months: RevenueMonth[] = []
    const numPeriods = period === 'weekly' ? 7 : 6

    if (period === 'weekly') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)

        const { data: dp } = await supabase
          .from('payments')
          .select('amount')
          .eq('status', 'paid')
          .gte('created_at', dayStart.toISOString())
          .lt('created_at', dayEnd.toISOString())

        const revenue = dp?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
        months.push({
          month: d.toLocaleString('default', { weekday: 'short' }),
          revenue,
        })
      }
    } else {
      for (let i = numPeriods - 1; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const start = new Date(d.getFullYear(), d.getMonth(), 1)
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)

        const { data: dp } = await supabase
          .from('payments')
          .select('amount')
          .eq('status', 'paid')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())

        const revenue = dp?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
        months.push({
          month: d.toLocaleString('default', { month: 'short' }),
          revenue,
        })
      }
    }
    setRevenueTimeline(months)

    setLoading(false)
  }

  async function handleExport() {
    // Dynamic import to keep bundle smaller
    const { exportReportsToExcel } = await import('@/lib/excel-export')
    exportReportsToExcel(
      {
        totalRevenue: summary.totalRevenue,
        newEnrollments: summary.newEnrollments,
        activeStudents: summary.activeStudents,
        sessionsHeld: summary.sessionsHeld,
        period: period === 'weekly' ? 'Last 7 Days' : 'Last 30 Days',
      },
      revenueByDivision.map((d) => ({
        division: d.division,
        revenue: d.value,
        students: 0,
      })),
      studentsByDivision.map((d) => ({
        division: d.division,
        revenue: 0,
        students: d.value,
      })),
      topStudents.map((s) => ({
        name: s.full_name,
        division: s.division || 'N/A',
        rankingPoints: s.ranking_points || 0,
        enrollments: s.enrollment_count,
      }))
    )
  }

  const statsCards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(summary.totalRevenue),
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'New Enrollments',
      value: summary.newEnrollments,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Active Students',
      value: summary.activeStudents,
      icon: BookOpen,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Sessions Held',
      value: summary.sessionsHeld,
      icon: Calendar,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 text-sm mt-1">
            Analytics and performance insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Toggle */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {(['weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                  period === p
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={16} />
            Export Excel
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4"
            >
              <div
                className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center shrink-0`}
              >
                <Icon size={18} className={card.color} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">
                  {loading ? '...' : card.value}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            Revenue Over Time
          </h2>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              Loading...
            </div>
          ) : (
            <RevenueChart data={revenueTimeline} />
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            Students by Division
          </h2>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              Loading...
            </div>
          ) : studentsByDivision.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No data
            </div>
          ) : (
            <DivisionPieChart
              data={studentsByDivision.map((d) => ({
                division: d.division,
                value: d.value,
              }))}
            />
          )}
        </div>
      </div>

      {/* Revenue by Division */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">
          Revenue by Division
        </h2>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-gray-400">
            Loading...
          </div>
        ) : revenueByDivision.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-gray-400">
            No revenue data
          </div>
        ) : (
          <DivisionBarChart data={revenueByDivision} valuePrefix="£" />
        )}
      </div>

      {/* Top Students */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">
            Top Students by Ranking Points
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Division
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Points
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Enrollments
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : topStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No students found
                  </td>
                </tr>
              ) : (
                topStudents.map((student, i) => (
                  <tr
                    key={student.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-bold ${
                          i === 0
                            ? 'bg-yellow-100 text-yellow-700'
                            : i === 1
                            ? 'bg-gray-100 text-gray-600'
                            : i === 2
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-transparent text-gray-500'
                        }`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {student.full_name}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {student.division || '—'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-green-600">
                      {student.ranking_points ?? 0}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {student.enrollment_count}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
