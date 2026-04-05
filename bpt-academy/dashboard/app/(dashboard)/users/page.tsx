'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate, getInitials, getRoleBadgeColor } from '@/lib/utils'
import { Search, X, Plus } from 'lucide-react'
import { DIVISIONS, DIVISION_LABELS, SKILL_LEVELS, SKILL_LEVEL_LABELS, getLevelLabel } from '@/lib/constants'

type UserRole = 'student' | 'coach' | 'admin' | 'super_admin'

interface Profile {
  id: string
  full_name: string
  role: UserRole
  division: string | null
  skill_level: string | null
  ranking_points: number | null
  avatar_url: string | null
  created_at: string
}

const ROLES: UserRole[] = ['student', 'coach', 'admin', 'super_admin']

const emptyNewUser = {
  full_name: '',
  email: '',
  password: '',
  role: 'student' as UserRole,
  division: '',
  skill_level: '',
}

export default function UsersPage() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'student' | 'coach' | 'admin'>('student')
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [divisionFilter, setDivisionFilter] = useState('')
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [editData, setEditData] = useState<Partial<Profile>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState(emptyNewUser)
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)

  // Open Add Student modal if ?add=student in URL
  useEffect(() => {
    if (searchParams.get('add') === 'student') {
      setShowAddUser(true)
      setNewUser({ ...emptyNewUser, role: 'student' })
    }
  }, [searchParams])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const roles = tab === 'admin' ? ['admin', 'super_admin'] : [tab]
    let query = supabase.from('profiles').select('*').in('role', roles).order('created_at', { ascending: false })
    if (divisionFilter) query = query.eq('division', divisionFilter)
    const { data } = await query
    setUsers(data || [])
    setLoading(false)
  }, [tab, divisionFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // Search by name only (no email column in profiles)
  const filtered = users.filter((u) =>
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  async function saveUser() {
    if (!selectedUser) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({
      role: editData.role,
      division: editData.division || null,
      skill_level: editData.skill_level || null,
    }).eq('id', selectedUser.id)
    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('User updated successfully')
      fetchUsers()
      setTimeout(() => { setSelectedUser(null); setMessage('') }, 1500)
    }
    setSaving(false)
  }

  async function promoteUser(userId: string, newRole: UserRole) {
    const supabase = createClient()
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    fetchUsers()
  }

  async function addUser() {
    setAddError('')
    if (!newUser.full_name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      setAddError('Name, email and password are required')
      return
    }
    setAdding(true)
    const supabase = createClient()

    // Create auth user via admin API (service role needed — use server action pattern)
    // For now use signUp which will create both auth + profile trigger
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: newUser.email.trim(),
      password: newUser.password.trim(),
      options: {
        data: {
          full_name: newUser.full_name.trim(),
          role: newUser.role,
        },
      },
    })

    if (signUpErr) {
      setAddError(signUpErr.message)
      setAdding(false)
      return
    }

    // Update profile with division/skill_level if set
    if (signUpData.user && (newUser.division || newUser.role !== 'student')) {
      await supabase.from('profiles').update({
        role: newUser.role,
        division: newUser.division || null,
        skill_level: newUser.skill_level || null,
      }).eq('id', signUpData.user.id)
    }

    setAdding(false)
    setShowAddUser(false)
    setNewUser(emptyNewUser)
    fetchUsers()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm mt-1">Manage students, coaches, and admins</p>
        </div>
        <button onClick={() => { setShowAddUser(true); setAddError(''); setNewUser(emptyNewUser) }}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} />Add User
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['student', 'coach', 'admin'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'admin' ? 'Admins' : t === 'coach' ? 'Coaches' : 'Students'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-64" />
        </div>
        {tab === 'student' && (
          <select value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
            <option value="">All Divisions</option>
            {DIVISIONS.map((d) => <option key={d} value={d}>{DIVISION_LABELS[d]}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Division</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Points</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">No users found</td></tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center overflow-hidden shrink-0">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-green-700 text-xs font-medium">{getInitials(user.full_name || '')}</span>
                          )}
                        </div>
                        <span className="font-medium text-gray-900">{user.full_name || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadgeColor(user.role)}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{getLevelLabel(user.division, user.skill_level)}</td>
                    <td className="py-3 px-4 text-gray-500">{user.ranking_points ?? '—'}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(user.created_at)}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => { setSelectedUser(user); setEditData({ role: user.role, division: user.division, skill_level: user.skill_level }) }}
                        className="text-green-600 hover:text-green-800 text-xs font-medium">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Add New User</h2>
              <button onClick={() => setShowAddUser(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {addError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{addError}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input type="text" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="e.g. John Smith"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Temporary password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole, division: '', skill_level: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                  {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </select>
              </div>
              {newUser.role === 'student' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                    <select value={newUser.division} onChange={(e) => setNewUser({ ...newUser, division: e.target.value, skill_level: '' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                      <option value="">Select division (optional)</option>
                      {DIVISIONS.map((d) => <option key={d} value={d}>{DIVISION_LABELS[d]}</option>)}
                    </select>
                  </div>
                  {newUser.division === 'amateur' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Skill Level</label>
                      <select value={newUser.skill_level} onChange={(e) => setNewUser({ ...newUser, skill_level: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                        <option value="">Select level</option>
                        {SKILL_LEVELS.map((s) => <option key={s} value={s}>{SKILL_LEVEL_LABELS[s]}</option>)}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddUser(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={addUser} disabled={adding}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg text-sm font-medium">
                {adding ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Edit User</h2>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-700 font-medium">{getInitials(selectedUser.full_name || '')}</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{selectedUser.full_name}</p>
                <p className="text-sm text-gray-500 capitalize">{selectedUser.role.replace('_', ' ')}</p>
              </div>
            </div>

            {message && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {message}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={editData.role || ''} onChange={(e) => setEditData({ ...editData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                <select value={editData.division || ''} onChange={(e) => setEditData({ ...editData, division: e.target.value, skill_level: e.target.value !== 'amateur' ? null : editData.skill_level })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">No Division</option>
                  {DIVISIONS.map((d) => <option key={d} value={d}>{DIVISION_LABELS[d]}</option>)}
                </select>
              </div>
              {editData.division === 'amateur' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Skill Level</label>
                  <select value={editData.skill_level || ''} onChange={(e) => setEditData({ ...editData, skill_level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">No Skill Level</option>
                    {SKILL_LEVELS.map((s) => <option key={s} value={s}>{SKILL_LEVEL_LABELS[s]}</option>)}
                  </select>
                </div>
              )}
              {editData.role === 'student' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-medium text-amber-800 mb-1">⚠️ Manual Division Change</p>
                  <p className="text-xs text-amber-700">Changing division here overrides the automatic promotion system.</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-2">Quick Role Change</p>
              <div className="flex flex-wrap gap-2">
                {ROLES.filter((r) => r !== selectedUser.role).map((r) => (
                  <button key={r} onClick={() => { promoteUser(selectedUser.id, r); setSelectedUser(null) }}
                    className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 capitalize">
                    Make {r.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setSelectedUser(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={saveUser} disabled={saving}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg text-sm font-medium">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
