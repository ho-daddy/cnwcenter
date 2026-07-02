import { prisma } from './prisma'

// saeum-homepage(center.saeum.space)의 Donation 테이블을 cross-schema raw SQL로 조회.
// cnwcenter와 saeum-homepage는 물리적으로 같은 Postgres DB를 쓰고,
// 스키마만 public(cnwcenter) / saeum_homepage(saeum-homepage)로 분리되어 있음.
// Prisma multiSchema로 모델을 새로 매핑하는 대신, 기존 cnwcenter 스키마를
// 건드리지 않는 raw SQL 조회로 접근한다 (2026-07-02 v2/v5 계획 참고).

export interface DonationRow {
  id: number
  name: string
  phone: string
  email: string | null
  bankName: string
  monthlyAmount: number
  withdrawDay: number
  status: string
  campaign: string | null
  createdAt: Date
}

// 후원회원 목록 조회 (계좌번호·생년월일 등 민감정보는 select에서 제외)
export async function getDonations(): Promise<DonationRow[]> {
  return prisma.$queryRaw<DonationRow[]>`
    SELECT id, name, phone, email, "bankName", "monthlyAmount", "withdrawDay", status, campaign, "createdAt"
    FROM saeum_homepage.donation
    ORDER BY "createdAt" DESC
  `
}

// 전화번호 정규화 (하이픈·국가번호 등 제거) 후 비교용
// 실데이터 확인 결과 하이픈 유무 + "+82" 국가번호 혼용 확인됨 (2026-07-02)
function normalizePhone(phone: string): string {
  const digitsOnly = phone.replace(/[^0-9]/g, '')
  // +82/82로 시작하는 국제번호 표기 → 010으로 변환 (예: 821012345678 → 01012345678)
  if (digitsOnly.startsWith('82') && digitsOnly.length === 12) {
    return '0' + digitsOnly.slice(2)
  }
  return digitsOnly
}

// 기존 엑셀 이관분 그룹과 통일 (2026-07-02 진일님 지시로 "후원회원 2026"→"후원회원" 개명, 연도 구분 불필요)
const DONOR_GROUP_NAME = '후원회원'
const ANJAEBEOM_GROUP_NAME = '안재범 후원'

// campaign 필드가 saeum-homepage 폼 버그로 실데이터에 채워지지 않고 있어(2026-07-02 확인),
// withdrawDay=1을 함께 휴리스틱으로 사용. 폼 버그 고쳐지면 campaign만으로도 자연히 커버됨.
function isAnjaebeom(d: Pick<DonationRow, 'campaign' | 'withdrawDay'>): boolean {
  return d.campaign === 'anjaebeom' || d.withdrawDay === 1
}

async function getOrCreateGroup(name: string, description: string) {
  return prisma.memberGroup.upsert({
    where: { name },
    update: {},
    create: { name, description },
  })
}

// completed 후원 전체를 대상으로 Member 등록(없으면 신규 생성) + 그룹 배정을 맞춰준다.
// 이미 매칭된 기존 회원도 그룹 배정은 매번 다시 확인한다 — 그렇지 않으면 이 기능 도입 전에
// 이미 등록돼있던 회원이나, 그룹 판정 로직이 바뀐 뒤에도 "안재범 후원" 그룹에서 계속 빠지는 문제가 생김
// (2026-07-02 사라 테스트로 발견: 기존 매칭 회원은 그룹 재확인이 아예 안 되고 있었음).
// pending은 자동등록 금지 — 실데이터에 테스트·중도포기 신청 다수 확인됨.
async function autoRegisterCompletedDonors(
  donations: DonationRow[],
  memberByPhone: Map<string, { id: string; name: string; phone: string }>
) {
  const completed = donations.filter((d) => d.status === 'completed')
  if (completed.length === 0) return

  const donorGroup = await getOrCreateGroup(DONOR_GROUP_NAME, 'center.saeum.space CMS 후원 완료 시 자동 등록')
  const anjaebeomGroup = await getOrCreateGroup(ANJAEBEOM_GROUP_NAME, '안재범 동지 특별후원 (campaign 또는 출금일 1일 기준)')

  for (const d of completed) {
    const normalized = normalizePhone(d.phone)

    const member = await prisma.member.upsert({
      where: { phone: normalized },
      update: {},
      create: {
        name: d.name.trim(),
        phone: normalized,
        email: d.email,
        notes: 'center.saeum.space CMS 후원 자동 등록',
      },
    })

    const groupIds = [donorGroup.id, ...(isAnjaebeom(d) ? [anjaebeomGroup.id] : [])]
    for (const groupId of groupIds) {
      await prisma.memberGroupMember.upsert({
        where: { memberId_groupId: { memberId: member.id, groupId } },
        update: {},
        create: { memberId: member.id, groupId },
      })
    }

    memberByPhone.set(normalized, { id: member.id, name: member.name, phone: member.phone })
  }
}

// Donation ↔ cnwcenter Member 전화번호 매칭 (느슨한 연결, FK 아님)
// status=completed 신규 후원자는 Member로 자동 등록 + "후원회원" 그룹 배정
export async function getDonationsWithMemberMatch() {
  const [donations, members] = await Promise.all([
    getDonations(),
    prisma.member.findMany({ select: { id: true, name: true, phone: true } }),
  ])

  const memberByPhone = new Map(members.map((m) => [normalizePhone(m.phone), m]))

  await autoRegisterCompletedDonors(donations, memberByPhone)

  return donations.map((d) => ({
    ...d,
    isAnjaebeom: isAnjaebeom(d),
    matchedMember: memberByPhone.get(normalizePhone(d.phone)) ?? null,
  }))
}
