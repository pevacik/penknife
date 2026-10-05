import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import type { Product } from '../src/types';

const prisma = new PrismaClient();

const DATA_FILE = path.resolve(process.cwd(), 'data', 'products.json');

async function main() {
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const products = JSON.parse(raw) as Product[];

  let created = 0;
  let skipped = 0;

  for (const product of products) {
    const exists = await prisma.product.findUnique({ where: { id: product.id } });
    if (exists) {
      skipped += 1;
      continue;
    }

    await prisma.product.create({
      data: {
        id: product.id,
        title: product.title,
        price: product.price,
        circulation: product.circulation,
        make50: product.make50,
        productionCountry: product.productionCountry,
        tags: product.tags ?? [],
        createdAt: product.createdAt ? new Date(product.createdAt) : undefined,
        images: {
          create: (product.images ?? []).map((image) => ({
            id: image.id,
            url: image.url,
          })),
        },
        comments: {
          create: (product.comments ?? []).map((comment) => ({
            id: comment.id,
            title: comment.title,
            text: comment.text,
            createdAt: comment.createdAt ? new Date(comment.createdAt) : undefined,
            images: {
              create: (comment.images ?? []).map((image) => ({
                id: image.id,
                url: image.url,
              })),
            },
          })),
        },
      },
    });

    created += 1;
  }

  console.log(`Импортировано: ${created}, пропущено (уже есть): ${skipped}, всего: ${products.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
