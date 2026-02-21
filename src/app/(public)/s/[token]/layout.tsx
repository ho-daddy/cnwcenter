import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '설문조사 — 새움터',
}

export default function PublicSurveyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  )
}
