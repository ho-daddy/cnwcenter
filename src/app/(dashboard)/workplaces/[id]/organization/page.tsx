'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  FolderTree,
  Loader2,
} from 'lucide-react'

export default function OrganizationPage() {
  const params = useParams()
  const router = useRouter()
  const workplaceId = params.id as string

  const [orgId, setOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 사업장의 단일 조직도 조회 (없으면 자동 생성 후 바로 편집 페이지로 이동)
  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const res = await fetch(`/api/workplaces/${workplaceId}/organizations`)
        if (res.ok) {
          const data = await res.json()
          const org = data.organization
          if (org) {
            setOrgId(org.id)
            // 바로 편집 페이지로 리다이렉트
            router.replace(`/workplaces/${workplaceId}/organization/${org.id}`)
          }
        }
      } catch (error) {
        console.error('조직도 조회 오류:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchOrganization()
  }, [workplaceId, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // 조직도가 없을 때 (일반적으로 도달하지 않음 - upsert이므로)
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/workplaces/${workplaceId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            사업장
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderTree className="h-6 w-6" />
          조직도 관리
        </h1>
      </div>

      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p>조직도를 불러오는 중...</p>
        </CardContent>
      </Card>
    </div>
  )
}
