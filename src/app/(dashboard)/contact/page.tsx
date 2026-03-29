import { ContactContent } from '@/components/contact-content'

export const metadata = {
  title: '문의하기 | 새움터',
  description: '충남노동건강인권센터 새움터 문의하기',
}

export default function ContactPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">문의하기</h1>
      <p className="text-sm text-gray-500 mb-8">충남노동건강인권센터 새움터</p>
      <div className="bg-white rounded-lg shadow-sm p-8">
        <ContactContent />
      </div>
    </div>
  )
}
