import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        tutorialCompletedRiskAssessment: true,
        tutorialCompletedMusculoskeletal: true,
        tutorialCompletedWorkplaces: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      riskAssessment: user.tutorialCompletedRiskAssessment,
      musculoskeletal: user.tutorialCompletedMusculoskeletal,
      workplaces: user.tutorialCompletedWorkplaces,
    })
  } catch (error) {
    console.error('Failed to fetch tutorial status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tutorialId } = body

    const fieldMap: Record<string, string> = {
      riskAssessment: 'tutorialCompletedRiskAssessment',
      musculoskeletal: 'tutorialCompletedMusculoskeletal',
      workplaces: 'tutorialCompletedWorkplaces',
    }

    const field = fieldMap[tutorialId]
    if (!field) {
      return NextResponse.json({ error: 'Invalid tutorial ID' }, { status: 400 })
    }

    await prisma.user.update({
      where: { email: session.user.email },
      data: { [field]: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update tutorial status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
