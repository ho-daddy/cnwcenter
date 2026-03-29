export default function ContactPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-4">문의하기</h1>
      <p className="text-gray-600 mb-8">
        새움터(충남노동건강인권센터)에 궁금하신 사항이 있으시면 언제든지 연락 주세요.
      </p>

      <div className="space-y-8">
        {/* 연락처 정보 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            연락처
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="w-32 font-medium text-gray-700">전화</div>
              <div className="flex-1">
                <div className="text-gray-900 mb-1">
                  <a href="tel:041-663-7780" className="hover:text-blue-600 transition-colors">
                    041-663-7780
                  </a>
                </div>
                <div className="text-gray-900">
                  <a href="tel:010-2017-6066" className="hover:text-blue-600 transition-colors">
                    010-2017-6066
                  </a>
                  <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded">긴급</span>
                </div>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-32 font-medium text-gray-700">팩스</div>
              <div className="flex-1 text-gray-900">
                041-663-7782
              </div>
            </div>
          </div>
        </div>

        {/* 이메일 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            이메일
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="w-32 font-medium text-gray-700">일반 문의</div>
              <div className="flex-1">
                <a 
                  href="mailto:whatfor44@gmail.com" 
                  className="text-blue-600 hover:text-blue-700 transition-colors"
                >
                  whatfor44@gmail.com
                </a>
                <div className="text-sm text-gray-500 mt-1">관리자</div>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-32 font-medium text-gray-700">기술 문의</div>
              <div className="flex-1">
                <a 
                  href="mailto:botcatherine5@gmail.com" 
                  className="text-blue-600 hover:text-blue-700 transition-colors"
                >
                  botcatherine5@gmail.com
                </a>
                <div className="text-sm text-gray-500 mt-1">시스템 오류, 기능 문의</div>
              </div>
            </div>
          </div>
        </div>

        {/* 운영 시간 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            운영 시간
          </h2>
          
          <div className="space-y-3 text-gray-700">
            <div className="flex items-center">
              <div className="w-32 font-medium">평일</div>
              <div className="flex-1">오전 9시 ~ 오후 6시</div>
            </div>
            <div className="flex items-center">
              <div className="w-32 font-medium">주말 및 공휴일</div>
              <div className="flex-1">휴무</div>
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>긴급 상황</strong>의 경우 긴급 연락처(010-2017-6066)로 문의해 주세요.
              </p>
            </div>
          </div>
        </div>

        {/* 자주 묻는 질문 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            자주 묻는 질문
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Q. 회원가입 승인은 얼마나 걸리나요?</h3>
              <p className="text-gray-600 text-sm">
                일반적으로 영업일 기준 1~2일 이내에 처리됩니다. 
                승인 결과는 가입 시 입력하신 이메일로 안내드립니다.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Q. 시스템 사용 중 오류가 발생했어요.</h3>
              <p className="text-gray-600 text-sm">
                기술 문의 이메일(botcatherine5@gmail.com)로 
                오류 상황을 스크린샷과 함께 보내주시면 빠르게 해결해 드리겠습니다.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Q. 위험성평가나 근골조사 상담을 받고 싶어요.</h3>
              <p className="text-gray-600 text-sm">
                회원가입 후 로그인하시면 상담 신청이 가능합니다. 
                또는 전화(041-663-7780)로 문의해 주세요.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Q. 개인정보는 어떻게 관리되나요?</h3>
              <p className="text-gray-600 text-sm">
                개인정보는 「개인정보 보호법」에 따라 안전하게 관리됩니다. 
                자세한 내용은 <a href="/privacy" className="text-blue-600 hover:underline">개인정보처리방침</a>을 참고해 주세요.
              </p>
            </div>
          </div>
        </div>

        {/* 안내사항 */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">안내사항</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>문의 시 회원 정보(이름, 이메일)를 함께 알려주시면 더 빠른 처리가 가능합니다.</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>상담 및 서비스 이용은 무료입니다.</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>현재 베타테스트 중으로, 시스템 오류나 개선사항 제보를 환영합니다.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
