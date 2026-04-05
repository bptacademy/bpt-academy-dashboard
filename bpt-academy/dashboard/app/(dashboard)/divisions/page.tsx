'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DIVISIONS, DIVISION_LABELS, SKILL_LEVELS, SKILL_LEVEL_LABELS, getLevelLabel } from '@/lib/constants'

interface DivisionStat {
  division: string
  total: number
  bySkillLevel: Record<string, number>
}

interface StudentRow {
  id: string
  full_name: string
  division: string | null
  skill_level: string | null
  ranking_points: number | null
}

const DIVISION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  amateur:       { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  semi_pro:      { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  pro:           { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  junior_9_11:   { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  junior_12_15:  { bg: 'bg-pink-50',   text: 'text-pink-700',   border: 'border-pink-200' },
  junior_15_18:  { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
}

export default function DivisionsPage() {
  const [stats, setStats] = useState<DivisionStat[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [unassigned, setUnassigned] = useState(0)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const supabase = createClient()

      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, division, skill_level, ranking_points')
        .eq('role', 'student')
        .order('ranking_points', { ascending: false })

      if (data) {
        setStudents(data as StudentRow[])

        // Build stats per division
        const divMap: Record<string, DivisionStat> = {}
        for (const d of DIVISIONS) {
          divMap[d] = { division: d, total: 0, bySkillLevel: {} }
        }

        let unassignedCount = 0
        for (const s of data as StudentRow[]) {
          if (!s.division) { unassignedCount++; continue }
          if (!divMap[s.division]) continue
          divMap[s.division].total++
          const lvl = s.skill_level || 'unknown'
          divMap[s.division].bySkillLevel[lvl] = (divMap[s.division].bySkillLevel[lvl] || 0) + 1
        }

        setStats(Object.values(divMap))
        setUnassigned(unassignedCount)
      }

      setLoading(false)
    }
    fetchData()
  }, [])

  const filteredStudents = selectedDivision
    ? students.filter(s => s.division === selectedDivision)
    : students.filter(s => !s.division) // show unassigned when null selected

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Divisions</h1>
        <p className="text-gray-500 text-sm mt-1">
          Overview of all student divisions and skill levels
        </p>
      </div>

      {/* Division cards */}
      {loading ? (
        <div className="py-12 text-center text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {stats.map((stat) => {
            const colors = DIVISION_COLORS[stat.division] ?? { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
            const isSelected = selectedDivision === stat.division
            return (
              <button
                key={stat.division}
                onClick={() => setSelectedDivision(isSelected ? null : stat.division)}
                className={`text-left rounded-xl border-2 p-5 transition-all ${colors.bg} ${colors.border} ${
                  isSelected ? 'ring-2 ring-offset-2 ring-green-500' : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className={`font-bold text-lg ${colors.text}`}>
                    {DIVISION_LABELS[stat.division as keyof typeof DIVISION_LABELS]}
                  </h3>
                  <span className={`text-2xl font-bold ${colors.text}`}>{stat.total}</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  {stat.total === 1 ? '1 student' : `${stat.total} students`}
                </p>
                {stat.division === 'amateur' && Object.keys(stat.bySkillLevel).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {SKILL_LEVELS.map(lvl => (
                      stat.bySkillLevel[lvl] ? (
                        <span key={lvl} className="text-xs bg-white/70 px-2 py-0.5 rounded-full text-gray-600">
                          {SKILL_LEVEL_LABELS[lvl]}: {stat.bySkillLevel[lvl]}
                        </span>
                      ) : null
                    ))}
                  </div>
                )}
                {isSelected && (
                  <p className="text-xs text-green-600 font-medium mt-2">● Showing students below</p>
                )}
              </button>
            )
          })}

          {/* Unassigned card */}
          <button
            onClick={() => setSelectedDivision(selectedDivision === null ? undefined as any : null)}
            className={`text-left rounded-xl border-2 p-5 transition-all bg-gray-50 border-gray-200 ${
              selectedDivision === null ? 'ring-2 ring-offset-2 ring-green-500' : 'hover:shadow-md'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-bold text-lg text-gray-600">Unassigned</h3>
              <span className="text-2xl font-bold text-gray-600">{unassigned}</span>
            </div>
            <p className="text-xs text-gray-500">Students without a division</p>
            {selectedDivision === null && (
              <p className="text-xs text-green-600 font-medium mt-2">● Showing students below</p>
            )}
          </button>
        </div>
      )}

      {/* Student list for selected division */}
      {(selectedDivision !== undefined) && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">
              {selectedDivision
                ? `${DIVISION_LABELS[selectedDivision as keyof typeof DIVISION_LABELS]} — Students`
                : 'Unassigned Students'}
              <span className="ml-2 text-gray-400 font-normal text-sm">({filteredStudents.length})</span>
            </h2>
          </div>
          {filteredStudents.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">No students in this division</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Level</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ranking Points</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, i) => (
                  <tr key={s.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <span className="text-green-700 text-xs font-bold">
                            {(s.full_name || '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{s.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {getLevelLabel(s.division, s.skill_level)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{s.ranking_points ?? 0}</span>
                        {i === 0 && (s.ranking_points ?? 0) > 0 && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">🏆 Top</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
