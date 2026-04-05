'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, getStatusBadgeColor } from '@/lib/utils'
import { DollarSign } from 'lucide-react'

interface Payment {
  id: string
  amount: number
  status: string
  stripe_payment_id: string | null
  created_at: string
  student_name: string
  program_title: string
}

type StatusFilter = 'all' | 'paid' | 'pending' | 'failed'

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalPending, setTotalPending] = useState(0)

  useEffect(() => {
    async function fetchPayments() {
      setLoading(true)
      const supabase = createClient()

      let query = supabase
        .from('payments')
        .select(`
          id,
          amount,
          status,
          stripe_payment_id,
          created_at,
          profiles!payments_student_id_fkey(full_name),
          programs!payments_program_id_fkey(title)
        `)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data } = await query

      if (data) {
        const parsed = data.map((p: Record<string, unknown>) => {
          const profile = p.profiles as { full_name?: string } | null
          const program = p.programs as { title?: string } | null
          return {
            id: String(p.id),
            amount: Number(p.amount) || 0,
            status: String(p.status),
            stripe_payment_id: p.stripe_payment_id ? String(p.stripe_payment_id) : null,
            created_at: String(p.created_at),
            student_name: profile?.full_name || 'Unknown',
            program_title: program?.title || 'Unknown',
          }
        })
        setPayments(parsed)

        const revenue = parsed
          .filter((p) => p.status === 'paid')
          .reduce((sum, p) => sum + p.amount, 0)
        setTotalRevenue(revenue)

        const pending = parsed
          .filter((p) => p.status === 'pending')
          .reduce((sum, p) => sum + p.amount, 0)
        setTotalPending(pending)
      }

      setLoading(false)
    }

    fetchPayments()
  }, [statusFilter])

  const filters: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Paid', value: 'paid' },
    { label: 'Pending', value: 'pending' },
    { label: 'Failed', value: 'failed' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-500 text-sm mt-1">
          Track all payment transactions
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <DollarSign size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {loading ? '...' : formatCurrency(totalRevenue)}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
            <DollarSign size={18} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {loading ? '...' : formatCurrency(totalPending)}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <DollarSign size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Transactions</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {loading ? '...' : payments.length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-green-500 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Payments table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Program
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    No payments found
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {payment.student_name}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {payment.program_title}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadgeColor(
                          payment.status
                        )}`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {formatDate(payment.created_at)}
                    </td>
                    <td className="py-3 px-4 text-gray-400 font-mono text-xs">
                      {payment.stripe_payment_id
                        ? payment.stripe_payment_id.slice(0, 16) + '...'
                        : '—'}
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
