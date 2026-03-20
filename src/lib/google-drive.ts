import { google } from 'googleapis'
import { Readable } from 'stream'

// Google Drive OAuth2 클라이언트 (싱글톤)
// Service Account 대신 OAuth2 + Refresh Token 방식 사용
// whatfor44@gmail.com 계정의 Google Drive에 파일 저장
// OAuth 스코프: drive.file (앱이 생성한 파일만 접근 가능)

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_DRIVE_CLIENT_ID,
  process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  process.env.GOOGLE_DRIVE_REDIRECT_URI
)

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
})

const drive = google.drive({ version: 'v3', auth: oauth2Client })

// 새움터 영상 저장용 최상위 폴더명
const ROOT_FOLDER_NAME = '새움터_작업영상'

let cachedRootFolderId: string | null = null

/**
 * Google Drive 환경변수 설정 여부 확인
 */
export function isDriveConfigured(): boolean {
  return !!(
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
    process.env.GOOGLE_DRIVE_CLIENT_SECRET &&
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN
  )
}

/**
 * 루트 폴더 ID 조회 (없으면 생성)
 */
async function getRootFolderId(): Promise<string> {
  if (cachedRootFolderId) return cachedRootFolderId

  // 기존 폴더 검색
  const res = await drive.files.list({
    q: `name='${ROOT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  })

  if (res.data.files && res.data.files.length > 0) {
    cachedRootFolderId = res.data.files[0].id!
    return cachedRootFolderId
  }

  // 폴더 생성
  const folder = await drive.files.create({
    requestBody: {
      name: ROOT_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  })

  cachedRootFolderId = folder.data.id!
  return cachedRootFolderId
}

/**
 * 파일이 '새움터_작업영상' 루트 폴더 하위에 있는지 검증
 * 루트 폴더까지 parents 체인을 따라가며 확인
 */
async function isFileUnderRootFolder(fileId: string): Promise<boolean> {
  const rootId = await getRootFolderId()

  let currentId = fileId
  const maxDepth = 10 // 무한루프 방지

  for (let i = 0; i < maxDepth; i++) {
    const file = await drive.files.get({
      fileId: currentId,
      fields: 'id, parents',
    })

    const parents = file.data.parents
    if (!parents || parents.length === 0) return false

    if (parents.includes(rootId)) return true

    // 상위 폴더로 이동
    currentId = parents[0]
  }

  return false
}

/**
 * 하위 폴더 조회/생성 (사업장별 > 유해요인별 구조)
 */
async function getOrCreateFolder(name: string, parentId: string): Promise<string> {
  const res = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  })

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!
  }

  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  })

  return folder.data.id!
}

/**
 * 영상 업로드용 폴더 경로 생성
 * 구조: 새움터_작업영상 / {사업장명} / {assessmentLabel} / {elementWorkName}
 */
export async function getUploadFolderId(
  workplaceName: string,
  assessmentLabel: string,
  elementWorkName: string
): Promise<string> {
  const rootId = await getRootFolderId()
  const workplaceFolderId = await getOrCreateFolder(workplaceName, rootId)
  const assessmentFolderId = await getOrCreateFolder(assessmentLabel, workplaceFolderId)
  const elementWorkFolderId = await getOrCreateFolder(elementWorkName, assessmentFolderId)
  return elementWorkFolderId
}

/**
 * Google Drive에 영상 파일 업로드
 */
export async function uploadVideoToDrive(params: {
  buffer: Buffer
  fileName: string
  mimeType: string
  folderId: string
}): Promise<{ fileId: string; webViewLink: string }> {
  if (!isDriveConfigured()) {
    throw new Error('Google Drive API가 설정되지 않았습니다. 환경변수를 확인해주세요.')
  }

  const { buffer, fileName, mimeType, folderId } = params

  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, webViewLink',
  })

  const fileId = res.data.id!

  // 링크가 있는 사용자 누구나 볼 수 있도록 공유 설정
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  })

  return {
    fileId,
    webViewLink: res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
  }
}

/**
 * Google Drive 파일 스트리밍 URL 생성
 * 직접 다운로드/스트리밍 가능한 URL 반환
 */
export function getStreamUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`
}

/**
 * Google Drive 영상 임베드 URL (iframe용)
 */
export function getEmbedUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`
}

/**
 * Google Drive 썸네일 URL
 */
export function getThumbnailUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w320`
}

/**
 * Google Drive에서 파일 삭제
 * 안전장치: '새움터_작업영상' 폴더 하위 파일만 삭제 가능
 */
export async function deleteFileFromDrive(fileId: string): Promise<void> {
  // 삭제 전 파일이 루트 폴더 하위인지 검증
  const isUnderRoot = await isFileUnderRootFolder(fileId)
  if (!isUnderRoot) {
    throw new Error(
      `안전장치: 파일(${fileId})이 '${ROOT_FOLDER_NAME}' 폴더 하위에 있지 않아 삭제할 수 없습니다.`
    )
  }

  await drive.files.delete({ fileId })
}

/**
 * Google Drive 파일 메타데이터 조회
 */
export async function getFileMetadata(fileId: string) {
  const res = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size, thumbnailLink, webViewLink, videoMediaMetadata',
  })
  return res.data
}

/**
 * Google Drive API 연결 테스트
 */
export async function testConnection(): Promise<boolean> {
  if (!isDriveConfigured()) return false

  try {
    await drive.about.get({ fields: 'storageQuota' })
    return true
  } catch {
    return false
  }
}
