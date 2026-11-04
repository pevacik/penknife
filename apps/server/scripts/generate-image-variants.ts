import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  IMAGE_VARIANTS,
  ensureVariant,
  getPdfImageBuffer,
  resolveOriginalPath,
} from '../src/images';
import { UPLOADS_DIR } from '../src/storage';

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function percent(part: number, total: number): string {
  if (total === 0) {
    return '0%';
  }
  return `${Math.round((part / total) * 100)}%`;
}

async function main() {
  const entries = await fs.readdir(UPLOADS_DIR, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);

  console.log(`[variants] файлов найдено: ${files.length}`);

  let originalBytes = 0;
  let thumbBytes = 0;
  let mediumBytes = 0;
  let pdfBytes = 0;
  let processed = 0;
  let failed = 0;

  const startedAt = Date.now();

  for (const [index, fileName] of files.entries()) {
    try {
      const source = await fs.stat(resolveOriginalPath(fileName));
      originalBytes += source.size;

      for (const variant of Object.keys(IMAGE_VARIANTS) as Array<keyof typeof IMAGE_VARIANTS>) {
        const target = await ensureVariant(fileName, variant);
        const size = (await fs.stat(target)).size;
        if (variant === 'thumb') {
          thumbBytes += size;
        } else {
          mediumBytes += size;
        }
      }

      pdfBytes += (await getPdfImageBuffer(fileName)).length;
      processed += 1;
    } catch (error) {
      failed += 1;
      console.warn(`[variants] пропущено ${fileName}:`, error instanceof Error ? error.message : error);
    }

    if ((index + 1) % 25 === 0) {
      console.log(`[variants] обработано ${index + 1} / ${files.length}`);
    }
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log('');
  console.log(`[variants] готово: ${processed}, с ошибками: ${failed}, время: ${elapsed} с`);
  console.log(`[variants] оригиналы: ${formatMegabytes(originalBytes)}`);
  console.log(
    `[variants] thumb: ${formatMegabytes(thumbBytes)} (${percent(thumbBytes, originalBytes)} от оригиналов)`,
  );
  console.log(
    `[variants] medium: ${formatMegabytes(mediumBytes)} (${percent(mediumBytes, originalBytes)} от оригиналов)`,
  );
  console.log(
    `[variants] pdf jpeg: ${formatMegabytes(pdfBytes)} (${percent(pdfBytes, originalBytes)} от оригиналов)`,
  );
}

void main().catch((error) => {
  console.error('[variants] ошибка:', error);
  process.exitCode = 1;
});
