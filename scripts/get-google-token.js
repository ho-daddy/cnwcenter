#!/usr/bin/env node

/**
 * Google Drive Refresh Token 발급 스크립트
 *
 * 사용법:
 *   1. Google Cloud Console에서 OAuth2 Client ID/Secret 생성
 *      - 앱 유형: 웹 애플리케이션
 *      - 승인된 리디렉션 URI: http://localhost:3977/callback
 *   2. .env에 GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET 입력
 *   3. node scripts/get-google-token.js 실행
 *   4. 브라우저에서 whatfor44@gmail.com으로 로그인 + 권한 승인
 *   5. 출력된 Refresh Token을 .env의 GOOGLE_DRIVE_REFRESH_TOKEN에 입력
 *
 * 스코프: drive.file (앱이 생성한 파일만 접근 — 기존 Drive 파일 보호)
 */

const http = require('http')
const { URL } = require('url')

// .env 파일에서 환경변수 로드 (dotenv 없이 직접)
const fs = require('fs')
const path = require('path')
const envPath = path.resolve(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^\s*([\w]+)\s*=\s*"?([^"]*)"?\s*$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  })
}

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET
const PORT = 3977
const REDIRECT_URI = `http://localhost:${PORT}/callback`

// drive.file 스코프: 이 앱이 생성하거나 연 파일만 접근 가능
const SCOPE = 'https://www.googleapis.com/auth/drive.file'

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ 오류: .env에 GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET을 먼저 입력해주세요.')
  process.exit(1)
}

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${encodeURIComponent(CLIENT_ID)}&` +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
  `response_type=code&` +
  `scope=${encodeURIComponent(SCOPE)}&` +
  `access_type=offline&` +
  `prompt=consent`

console.log('='.repeat(60))
console.log('Google Drive Refresh Token 발급')
console.log('='.repeat(60))
console.log()
console.log('⚠️  Google Cloud Console에서 승인된 리디렉션 URI에')
console.log(`   ${REDIRECT_URI}`)
console.log('   가 추가되어 있는지 확인해주세요.')
console.log()
console.log('📌 스코프: drive.file (앱이 생성한 파일만 접근)')
console.log('   → 기존 Drive 파일은 접근 불가능합니다.')
console.log()
console.log('🔗 아래 URL을 브라우저에서 열어주세요:')
console.log()
console.log(authUrl)
console.log()

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  if (url.pathname !== '/callback') {
    res.writeHead(404)
    res.end('Not Found')
    return
  }

  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`<h1>❌ 인증 실패</h1><p>${error}</p>`)
    console.error(`❌ 인증 실패: ${error}`)
    server.close()
    process.exit(1)
    return
  }

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end('<h1>❌ 인증 코드가 없습니다.</h1>')
    return
  }

  // Authorization code → Refresh token 교환
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      throw new Error(`${tokenData.error}: ${tokenData.error_description}`)
    }

    const refreshToken = tokenData.refresh_token

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`
      <h1>✅ 인증 성공!</h1>
      <p>터미널에서 Refresh Token을 확인해주세요.</p>
      <p>이 탭은 닫아도 됩니다.</p>
    `)

    console.log()
    console.log('='.repeat(60))
    console.log('✅ 인증 성공! Refresh Token:')
    console.log('='.repeat(60))
    console.log()
    console.log(refreshToken)
    console.log()
    console.log('='.repeat(60))
    console.log('.env 파일의 GOOGLE_DRIVE_REFRESH_TOKEN에 위 값을 입력해주세요:')
    console.log(`GOOGLE_DRIVE_REFRESH_TOKEN="${refreshToken}"`)
    console.log('='.repeat(60))
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`<h1>❌ 토큰 교환 실패</h1><pre>${err.message}</pre>`)
    console.error('❌ 토큰 교환 실패:', err.message)
  }

  server.close()
  setTimeout(() => process.exit(0), 1000)
})

server.listen(PORT, () => {
  console.log(`🔄 콜백 서버 대기 중 (http://localhost:${PORT}/callback)...`)
})
