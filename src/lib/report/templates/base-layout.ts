export interface ReportMeta {
  workplaceName: string
  year: number
  generatedAt: string // YYYY-MM-DD
}

export function wrapInDocument(
  title: string,
  bodyHtml: string,
  meta: ReportMeta
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
  .report-header h1 {
    font-size: 16pt;
    font-weight: bold;
    margin-bottom: 6px;
  }
  .report-header .meta {
    font-size: 9pt;
    color: #555;
  }
  .report-header .meta span { margin: 0 8px; }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
  }
  th, td {
    border: 1px solid #999;
    padding: 4px 6px;
    text-align: center;
    font-size: 8.5pt;
    vertical-align: middle;
    word-break: keep-all;
  }
  th {
    background: #e8e8e8;
    font-weight: bold;
    font-size: 8pt;
  }
  td.left { text-align: left; }
  td.right { text-align: right; }

  .section-title {
    font-size: 11pt;
    font-weight: bold;
    margin: 14px 0 6px 0;
    padding-left: 6px;
    border-left: 4px solid #333;
  }
  .sub-section-title {
    font-size: 9.5pt;
    font-weight: bold;
    margin: 10px 0 4px 0;
    color: #444;
  }

  .page-break { page-break-before: always; }

  /* 위험등급 색상 */
  .risk-very-high { background: #fee2e2; color: #b91c1c; font-weight: bold; }
  .risk-high      { background: #ffedd5; color: #c2410c; font-weight: bold; }
  .risk-medium    { background: #fef9c3; color: #a16207; }
  .risk-low       { background: #dcfce7; color: #15803d; }

  /* 통계 카드 */
  .stat-grid {
    display: flex;
    gap: 8px;
    margin-bottom: 14px;
  }
  .stat-card {
    flex: 1;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px;
    text-align: center;
  }
  .stat-card .label { font-size: 8pt; color: #666; }
  .stat-card .value { font-size: 14pt; font-weight: bold; margin-top: 2px; }

  /* 그룹 헤더 행 */
  .group-header {
    background: #f0f4f8;
    font-weight: bold;
    text-align: left;
    font-size: 9pt;
  }

  /* 상태 뱃지 */
  .status-planned   { background: #dbeafe; color: #1e40af; padding: 1px 6px; border-radius: 3px; font-size: 7.5pt; }
  .status-completed { background: #dcfce7; color: #15803d; padding: 1px 6px; border-radius: 3px; font-size: 7.5pt; }

  /* 카테고리 뱃지 */
  .cat-accident         { background: #fee2e2; color: #b91c1c; }
  .cat-musculoskeletal  { background: #fef3c7; color: #92400e; }
  .cat-chemical         { background: #f3e8ff; color: #7c3aed; }
  .cat-noise            { background: #dbeafe; color: #1e40af; }
  .cat-absolute         { background: #1f2937; color: #fff; }
  .cat-other            { background: #f3f4f6; color: #374151; }
  .cat-badge { padding: 1px 6px; border-radius: 3px; font-size: 7.5pt; white-space: nowrap; }

  .text-sm { font-size: 8pt; }
  .text-muted { color: #888; }
  .font-bold { font-weight: bold; }
  .nowrap { white-space: nowrap; }
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
