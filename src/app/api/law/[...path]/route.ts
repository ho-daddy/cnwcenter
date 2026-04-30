import { NextRequest, NextResponse } from 'next/server'

const LAW_SERVER = process.env.LAW_SERVER_URL || 'http://localhost:8100'

async function proxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/')
  const url = `${LAW_SERVER}/law/${path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  let body: string | undefined
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      body = JSON.stringify(await req.json())
    } catch {
      body = undefined
    }
  }

  try {
    const res = await fetch(url, {
      method: req.method,
      headers,
      body,
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ error: '법령 서버 연결 실패', detail: e?.message }, { status: 502 })
  }
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const DELETE = proxy
