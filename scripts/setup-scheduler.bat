@echo off
REM 일일 브리핑 스케줄러 등록 스크립트
REM 관리자 권한으로 실행 필요

echo === 일일 브리핑 스케줄러 등록 ===
echo.

REM 기존 작업 삭제 (있을 경우)
schtasks /delete /tn "CNWCenter-DailyBriefing" /f 2>nul

REM 새 작업 등록: 매일 08:30 실행
schtasks /create ^
    /tn "CNWCenter-DailyBriefing" ^
    /tr "powershell.exe -ExecutionPolicy Bypass -File D:\coding_local\cnwcenter\scripts\daily-briefing.ps1" ^
    /sc daily ^
    /st 08:30 ^
    /ru "%USERNAME%" ^
    /rl HIGHEST

if %errorlevel% equ 0 (
    echo.
    echo [성공] 스케줄러가 등록되었습니다.
    echo - 작업 이름: CNWCenter-DailyBriefing
    echo - 실행 시간: 매일 08:30
    echo.
    echo 확인하려면: schtasks /query /tn "CNWCenter-DailyBriefing"
    echo 수동 실행: schtasks /run /tn "CNWCenter-DailyBriefing"
    echo 삭제하려면: schtasks /delete /tn "CNWCenter-DailyBriefing" /f
) else (
    echo.
    echo [실패] 스케줄러 등록에 실패했습니다.
    echo 관리자 권한으로 다시 실행해주세요.
)

echo.
pause
