import PDFDocument from 'pdfkit';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { getProductById } from './store/prismaStore';
import { UPLOADS_DIR } from './storage';

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

export async function buildListPdf(ids: string[]): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  const { left, right, top, bottom } = doc.page.margins;
  const usableWidth = doc.page.width - left - right;
  const usableHeight = doc.page.height - top - bottom;

  let hasContent = false;

  const placeImage = (buffer: Buffer) => {
    if (hasContent) {
      doc.addPage();
    }
    doc.image(buffer, left, top, {
      fit: [usableWidth, usableHeight],
      align: 'center',
      valign: 'center',
    });
    hasContent = true;
  };

  for (const id of ids) {
    const product = await getProductById(id);
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
    placeImage(buffer);
  }

  doc.end();
  return finished;
}
