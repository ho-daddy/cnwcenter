import { TermsContent } from '@/components/terms-content'

export const metadata = {
  title: '이용약관 | 새움터',
  description: '충남노동건강인권센터 새움터 이용약관',
}

export default function TermsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">이용약관</h1>
      <p className="text-sm text-gray-500 mb-8">시행일: 2026년 3월 29일</p>
      <div className="bg-white rounded-lg shadow-sm p-8">
        <TermsContent />
      </div>
    </div>
  )
}
