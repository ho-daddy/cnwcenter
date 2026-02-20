import type { ReportData } from '../report-data'
import {
  HAZARD_CATEGORY_LABELS,
  EVALUATION_TYPE_LABELS,
  getRiskLevel,
} from '@/lib/risk-assessment'

export function buildSummaryReportHtml(data: ReportData): string {
  const { cards, hazards, improvements } = data

  // ─── 통계 ───
  const riskDist = {
    veryHigh: hazards.filter(h => h.riskScore >= 16).length,
    high: hazards.filter(h => h.riskScore >= 9 && h.riskScore < 16).length,
    medium: hazards.filter(h => h.riskScore >= 5 && h.riskScore < 9).length,
    low: hazards.filter(h => h.riskScore < 5).length,
  }

  const categoryDist: Record<string, number> = {}
  for (const h of hazards) {
    categoryDist[h.hazardCategory] = (categoryDist[h.hazardCategory] || 0) + 1
  }

  const planned = improvements.filter(i => i.status === 'PLANNED').length
  const completed = improvements.filter(i => i.status === 'COMPLETED').length
  const completionRate = improvements.length > 0
    ? Math.round((completed / improvements.length) * 100)
    : 0

  // ─── HTML ───
  let html = ''

  // 1. 위험등급 분포 통계
  html += `
  <div class="stat-grid">
    <div class="stat-card">
      <div class="label">전체 위험요인</div>
      <div class="value">${hazards.length}</div>
    </div>
    <div class="stat-card" style="border-color:#ef4444;">
      <div class="label">매우높음</div>
      <div class="value" style="color:#b91c1c;">${riskDist.veryHigh}</div>
    </div>
    <div class="stat-card" style="border-color:#f97316;">
      <div class="label">높음</div>
      <div class="value" style="color:#c2410c;">${riskDist.high}</div>
    </div>
    <div class="stat-card" style="border-color:#eab308;">
      <div class="label">보통</div>
      <div class="value" style="color:#a16207;">${riskDist.medium}</div>
    </div>
    <div class="stat-card" style="border-color:#22c55e;">
      <div class="label">낮음</div>
      <div class="value" style="color:#15803d;">${riskDist.low}</div>
    </div>
  </div>`

  // 2. 개선현황 요약
  html += `
  <div class="stat-grid">
    <div class="stat-card">
      <div class="label">개선 전체</div>
      <div class="value">${improvements.length}</div>
    </div>
    <div class="stat-card">
      <div class="label">예정</div>
      <div class="value" style="color:#1e40af;">${planned}</div>
    </div>
    <div class="stat-card">
      <div class="label">완료</div>
      <div class="value" style="color:#15803d;">${completed}</div>
    </div>
    <div class="stat-card">
      <div class="label">완료율</div>
      <div class="value">${completionRate}%</div>
    </div>
  </div>`

  // 3. 평가카드 목록
  html += `<div class="section-title">평가카드 목록</div>`
  html += `
  <table>
    <thead>
      <tr>
        <th style="width:4%">#</th>
        <th style="width:18%">평가단위</th>
        <th style="width:8%">조사유형</th>
        <th style="width:10%">작업자</th>
        <th style="width:10%">조사자</th>
        <th style="width:7%">위험요인</th>
        <th style="width:43%">작업내용</th>
      </tr>
    </thead>
    <tbody>`

  cards.forEach((card, idx) => {
    const unitDisplay = card.parentUnitName
      ? `${card.parentUnitName} &gt; ${card.unitName}`
      : card.unitName
    html += `
      <tr>
        <td>${idx + 1}</td>
        <td class="left">${unitDisplay}</td>
        <td>${EVALUATION_TYPE_LABELS[card.evaluationType] || card.evaluationType}</td>
        <td>${escHtml(card.workerName)}</td>
        <td>${escHtml(card.evaluatorName)}</td>
        <td>${card.hazardCount}건</td>
        <td class="left">${escHtml(truncate(card.workDescription, 120))}</td>
      </tr>`
  })

  html += `</tbody></table>`

  // 4. 위험분류별 통계
  html += `<div class="section-title">위험분류별 분포</div>`
  html += `
  <table>
    <thead>
      <tr>
        <th style="width:25%">위험분류</th>
        <th style="width:15%">건수</th>
        <th style="width:60%">비율</th>
      </tr>
    </thead>
    <tbody>`

  const catEntries = Object.entries(HAZARD_CATEGORY_LABELS)
  for (const [key, label] of catEntries) {
    const count = categoryDist[key] || 0
    const pct = hazards.length > 0 ? Math.round((count / hazards.length) * 100) : 0
    const barWidth = Math.max(pct, 1)
    const catClass = `cat-${key.toLowerCase()}`
    html += `
      <tr>
        <td><span class="cat-badge ${catClass}">${label}</span></td>
        <td>${count}건</td>
        <td class="left">
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="background:#ddd;width:100%;height:14px;border-radius:2px;overflow:hidden;">
              <div style="background:#6366f1;width:${barWidth}%;height:100%;"></div>
            </div>
            <span class="nowrap text-sm">${pct}%</span>
          </div>
        </td>
      </tr>`
  }

  html += `</tbody></table>`

  // 5. 고위험 요인 Top 10
  const topHazards = [...hazards]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10)

  if (topHazards.length > 0) {
    html += `<div class="section-title">고위험 요인 (상위 ${topHazards.length}건)</div>`
    html += `
    <table>
      <thead>
        <tr>
          <th style="width:4%">#</th>
          <th style="width:16%">평가단위</th>
          <th style="width:10%">위험분류</th>
          <th style="width:34%">유해위험요인</th>
          <th style="width:8%">위험성점수</th>
          <th style="width:8%">등급</th>
          <th style="width:20%">개선대책</th>
        </tr>
      </thead>
      <tbody>`

    topHazards.forEach((h, idx) => {
      const level = getRiskLevel(h.riskScore)
      const riskClass = riskLevelClass(h.riskScore)
      const unitDisplay = h.parentUnitName
        ? `${h.parentUnitName} &gt; ${h.unitName}`
        : h.unitName
      const catClass = `cat-${h.hazardCategory.toLowerCase()}`

      html += `
        <tr>
          <td>${idx + 1}</td>
          <td class="left">${unitDisplay}</td>
          <td><span class="cat-badge ${catClass}">${HAZARD_CATEGORY_LABELS[h.hazardCategory] || h.hazardCategory}</span></td>
          <td class="left">${escHtml(truncate(h.hazardFactor, 80))}</td>
          <td class="${riskClass}">${h.riskScore}</td>
          <td class="${riskClass}">${level.label}</td>
          <td class="left text-sm">${escHtml(truncate(h.improvementPlan || '—', 60))}</td>
        </tr>`
    })

    html += `</tbody></table>`
  }

  return html
}

// ─── 유틸 ───

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max) + '...'
}

function riskLevelClass(score: number): string {
  if (score >= 16) return 'risk-very-high'
  if (score >= 9) return 'risk-high'
  if (score >= 5) return 'risk-medium'
  return 'risk-low'
}
