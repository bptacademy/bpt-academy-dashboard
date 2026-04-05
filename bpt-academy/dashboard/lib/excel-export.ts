import * as XLSX from 'xlsx'

interface SummaryData {
  totalRevenue: number
  newEnrollments: number
  activeStudents: number
  sessionsHeld: number
  period: string
}

interface DivisionData {
  division: string
  revenue: number
  students: number
}

interface TopStudent {
  name: string
  division: string
  rankingPoints: number
  enrollments: number
}

export function exportReportsToExcel(
  summary: SummaryData,
  revenueByDivision: DivisionData[],
  studentsByDivision: DivisionData[],
  topStudents: TopStudent[]
) {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Summary
  const summaryData = [
    ['BPT Academy Report', ''],
    ['Period', summary.period],
    ['', ''],
    ['Metric', 'Value'],
    ['Total Revenue', `£${summary.totalRevenue.toFixed(2)}`],
    ['New Enrollments', summary.newEnrollments],
    ['Active Students', summary.activeStudents],
    ['Sessions Held', summary.sessionsHeld],
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
  ws1['!cols'] = [{ wch: 20 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'Summary')

  // Sheet 2: Revenue by Division
  const revenueData = [
    ['Division', 'Revenue (£)'],
    ...revenueByDivision.map((d) => [d.division, d.revenue]),
  ]
  const ws2 = XLSX.utils.aoa_to_sheet(revenueData)
  ws2['!cols'] = [{ wch: 20 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, ws2, 'Revenue by Division')

  // Sheet 3: Students by Division
  const studentsData = [
    ['Division', 'Students'],
    ...studentsByDivision.map((d) => [d.division, d.students]),
  ]
  const ws3 = XLSX.utils.aoa_to_sheet(studentsData)
  ws3['!cols'] = [{ wch: 20 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, ws3, 'Students by Division')

  // Sheet 4: Top Students
  const topStudentsData = [
    ['Name', 'Division', 'Ranking Points', 'Enrollments'],
    ...topStudents.map((s) => [s.name, s.division, s.rankingPoints, s.enrollments]),
  ]
  const ws4 = XLSX.utils.aoa_to_sheet(topStudentsData)
  ws4['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, ws4, 'Top Students')

  // Write file
  const filename = `bpt-academy-report-${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, filename)
}
