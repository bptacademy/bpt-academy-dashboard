'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, getStatusBadgeColor } from '@/lib/utils'
import { DollarSign } from 'lucide-react'

interface Payment {
  id: string
  amount: number
  status: string
  stripe_payment_id: string | null
  method: string | null
  bank_reference: string | null
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
  const [totalFailed, setTotalFailed] = useState(0)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('payments')
      .select(`
        id,
        amount,
        status,
        stripe_payment_id,
        method,
        bank_reference,
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
          method: p.method ? String(p.method) : null,
          bank_reference: p.bank_reference ? String(p.bank_reference) : null,
          created_at: String(p.created_at),
          student_name: profile?.full_name || 'Unknown',
          program_title: program?.title || 'Unknown',
        }
      })
      setPayments(parsed)

      // Compute totals from all payments (not filtered) for summary cards
      // Re-fetch all for summary — or compute from whatever we have
      const revenue = parsed
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0)
      setTotalRevenue(revenue)

      const pending = parsed
        .filter((p) => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0)
      setTotalPending(pending)

      const failed = parsed
        .filter((p) => p.status === 'failed')
        .reduce((sum, p) => sum + p.amount, 0)
      setTotalFailed(failed)
    }

    setLoading(false)
  }, [statusFilter])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  async function updatePaymentStatus(id: string, newStatus: 'paid' | 'failed') {
    setUpdatingId(id)
    const supabase = createClient()
    await supabase.from('payments').update({ status: newStatus }).eq('id', id)
    setUpdatingId(null)
    fetchPayments()
  }

  function formatMethod(method: string | null): string {
    if (!method) return '—'
    if (method === 'card') return '💳 Card'
    if (method === 'bank_transfer') return '🏦 Bank Transfer'
    return method
  }

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
            <DollarSign size={18} className="text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Failed</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {loading ? '...' : formatCurrency(totalFailed)}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
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
                  Method
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Bank Ref
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400">
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
                    <td className="py-3 px-4 text-gray-600 text-xs whitespace-nowrap">
                      {formatMethod(payment.method)}
                    </td>
                    <td className="py-3 px-4 text-gray-500 font-mono text-xs">
                      {payment.bank_reference || '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {formatDate(payment.created_at)}
                    </td>
                    <td className="py-3 px-4 text-gray-400 font-mono text-xs">
                      {payment.stripe_payment_id
                        ? payment.stripe_payment_id.slice(0, 16) + '...'
                        : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {payment.status === 'pending' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => updatePaymentStatus(payment.id, 'paid')}
                            disabled={updatingId === payment.id}
                            className="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs font-medium disabled:opacity-50 whitespace-nowrap"
                            title="Mark as Paid"
                          >
                            ✓ Mark Paid
                          </button>
                          <button
                            onClick={() => updatePaymentStatus(payment.id, 'failed')}
                            disabled={updatingId === payment.id}
                            className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-medium disabled:opacity-50 whitespace-nowrap"
                            title="Mark as Failed"
                          >
                            ✗ Fail
                          </button>
                        </div>
                      )}
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
