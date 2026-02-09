# 일일 브리핑 자동 수집 스크립트
# 매일 08:30에 실행되도록 Windows Task Scheduler에 등록

$ErrorActionPreference = "Stop"

# 설정
$BaseUrl = "http://localhost:3000"
$LogFile = "D:\coding_local\cnwcenter\logs\briefing-$(Get-Date -Format 'yyyy-MM-dd').log"

# 로그 디렉토리 생성
$LogDir = Split-Path $LogFile -Parent
if (!(Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Write-Log {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$Timestamp - $Message" | Tee-Object -FilePath $LogFile -Append
}

Write-Log "========== 일일 브리핑 시작 =========="

try {
    # 1. 기사 수집
    Write-Log "1단계: 기사 수집 중..."
    $CollectResponse = Invoke-RestMethod -Uri "$BaseUrl/api/briefing/collect" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "Referer" = $BaseUrl
        } `
        -TimeoutSec 300

    if ($CollectResponse.success) {
        Write-Log "수집 완료: 총 $($CollectResponse.totalCollected)건, 필터 $($CollectResponse.totalFiltered)건"
        foreach ($result in $CollectResponse.results) {
            Write-Log "  - $($result.sourceName): $($result.collected)건 수집, $($result.filtered)건 필터"
        }
    } else {
        Write-Log "수집 실패: $($CollectResponse.error)"
        exit 1
    }

    # 2. AI 분석 및 리포트 생성
    Write-Log "2단계: AI 분석 중..."
    $AnalyzeResponse = Invoke-RestMethod -Uri "$BaseUrl/api/briefing/analyze" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "Referer" = $BaseUrl
        } `
        -TimeoutSec 600

    if ($AnalyzeResponse.success) {
        Write-Log "분석 완료: 리포트 ID $($AnalyzeResponse.reportId)"
        Write-Log "핵심 이슈 $($AnalyzeResponse.topIssues.Count)건"
        Write-Log "리포트 저장: $($AnalyzeResponse.markdownPath)"
    } else {
        Write-Log "분석 실패: $($AnalyzeResponse.error)"
        exit 1
    }

    Write-Log "========== 일일 브리핑 완료 =========="

} catch {
    Write-Log "오류 발생: $_"
    exit 1
}
