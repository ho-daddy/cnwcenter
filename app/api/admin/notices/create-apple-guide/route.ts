import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 관리자 권한 확인
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });

    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'STAFF')) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }

    const content = `# 📱 iPhone/iPad 사용자를 위한 영상 촬영 설정 안내

## ⚠️ 문제 상황

아이폰이나 아이패드로 촬영한 영상이 **웹 브라우저에서 재생되지 않는** 문제가 발생할 수 있습니다.

**증상:**
- 영상 업로드는 정상적으로 완료됨
- Safari에서는 재생 가능
- Chrome, Firefox, Edge 등에서는 재생 안 됨
- "이 형식을 지원하지 않습니다" 오류 발생

---

## 🔍 원인

iOS 11부터 애플 기기는 기본적으로 **HEVC(H.265)** 코덱으로 영상을 촬영합니다.

이 코덱은:
- ✅ 용량이 작고 화질이 좋음
- ❌ 웹 브라우저 대부분이 지원하지 않음

---

## ✅ 해결 방법: 카메라 설정 변경

### iPhone/iPad 설정:

1. **설정(Settings)** 앱 열기
2. **카메라(Camera)** 선택
3. **포맷(Formats)** 선택
4. **호환성 우선(Most Compatible)** 선택

\`\`\`
설정 → 카메라 → 포맷 → 호환성 우선
\`\`\`

### 설정 후:

- 영상이 **H.264** 코덱으로 촬영됩니다
- 모든 웹 브라우저에서 정상 재생됩니다
- 용량이 약간 커지지만 호환성이 훨씬 좋습니다

---

## 📋 이미 촬영한 영상은?

**방법 1: 앱에서 직접 변환 (추천)**

영상 업로드 시 자동으로 H.264로 변환되도록 시스템을 개선할 예정입니다.

**방법 2: 기기에서 재촬영**

위 설정 변경 후 다시 촬영해주세요.

---

## 🎯 권장사항

**근골격계 유해요인조사 영상 촬영 시:**

1. ✅ 사전에 카메라 설정을 "호환성 우선"으로 변경
2. ✅ 촬영 후 컴퓨터에서 미리 재생 테스트
3. ✅ 여러 브라우저(Chrome, Firefox 등)에서 확인

---

## ❓ 자주 묻는 질문

**Q. 이미 "고효율" 모드로 촬영한 영상이 많은데 어떻게 하나요?**  
A. 당분간은 Safari 브라우저를 사용하시거나, 시스템 개선을 기다려주세요.

**Q. "호환성 우선"으로 바꾸면 화질이 나빠지나요?**  
A. 아니요. 화질은 거의 동일하고, 다만 파일 크기가 약간 커집니다.

**Q. 설정을 바꾸면 사진도 영향을 받나요?**  
A. 아니요. 사진은 여전히 HEIF/HEIC 포맷으로 촬영되며, 필요 시 자동으로 JPEG로 변환됩니다.

**Q. 안드로이드 폰은 어떤가요?**  
A. 대부분의 안드로이드 기기는 기본적으로 H.264로 촬영하므로 문제가 없습니다.

---

## 📞 문의

영상 재생 문제가 지속되거나 설정 방법이 어려우시면 관리자에게 문의해주세요.

---

**작성일:** 2026-03-29  
**새움터(충남노동건강인권센터)**`;

    // 공지사항 생성
    const notice = await prisma.notice.create({
      data: {
        title: '📱 iPhone/iPad 영상 촬영 설정 안내',
        content: content,
        authorId: user.id,
        isPinned: true
      }
    });

    return NextResponse.json({
      success: true,
      notice: {
        id: notice.id,
        title: notice.title,
        isPinned: notice.isPinned
      }
    });

  } catch (error) {
    console.error('공지사항 생성 오류:', error);
    return NextResponse.json(
      { error: '공지사항 생성에 실패했습니다' },
      { status: 500 }
    );
  }
}
