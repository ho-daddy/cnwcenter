import { google } from 'googleapis'
import { Readable } from 'stream'

// Google Drive OAuth2 클라이언트 (싱글톤)
// Service Account 대신 OAuth2 + Refresh Token 방식 사용
// cnwcenter@gmail.com 계정의 Google Drive에 파일 저장

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
 */
export async function deleteFileFromDrive(fileId: string): Promise<void> {
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
  try {
    await drive.about.get({ fields: 'storageQuota' })
    return true
  } catch {
    return false
  }
}
