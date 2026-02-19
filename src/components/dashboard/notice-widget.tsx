import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Bell, Pin, MessageSquare, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

async function getRecentNotices() {
  return prisma.notice.findMany({
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    take: 5,
    include: {
      author: { select: { name: true } },
      _count: { select: { comments: true } },
    },
  })
}

export async function NoticeWidget() {
  const notices = await getRecentNotices()

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-5 h-5 text-blue-600" />
            공지사항
          </CardTitle>
          <Link
            href="/notices"
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            전체보기
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {notices.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">등록된 공지사항이 없습니다.</p>
        ) : (
          <ul className="space-y-1">
            {notices.map((notice) => (
              <li key={notice.id}>
                <Link
                  href={`/notices/${notice.id}`}
                  className="flex items-center gap-2 px-2 py-2.5 rounded-lg hover:bg-gray-50 group transition-colors"
                >
                  {notice.isPinned ? (
                    <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="flex-1 text-sm text-gray-800 truncate group-hover:text-blue-700">
                    {notice.title}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {notice._count.comments > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-gray-400">
                        <MessageSquare className="w-3 h-3" />
                        {notice._count.comments}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {format(notice.createdAt, 'MM/dd', { locale: ko })}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
