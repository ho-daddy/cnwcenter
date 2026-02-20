import type { ReportData, ReportImprovement } from '../report-data'
import { HAZARD_CATEGORY_LABELS } from '@/lib/risk-assessment'

export function buildImprovementPlanHtml(data: ReportData): string {
  const { improvements } = data

  const planned = improvements.filter(i => i.status === 'PLANNED')
  const completed = improvements.filter(i => i.status === 'COMPLETED')

  let html = ''

  // 요약 통계
  html += `
  <div class="stat-grid">
    <div class="stat-card">
      <div class="label">전체 개선항목</div>
      <div class="value">${improvements.length}</div>
    </div>
    <div class="stat-card" style="border-color:#3b82f6;">
      <div class="label">개선 예정</div>
      <div class="value" style="color:#1e40af;">${planned.length}</div>
    </div>
    <div class="stat-card" style="border-color:#22c55e;">
      <div class="label">개선 완료</div>
      <div class="value" style="color:#15803d;">${completed.length}</div>
    </div>
    <div class="stat-card">
      <div class="label">완료율</div>
      <div class="value">${improvements.length > 0 ? Math.round((completed.length / improvements.length) * 100) : 0}%</div>
    </div>
  </div>`

  // 개선 예정 섹션
  if (planned.length > 0) {
    html += `<div class="section-title">개선 예정 (${planned.length}건)</div>`
    html += buildImprovementTable(planned)
  }

  // 개선 완료 섹션
  if (completed.length > 0) {
    if (planned.length > 0) html += `<div style="margin-top:10px;"></div>`
    html += `<div class="section-title">개선 완료 (${completed.length}건)</div>`
    html += buildImprovementTable(completed)
  }

  // 데이터가 없는 경우
  if (improvements.length === 0) {
    html += `<div style="text-align:center;padding:40px;color:#999;font-size:11pt;">등록된 개선항목이 없습니다.</div>`
  }

  return html
}

function buildImprovementTable(items: ReportImprovement[]): string {
  let html = `
  <table>
    <thead>
      <tr>
        <th style="width:3%">#</th>
        <th style="width:13%">평가단위</th>
        <th style="width:20%">유해위험요인</th>
        <th style="width:7%">위험분류</th>
        <th style="width:5%">최초<br/>점수</th>
        <th style="width:20%">개선내용</th>
        <th style="width:7%">담당자</th>
        <th style="width:8%">예정/<br/>완료일</th>
        <th style="width:5%">상태</th>
        <th style="width:5%">개선후<br/>점수</th>
        <th style="width:7%">비고</th>
      </tr>
    </thead>
    <tbody>`

  items.forEach((imp, idx) => {
    const catClass = `cat-${imp.hazardCategory.toLowerCase()}`
    const catLabel = HAZARD_CATEGORY_LABELS[imp.hazardCategory] || imp.hazardCategory
    const origClass = riskLevelClass(imp.originalRiskScore)
    const afterClass = riskLevelClass(imp.riskScore)
    const statusClass = imp.status === 'COMPLETED' ? 'status-completed' : 'status-planned'
    const statusLabel = imp.status === 'COMPLETED' ? '완료' : '예정'
    const unitDisplay = imp.parentUnitName
      ? `${imp.parentUnitName} &gt; ${imp.unitName}`
      : imp.unitName
    const dateStr = formatDate(imp.updateDate)

    html += `
      <tr>
        <td>${idx + 1}</td>
        <td class="left">${escHtml(unitDisplay)}</td>
        <td class="left">${escHtml(imp.hazardFactor)}</td>
        <td><span class="cat-badge ${catClass}">${catLabel}</span></td>
        <td class="${origClass} font-bold">${imp.originalRiskScore}</td>
        <td class="left text-sm">${escHtml(imp.improvementContent)}</td>
        <td>${escHtml(imp.responsiblePerson)}</td>
        <td class="nowrap">${dateStr}</td>
        <td><span class="${statusClass}">${statusLabel}</span></td>
        <td class="${afterClass} font-bold">${imp.riskScore}</td>
        <td class="left text-sm">${escHtml(imp.remarks || '')}</td>
      </tr>`
  })

  html += `</tbody></table>`
  return html
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function riskLevelClass(score: number): string {
  if (score >= 16) return 'risk-very-high'
  if (score >= 9) return 'risk-high'
  if (score >= 5) return 'risk-medium'
  return 'risk-low'
}

function formatDate(date: Date): string {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
