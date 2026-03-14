import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center space-y-4">
          {/* 센터 이름 */}
          <p className="text-white font-semibold text-sm">
            충남노동건강인권센터 새움터
          </p>

          {/* 링크 */}
          <nav className="flex flex-col sm:flex-row items-center gap-2 sm:gap-1 text-xs">
            <Link
              href="/privacy"
              className="hover:text-white transition-colors"
            >
              개인정보처리방침
            </Link>
            <span className="hidden sm:inline text-gray-600">|</span>
            <Link
              href="/terms"
              className="hover:text-white transition-colors"
            >
              이용약관
            </Link>
            <span className="hidden sm:inline text-gray-600">|</span>
            <Link
              href="/contact"
              className="hover:text-white transition-colors"
            >
              문의하기
            </Link>
          </nav>

          {/* 저작권 */}
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} 충남노동건강인권센터 새움터. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
