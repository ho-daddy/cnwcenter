import { chromium } from 'playwright'

export interface PdfOptions {
  landscape?: boolean
  format?: 'A4' | 'Letter'
  marginTop?: string
  marginBottom?: string
  marginLeft?: string
  marginRight?: string
  printBackground?: boolean
  displayHeaderFooter?: boolean
  headerTemplate?: string
  footerTemplate?: string
}

const DEFAULT_OPTIONS: PdfOptions = {
  landscape: true,
  format: 'A4',
  marginTop: '20mm',
  marginBottom: '15mm',
  marginLeft: '10mm',
  marginRight: '10mm',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate: `
    <div style="width:100%; text-align:center; font-size:8px; color:#999; padding:0 10mm;">
      <span class="pageNumber"></span> / <span class="totalPages"></span>
    </div>
  `,
}

export async function generatePdf(
  html: string,
  options?: Partial<PdfOptions>
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ locale: 'ko-KR' })
    const page = await context.newPage()

    await page.setContent(html, { waitUntil: 'networkidle' })

    const pdfBuffer = await page.pdf({
      format: opts.format,
      landscape: opts.landscape,
      printBackground: opts.printBackground,
      displayHeaderFooter: opts.displayHeaderFooter,
      headerTemplate: opts.headerTemplate,
      footerTemplate: opts.footerTemplate,
      margin: {
        top: opts.marginTop!,
        bottom: opts.marginBottom!,
        left: opts.marginLeft!,
        right: opts.marginRight!,
      },
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
