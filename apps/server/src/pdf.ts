import PDFDocument from 'pdfkit';
import path from 'node:path';
import { getProductById } from './store/prismaStore';
import { getPdfImageBuffer, localFileNameFromUrl } from './images';
import { downloadImage } from './safeFetch';

const FONT_PATH = path.resolve(process.cwd(), 'assets', 'fonts', 'NotoSans-Regular.ttf');
const FONT_SIZE = 12;
const GAP = 12;
const COMMENT_LINES = 4;
const IMAGE_ASPECT = 16 / 9;

function isSupportedImage(buffer: Buffer): boolean {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true; // JPEG
  }
  if (buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return true; // PNG
  }
  return false;
}

async function loadImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const fileName = localFileNameFromUrl(url);
    if (fileName) {
      // Уменьшенный JPEG-вариант: pdfkit не умеет WebP, а оригиналы весят много.
      return await getPdfImageBuffer(fileName);
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Старые внешние URL — через тот же безопасный загрузчик.
      return await downloadImage(url);
    }
    return null;
  } catch {
    return null;
  }
}

export async function buildListPdf(items: Array<{ id: string; comment: string }>): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  doc.font(FONT_PATH);
  doc.fontSize(FONT_SIZE);

  const { left, right } = doc.page.margins;
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - left - right;
  // Рамка 16:9 на всю ширину страницы: картинка вписывается пропорционально,
  // без кропа и растяжения; при отличающихся пропорциях остаётся «воздух».
  const frameHeight = pageWidth / IMAGE_ASPECT;

  let hasContent = false;

  const placeItem = (buffer: Buffer, comment: string) => {
    if (hasContent) {
      doc.addPage();
    }

    doc.image(buffer, 0, 0, {
      fit: [pageWidth, frameHeight],
      align: 'center',
      valign: 'center',
    });

    if (comment) {
      doc.fontSize(FONT_SIZE);
      const lineHeight = doc.currentLineHeight();
      doc.text(comment, left, frameHeight + GAP, {
        width: contentWidth,
        height: lineHeight * COMMENT_LINES + 1,
        ellipsis: true,
        lineGap: 0,
        align: 'left',
      });
    }

    hasContent = true;
  };

  for (const item of items) {
    const product = await getProductById(item.id);
    if (!product) {
      continue;
    }
    const cover = product.images[0]?.url;
    if (!cover) {
      continue;
    }
    const buffer = await loadImageBuffer(cover);
    if (!buffer || !isSupportedImage(buffer)) {
      continue;
    }
    placeItem(buffer, (item.comment ?? '').trim());
  }

  doc.end();
  return finished;
}
