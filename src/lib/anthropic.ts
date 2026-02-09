import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

/**
 * Anthropic 클라이언트 싱글톤
 */
export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다')
    }

    client = new Anthropic({ apiKey })
  }

  return client
}
