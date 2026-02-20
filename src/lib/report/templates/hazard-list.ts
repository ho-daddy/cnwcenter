import type { ReportData } from '../report-data'
import { HAZARD_CATEGORY_LABELS, getRiskLevel } from '@/lib/risk-assessment'

export function buildHazardListHtml(data: ReportData): string {
  const { hazards } = data

  // 평가단위별 그룹핑
  const groups = new Map<string, typeof hazards>()
  for (const h of hazards) {
    const key = h.parentUnitName
      ? `${h.parentUnitName} > ${h.unitName}`
      : h.unitName
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(h)
  }

  let html = ''
  html += `<p style="margin-bottom:8px;font-size:9pt;color:#555;">
    전체 ${hazards.length}건의 위험요인 목록입니다.
  </p>`

  html += `
  <table>
    <thead>
      <tr>
        <th style="width:3%">#</th>
        <th style="width:12%">평가단위</th>
        <th style="width:8%">위험분류</th>
        <th style="width:25%">유해위험요인</th>
        <th style="width:5%">중대성</th>
        <th style="width:5%">가능성</th>
        <th style="width:4%">가점</th>
        <th style="width:6%">위험성<br/>점수</th>
        <th style="width:6%">등급</th>
        <th style="width:20%">개선대책</th>
        <th style="width:6%">개선후<br/>점수</th>
      </tr>
    </thead>
    <tbody>`

  let num = 0
  for (const [unitKey, unitHazards] of groups) {
    // 그룹 헤더
    html += `
      <tr>
        <td colspan="11" class="group-header" style="padding:5px 8px;">
          ${escHtml(unitKey)} (${unitHazards.length}건)
        </td>
      </tr>`

    for (const h of unitHazards) {
      num++
      const level = getRiskLevel(h.riskScore)
      const riskClass = riskLevelClass(h.riskScore)
      const catClass = `cat-${h.hazardCategory.toLowerCase()}`
      const catLabel = HAZARD_CATEGORY_LABELS[h.hazardCategory] || h.hazardCategory

      // 화학물질인 경우 제품명 표시
      let factorText = escHtml(h.hazardFactor)
      if (h.hazardCategory === 'CHEMICAL' && h.chemicalProductName) {
        factorText += `<br/><span class="text-sm text-muted">[${escHtml(h.chemicalProductName)}]</span>`
      }

      // 개선후 점수
      let afterScore = '—'
      let afterClass = ''
      if (h.latestImprovement) {
        afterScore = String(h.latestImprovement.riskScore)
        afterClass = riskLevelClass(h.latestImprovement.riskScore)
      }

      html += `
      <tr>
        <td>${num}</td>
        <td class="left">${escHtml(h.unitName)}</td>
        <td><span class="cat-badge ${catClass}">${catLabel}</span></td>
        <td class="left">${factorText}</td>
        <td>${h.severityScore}</td>
        <td>${h.likelihoodScore}</td>
        <td>${h.additionalPoints || '—'}</td>
        <td class="${riskClass} font-bold">${h.riskScore}</td>
        <td class="${riskClass}">${level.label}</td>
        <td class="left text-sm">${escHtml(h.improvementPlan || '—')}</td>
        <td class="${afterClass}">${afterScore}</td>
      </tr>`
    }
  }

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
