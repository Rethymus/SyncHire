import { NextRequest, NextResponse } from "next/server";
import { logger, LogCategory } from "@/lib/logger";
import { createSimpleResumePdf, htmlToPlainText } from "@/lib/simple-pdf";

export async function POST(request: NextRequest) {
  try {
    const { html, filename } = await request.json();

    if (!html) {
      return NextResponse.json(
        { error: "HTML content is required" },
        { status: 400 }
      );
    }

    const pdf = createSimpleResumePdf({
      title: filename || "SyncHire resume",
      plainText: htmlToPlainText(html),
    });

    const response = new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename || "resume"}.pdf"`,
      },
    });

    return response;
  } catch (error) {
    logger.error(LogCategory.API, "PDF generation error", error as Error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

// For production with Puppeteer, you would use something like:
/*
import puppeteer from 'puppeteer';

export async function POST(request: NextRequest) {
  const { html, template, filename } = await request.json();

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Load template CSS
  const templateCSS = await fs.readFile(
    path.join(process.cwd(), 'public', 'templates', `${template}.css`),
    'utf-8'
  );

  // Inject CSS into HTML
  const styledHtml = html.replace(
    '</head>',
    `<style>${templateCSS}</style></head>`
  );

  await page.setContent(styledHtml, {
    waitUntil: 'networkidle0'
  });

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20px',
      right: '20px',
      bottom: '20px',
      left: '20px'
    }
  });

  await browser.close();

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename || 'resume'}.pdf"`
    }
  });
}
*/
