import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { UserStatus } from '@prisma/client'
import { sendNewUserNotification } from './email'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    // 이메일/비밀번호 로그인
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('이메일과 비밀번호를 입력해주세요.')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) {
          throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) {
          throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
        }

        // 승인 상태 체크
        if (user.status === 'PENDING') {
          throw new Error('PENDING:관리자 승인을 기다리고 있습니다.')
        }
        if (user.status === 'REJECTED') {
          throw new Error('REJECTED:가입이 거부되었습니다.')
        }
        if (user.status === 'SUSPENDED') {
          throw new Error('SUSPENDED:계정이 정지되었습니다.')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          status: user.status,
        }
      },
    }),

    // Google 로그인 (환경변수가 설정된 경우만)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],

  callbacks: {
    // 소셜 로그인 후 승인 상태 체크
    async signIn({ user, account }) {
      // Credentials 로그인은 authorize에서 이미 체크함
      if (account?.provider === 'credentials') {
        return true
      }

      // 소셜 로그인: DB에서 사용자 조회
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
      })

      if (dbUser) {
        if (dbUser.status === 'PENDING') {
          return '/pending-approval'
        }
        if (dbUser.status === 'REJECTED') {
          return '/login?error=rejected'
        }
        if (dbUser.status === 'SUSPENDED') {
          return '/login?error=suspended'
        }
      }

      return true
    },

    // JWT 토큰에 role, status 추가
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.status = user.status
      }

      // 세션 업데이트 시 DB에서 최신 정보 가져오기
      if (trigger === 'update' && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
        })
        if (dbUser) {
          token.role = dbUser.role
          token.status = dbUser.status
        }
      }

      return token
    },

    // 세션에 사용자 정보 추가
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role
        session.user.status = token.status
      }
      return session
    },
  },

  events: {
    // 새 사용자 생성 시 (소셜 로그인)
    async createUser({ user }) {
      // PrismaAdapter가 기본값을 무시하므로 강제로 설정
      await prisma.user.update({
        where: { id: user.id },
        data: {
          role: 'WORKPLACE_USER',
          status: 'PENDING',
        },
      })

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Auth] 새 사용자 생성: ${user.email} (승인 대기, WORKPLACE_USER)`)
      }

      // Google 로그인 신규 사용자 이메일 알림
      sendNewUserNotification({
        name: user.name || '이름 미입력',
        email: user.email!,
        provider: 'google',
      })
    },
  },
}
