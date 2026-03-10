import { MSReportData, MSReportAssessment, MSReportElementWork } from './report-data'

// 관리수준 레이블/색상
const ML_INFO: Record<string, { label: string; cls: string }> = {
  HIGH: { label: '상', cls: 'level-high' },
  MEDIUM_HIGH: { label: '중상', cls: 'level-medium-high' },
  MEDIUM: { label: '중', cls: 'level-medium' },
  LOW: { label: '하', cls: 'level-low' },
}

const BODY_PART_LABELS: Record<string, string> = {
  HAND_WRIST: '손/손목',
  ELBOW_FOREARM: '팔꿈치',
  SHOULDER_ARM: '어깨',
  NECK: '목',
  BACK_HIP: '허리',
  KNEE_ANKLE: '무릎/발목',
}

const BODY_PART_ORDER = [
  'HAND_WRIST', 'ELBOW_FOREARM', 'SHOULDER_ARM', 'NECK', 'BACK_HIP', 'KNEE_ANKLE',
]

function scoreCls(score: number): string {
  if (score >= 7) return 'score-high'
  if (score >= 5) return 'score-medium-high'
  if (score >= 3) return 'score-medium'
  return 'score-low'
}

function escHtml(str: string | null | undefined): string {
  if (!str) return '-'
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function getMaxScore(ew: MSReportElementWork): number {
  if (ew.bodyPartScores.length === 0) return 0
  return Math.max(...ew.bodyPartScores.map((bp) => bp.totalScore))
}

function getAssessmentMaxScore(a: MSReportAssessment): number {
  if (a.elementWorks.length === 0) return 0
  return Math.max(...a.elementWorks.map(getMaxScore))
}

function assessmentTypeLabel(t: string): string {
  return t === 'REGULAR' ? '정기조사' : '수시조사'
}

function statusLabel(s: string): string {
  const m: Record<string, string> = {
    DRAFT: '작성중', IN_PROGRESS: '조사중', COMPLETED: '완료', REVIEWED: '검토완료',
  }
  return m[s] || s
}

// ============================================================
// 1. 조사결과 종합보고서
// ============================================================
export function buildMSSummaryHtml(data: MSReportData): string {
  const { assessments } = data
  const total = assessments.length
  const completed = assessments.filter((a) => a.status === 'COMPLETED' || a.status === 'REVIEWED').length
  const levelCounts = { HIGH: 0, MEDIUM_HIGH: 0, MEDIUM: 0, LOW: 0, NONE: 0 }
  assessments.forEach((a) => {
    const ml = a.managementLevel
    if (ml && ml in levelCounts) levelCounts[ml as keyof typeof levelCounts]++
    else levelCounts.NONE++
  })

  const allImprovements = assessments.flatMap((a) => a.improvements)
  const impPlanned = allImprovements.filter((i) => i.status === 'PLANNED').length
  const impCompleted = allImprovements.filter((i) => i.status === 'COMPLETED').length

  let html = `
    <div class="stat-grid">
      <div class="stat-card"><div class="label">전체 조사</div><div class="value">${total}</div></div>
      <div class="stat-card"><div class="label">완료</div><div class="value" style="color:#15803d">${completed}</div></div>
      <div class="stat-card"><div class="label">관리수준 상</div><div class="value" style="color:#b91c1c">${levelCounts.HIGH}</div></div>
      <div class="stat-card"><div class="label">관리수준 중상</div><div class="value" style="color:#c2410c">${levelCounts.MEDIUM_HIGH}</div></div>
      <div class="stat-card"><div class="label">관리수준 중</div><div class="value" style="color:#a16207">${levelCounts.MEDIUM}</div></div>
      <div class="stat-card"><div class="label">관리수준 하</div><div class="value" style="color:#15803d">${levelCounts.LOW}</div></div>
    </div>

    <p class="section-title">조사 현황 요약</p>
    <table>
      <thead>
        <tr>
          <th style="width:3%">No</th>
          <th style="width:12%">평가단위</th>
          <th style="width:6%">조사유형</th>
          <th style="width:6%">상태</th>
          <th style="width:6%">관리수준</th>
          <th style="width:5%">최고점수</th>
          ${BODY_PART_ORDER.map((bp) => `<th style="width:7%">${BODY_PART_LABELS[bp]}</th>`).join('')}
          <th style="width:7%">RULA</th>
          <th style="width:7%">REBA</th>
          <th style="width:8%">작업자</th>
        </tr>
      </thead>
      <tbody>
  `

  assessments.forEach((a, idx) => {
    const maxScore = getAssessmentMaxScore(a)
    const ml = a.managementLevel ? ML_INFO[a.managementLevel] : null

    // 부위별 최고점수 (모든 요소작업 중)
    const bpMaxScores: Record<string, number> = {}
    BODY_PART_ORDER.forEach((bp) => { bpMaxScores[bp] = 0 })
    a.elementWorks.forEach((ew) => {
      ew.bodyPartScores.forEach((bp) => {
        if (bp.totalScore > (bpMaxScores[bp.bodyPart] || 0)) {
          bpMaxScores[bp.bodyPart] = bp.totalScore
        }
      })
    })

    // RULA/REBA 최고점수
    const rulaMax = Math.max(0, ...a.elementWorks.map((ew) => ew.rulaScore || 0))
    const rebaMax = Math.max(0, ...a.elementWorks.map((ew) => ew.rebaScore || 0))

    html += `<tr>
      <td>${idx + 1}</td>
      <td class="left">${escHtml(a.organizationUnit.name)}</td>
      <td>${assessmentTypeLabel(a.assessmentType)}</td>
      <td>${statusLabel(a.status)}</td>
      <td class="${ml?.cls || ''}">${ml?.label || '-'}</td>
      <td class="${scoreCls(maxScore)}" style="font-weight:bold">${maxScore || '-'}</td>
      ${BODY_PART_ORDER.map((bp) => {
        const s = bpMaxScores[bp]
        return `<td class="${s > 0 ? scoreCls(s) : ''}">${s || '-'}</td>`
      }).join('')}
      <td>${rulaMax || '-'}</td>
      <td>${rebaMax || '-'}</td>
      <td>${escHtml(a.workerName)}</td>
    </tr>`
  })

  html += `</tbody></table>`

  // 개선현황
  if (allImprovements.length > 0) {
    html += `
      <p class="section-title">개선 현황</p>
      <div class="stat-grid">
        <div class="stat-card"><div class="label">전체 개선항목</div><div class="value">${allImprovements.length}</div></div>
        <div class="stat-card"><div class="label">개선 예정</div><div class="value" style="color:#1e40af">${impPlanned}</div></div>
        <div class="stat-card"><div class="label">개선 완료</div><div class="value" style="color:#15803d">${impCompleted}</div></div>
        <div class="stat-card"><div class="label">미지정</div><div class="value" style="color:#666">${allImprovements.length - impPlanned - impCompleted}</div></div>
      </div>
    `
  }

  return html
}

// ============================================================
// 2. 부위별 상세 조사표
// ============================================================
export function buildMSDetailHtml(data: MSReportData): string {
  const { assessments } = data
  let html = ''

  assessments.forEach((a, aIdx) => {
    if (aIdx > 0) html += '<div class="page-break"></div>'

    const ml = a.managementLevel ? ML_INFO[a.managementLevel] : null

    html += `
      <p class="section-title">${escHtml(a.organizationUnit.name)} (${assessmentTypeLabel(a.assessmentType)})</p>
      <table>
        <tr>
          <th style="width:12%">작업자</th><td class="left" style="width:20%">${escHtml(a.workerName)}</td>
          <th style="width:12%">조사자</th><td class="left" style="width:20%">${escHtml(a.investigatorName)}</td>
          <th style="width:12%">관리수준</th><td class="${ml?.cls || ''}" style="width:24%">${ml?.label || '-'}</td>
        </tr>
        <tr>
          <th>근무형태</th><td class="left">${escHtml(a.shiftType)}</td>
          <th>작업빈도</th><td class="left">${a.workFrequency === 'REGULAR' ? '상시작업' : a.workFrequency === 'INTERMITTENT' ? '간헐작업' : '-'}</td>
          <th>일작업시간</th><td>${a.dailyWorkHours ? a.dailyWorkHours + '시간' : '-'}</td>
        </tr>
      </table>
    `

    // 부담부위
    const affected = [
      a.affectedHandWrist && '손/손목',
      a.affectedElbow && '팔꿈치',
      a.affectedShoulder && '어깨',
      a.affectedNeck && '목',
      a.affectedBack && '허리',
      a.affectedKnee && '무릎/발목',
    ].filter(Boolean)
    if (affected.length > 0) {
      html += `<p class="text-sm" style="margin:4px 0"><strong>부담부위:</strong> ${affected.join(', ')}</p>`
    }

    // 기타위험요인
    const risks = [
      a.hasNoise && '소음', a.hasThermal && '온열', a.hasBurn && '화상',
      a.hasDust && '분진', a.hasAccident && '사고성재해', a.hasStress && '스트레스',
      a.hasOtherRisk && '기타',
    ].filter(Boolean)
    if (risks.length > 0) {
      html += `<p class="text-sm" style="margin:4px 0"><strong>기타 위험요인:</strong> ${risks.join(', ')}</p>`
    }

    // 요소작업별 상세 테이블
    a.elementWorks.forEach((ew, ewIdx) => {
      html += `
        <p class="sub-section-title" style="margin-top:10px">
          요소작업 ${ewIdx + 1}: ${escHtml(ew.name)}
          ${ew.description ? `<span class="text-sm text-muted"> — ${escHtml(ew.description)}</span>` : ''}
        </p>
      `

      // 부위별 점수 테이블
      html += `
        <table>
          <thead>
            <tr>
              <th>부위</th>
              <th>자세점수</th>
              <th>부가점수</th>
              <th>총점</th>
            </tr>
          </thead>
          <tbody>
      `
      BODY_PART_ORDER.forEach((bp) => {
        const score = ew.bodyPartScores.find((s) => s.bodyPart === bp)
        html += `<tr>
          <td>${BODY_PART_LABELS[bp]}</td>
          <td>${score ? score.postureScore : '-'}</td>
          <td>${score ? score.additionalScore : '-'}</td>
          <td class="${score ? scoreCls(score.totalScore) : ''}" style="font-weight:bold">${score ? score.totalScore : '-'}</td>
        </tr>`
      })
      html += '</tbody></table>'

      // RULA/REBA
      if (ew.rulaScore || ew.rebaScore) {
        html += `<table><tr>`
        if (ew.rulaScore) {
          html += `<th style="width:15%">RULA 점수</th><td style="width:10%">${ew.rulaScore}</td>
                   <th style="width:15%">RULA 수준</th><td style="width:10%">${escHtml(ew.rulaLevel)}</td>`
        }
        if (ew.rebaScore) {
          html += `<th style="width:15%">REBA 점수</th><td style="width:10%">${ew.rebaScore}</td>
                   <th style="width:15%">REBA 수준</th><td style="width:10%">${escHtml(ew.rebaLevel)}</td>`
        }
        html += `</tr></table>`
      }

      // 밀기/당기기
      if (ew.pushPullArm || ew.pushPullHand) {
        html += `<table><tr>
          <th>밀기/당기기 (팔)</th><td>${escHtml(ew.pushPullArm)}</td>
          <th>밀기/당기기 (손)</th><td>${escHtml(ew.pushPullHand)}</td>
        </tr></table>`
      }

      // 측정도구
      const tools = ew.measurements.filter((m) => m.type === 'TOOL')
      const loads = ew.measurements.filter((m) => m.type === 'LOAD')
      const pushPulls = ew.measurements.filter((m) => m.type === 'PUSH_PULL')
      const vibrations = ew.measurements.filter((m) => m.type === 'VIBRATION')

      if (tools.length || loads.length || pushPulls.length || vibrations.length) {
        html += `<table><thead><tr>
          <th>분류</th><th>명칭</th><th>중량(kg)/힘(kgf)</th><th>빈도(회/일)</th><th>노출(시간/일)</th>
        </tr></thead><tbody>`

        const renderMeasurements = (items: typeof tools, label: string) => {
          items.forEach((m) => {
            html += `<tr>
              <td>${label}</td>
              <td class="left">${escHtml(m.name)}</td>
              <td>${m.weight ?? m.force ?? '-'}</td>
              <td>${m.frequency ?? '-'}</td>
              <td>${m.exposureHours ?? '-'}</td>
            </tr>`
          })
        }
        renderMeasurements(tools, '공구')
        renderMeasurements(loads, '중량물')
        renderMeasurements(pushPulls, '밀기/당기기')
        renderMeasurements(vibrations, '진동')
        html += '</tbody></table>'
      }

      // 종합평가 의견
      if (ew.evaluationResult) {
        html += `<p class="text-sm" style="margin:4px 0; padding:4px 6px; background:#f8f9fa; border-radius:3px">
          <strong>종합평가:</strong> ${escHtml(ew.evaluationResult)}</p>`
      }
    })

    // 개선항목
    if (a.improvements.length > 0) {
      html += `
        <p class="sub-section-title" style="margin-top:10px">개선항목</p>
        <table>
          <thead><tr>
            <th style="width:5%">No</th>
            <th style="width:12%">요소작업</th>
            <th style="width:25%">문제점</th>
            <th style="width:25%">개선방안</th>
            <th style="width:8%">담당자</th>
            <th style="width:8%">상태</th>
            <th style="width:10%">일자</th>
          </tr></thead>
          <tbody>
      `
      a.improvements.forEach((imp, i) => {
        const statusCls = imp.status === 'COMPLETED' ? 'status-completed' : imp.status === 'PLANNED' ? 'status-planned' : ''
        const statusText = imp.status === 'COMPLETED' ? '완료' : imp.status === 'PLANNED' ? '예정' : '-'
        html += `<tr>
          <td>${i + 1}</td>
          <td class="left">${escHtml(imp.elementWorkName)}</td>
          <td class="left">${escHtml(imp.problem)}</td>
          <td class="left">${escHtml(imp.improvement)}</td>
          <td>${escHtml(imp.responsiblePerson)}</td>
          <td><span class="${statusCls}">${statusText}</span></td>
          <td>${imp.updateDate ? new Date(imp.updateDate).toLocaleDateString('ko-KR') : '-'}</td>
        </tr>`
      })
      html += '</tbody></table>'
    }

    // 종합평가 코멘트
    if (a.overallComment) {
      html += `<p class="text-sm" style="margin:6px 0; padding:6px; background:#f0f4f8; border-radius:3px; border-left:3px solid #333">
        <strong>종합 의견:</strong> ${escHtml(a.overallComment)}</p>`
    }
  })

  if (assessments.length === 0) {
    html = '<p style="text-align:center; padding:40px; color:#888">해당 연도에 조사 데이터가 없습니다.</p>'
  }

  return html
}

// ============================================================
// 3. 개선대책 보고서
// ============================================================
export function buildMSImprovementHtml(data: MSReportData): string {
  const allImprovements = data.assessments.flatMap((a) =>
    a.improvements.map((imp) => ({
      ...imp,
      unitName: a.organizationUnit.name,
      managementLevel: a.managementLevel,
    }))
  )

  if (allImprovements.length === 0) {
    return '<p style="text-align:center; padding:40px; color:#888">등록된 개선항목이 없습니다.</p>'
  }

  const planned = allImprovements.filter((i) => i.status === 'PLANNED')
  const completed = allImprovements.filter((i) => i.status === 'COMPLETED')
  const unset = allImprovements.filter((i) => !i.status)

  let html = `
    <div class="stat-grid">
      <div class="stat-card"><div class="label">전체</div><div class="value">${allImprovements.length}</div></div>
      <div class="stat-card"><div class="label">개선 예정</div><div class="value" style="color:#1e40af">${planned.length}</div></div>
      <div class="stat-card"><div class="label">개선 완료</div><div class="value" style="color:#15803d">${completed.length}</div></div>
      <div class="stat-card"><div class="label">완료율</div><div class="value">${allImprovements.length > 0 ? Math.round((completed.length / allImprovements.length) * 100) : 0}%</div></div>
    </div>

    <p class="section-title">개선대책 목록</p>
    <table>
      <thead>
        <tr>
          <th style="width:3%">No</th>
          <th style="width:10%">평가단위</th>
          <th style="width:8%">관리수준</th>
          <th style="width:10%">요소작업</th>
          <th style="width:22%">문제점(유해요인)</th>
          <th style="width:22%">개선방안</th>
          <th style="width:7%">담당자</th>
          <th style="width:6%">상태</th>
          <th style="width:8%">일자</th>
          <th style="width:4%">비고</th>
        </tr>
      </thead>
      <tbody>
  `

  allImprovements.forEach((imp, i) => {
    const ml = imp.managementLevel ? ML_INFO[imp.managementLevel] : null
    const statusCls = imp.status === 'COMPLETED' ? 'status-completed' : imp.status === 'PLANNED' ? 'status-planned' : ''
    const statusText = imp.status === 'COMPLETED' ? '완료' : imp.status === 'PLANNED' ? '예정' : '-'

    html += `<tr>
      <td>${i + 1}</td>
      <td class="left">${escHtml(imp.unitName)}</td>
      <td class="${ml?.cls || ''}">${ml?.label || '-'}</td>
      <td class="left">${escHtml(imp.elementWorkName)}</td>
      <td class="left">${escHtml(imp.problem)}</td>
      <td class="left">${escHtml(imp.improvement)}</td>
      <td>${escHtml(imp.responsiblePerson)}</td>
      <td><span class="${statusCls}">${statusText}</span></td>
      <td>${imp.updateDate ? new Date(imp.updateDate).toLocaleDateString('ko-KR') : '-'}</td>
      <td class="left text-sm">${escHtml(imp.remarks)}</td>
    </tr>`
  })

  html += '</tbody></table>'
  return html
}

// ============================================================
// HTML 문서 래퍼 (근골조사 전용 스타일)
// ============================================================
export function wrapMSDocument(
  title: string,
  bodyHtml: string,
  meta: { workplaceName: string; year: number; generatedAt: string }
): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Malgun Gothic', '맑은 고딕', 'NanumGothic', '나눔고딕', sans-serif;
    font-size: 9pt;
    color: #222;
    line-height: 1.4;
  }
  .report-header {
    text-align: center;
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 2px solid #333;
  }
  .report-header h1 { font-size: 16pt; font-weight: bold; margin-bottom: 6px; }
  .report-header .meta { font-size: 9pt; color: #555; }
  .report-header .meta span { margin: 0 8px; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th, td {
    border: 1px solid #999;
    padding: 3px 5px;
    text-align: center;
    font-size: 8pt;
    vertical-align: middle;
    word-break: keep-all;
  }
  th { background: #e8e8e8; font-weight: bold; }
  td.left { text-align: left; }

  .section-title {
    font-size: 11pt; font-weight: bold;
    margin: 14px 0 6px 0;
    padding-left: 6px;
    border-left: 4px solid #333;
  }
  .sub-section-title {
    font-size: 9.5pt; font-weight: bold;
    margin: 10px 0 4px 0; color: #444;
  }
  .page-break { page-break-before: always; }

  .stat-grid { display: flex; gap: 8px; margin-bottom: 14px; }
  .stat-card { flex: 1; border: 1px solid #ccc; border-radius: 4px; padding: 8px; text-align: center; }
  .stat-card .label { font-size: 8pt; color: #666; }
  .stat-card .value { font-size: 14pt; font-weight: bold; margin-top: 2px; }

  /* 관리수준 색상 */
  .level-high { background: #fee2e2; color: #b91c1c; font-weight: bold; }
  .level-medium-high { background: #ffedd5; color: #c2410c; font-weight: bold; }
  .level-medium { background: #fef9c3; color: #a16207; }
  .level-low { background: #dcfce7; color: #15803d; }

  /* 점수 색상 */
  .score-high { background: #fee2e2; color: #b91c1c; font-weight: bold; }
  .score-medium-high { background: #ffedd5; color: #c2410c; font-weight: bold; }
  .score-medium { background: #fef9c3; color: #a16207; }
  .score-low { background: #dcfce7; color: #15803d; }

  .status-planned { background: #dbeafe; color: #1e40af; padding: 1px 6px; border-radius: 3px; font-size: 7.5pt; }
  .status-completed { background: #dcfce7; color: #15803d; padding: 1px 6px; border-radius: 3px; font-size: 7.5pt; }

  .text-sm { font-size: 8pt; }
  .text-muted { color: #888; }
</style>
</head>
<body>
  <div class="report-header">
    <h1>${title}</h1>
    <div class="meta">
      <span>${meta.workplaceName}</span>
      <span>|</span>
      <span>${meta.year}년</span>
      <span>|</span>
      <span>출력일: ${meta.generatedAt}</span>
    </div>
  </div>
  ${bodyHtml}
</body>
</html>`
}
