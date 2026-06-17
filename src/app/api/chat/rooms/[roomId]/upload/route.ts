import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isValidBotKey } from '@/lib/chat'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const MAX_SIZE = 100 * 1024 * 1024 // 100MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/haansofthwp', 'application/x-hwp',
  'application/zip', 'application/x-zip-compressed', 'application/x-zip',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4',
  'text/plain',
]

export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session && !isValidBotKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chat', params.roomId)
  await mkdir(uploadDir, { recursive: true })

  const safeName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, '_')
  const uniqueName = `${Date.now()}_${safeName}`
  const filePath = path.join(uploadDir, uniqueName)

  const bytes = await file.arrayBuffer()
  await writeFile(filePath, Buffer.from(bytes))

  const fileUrl = `/uploads/chat/${params.roomId}/${uniqueName}`
  return NextResponse.json({ fileUrl, fileName: file.name })
}
