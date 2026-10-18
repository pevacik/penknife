import PDFDocument from 'pdfkit';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { getProductById } from './store/prismaStore';
import { UPLOADS_DIR } from './storage';

const FONT_PATH = path.resolve(process.cwd(), 'assets', 'fonts', 'NotoSans-Regular.ttf');
const FONT_SIZE = 12;
const GAP = 16;
const COMMENT_AREA = 64;

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
    if (url.startsWith('/uploads/')) {
      const filename = url.slice('/uploads/'.length);
      return await fs.readFile(path.join(UPLOADS_DIR, filename));
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }
      return Buffer.from(await response.arrayBuffer());
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

  const { left, right, top, bottom } = doc.page.margins;
  const usableWidth = doc.page.width - left - right;
  const usableHeight = doc.page.height - top - bottom;

  let hasContent = false;

  const placeItem = (buffer: Buffer, comment: string) => {
    if (hasContent) {
      doc.addPage();
    }

    const imageHeight = comment ? usableHeight - COMMENT_AREA : usableHeight;

    doc.image(buffer, left, top, {
      fit: [usableWidth, imageHeight],
      align: 'center',
      valign: 'center',
    });

    if (comment) {
      doc.text(comment, left, top + imageHeight + GAP, {
        width: usableWidth,
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
