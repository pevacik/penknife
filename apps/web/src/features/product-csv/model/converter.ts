import { parseCsv, serializeCsv } from '@/shared/lib/csv';
import { getProductionCountryLabel, productionCountryOptions } from '@/entities/product';
import type { Product, ProductionCountry } from '@/entities/product';

const CSV_HEADER = [
  'id',
  'Название изделия',
  'Цена',
  'Тираж',
  'Сделать 50',
  'Срок производства',
  'Теги',
  'Изображения',
  'Комментарии',
];

export interface CsvComment {
  title: string;
  text: string;
}

export interface CsvProductRow {
  id: string;
  title: string;
  price: number;
  circulation: string;
  make50: boolean;
  productionCountry: ProductionCountry;
  tags: string[];
  images: string[];
  comments: CsvComment[];
}

function parseCountry(value: string): ProductionCountry {
  const label = value.trim().toLowerCase();
  return (
    productionCountryOptions.find((option) => option.label.toLowerCase() === label)?.value ??
    'russia'
  );
}

function parseComments(value: string): CsvComment[] {
  return value
    .split(' | ')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf(' :: ');
      if (index === -1) {
        return { title: line, text: '' };
      }
      return { title: line.slice(0, index).trim(), text: line.slice(index + 4).trim() };
    });
}

export function productsToCsv(products: Product[]): string {
  const rows = products.map((product) => [
    product.id,
    product.title,
    String(product.price),
    product.circulation,
    product.make50 ? 'Да' : 'Нет',
    getProductionCountryLabel(product.productionCountry),
    product.tags.join(', '),
    product.images.map((image) => image.url).join(' '),
    product.comments.map((comment) => `${comment.title} :: ${comment.text}`).join(' | '),
  ]);

  return serializeCsv([CSV_HEADER, ...rows]);
}

export function csvToProducts(text: string): CsvProductRow[] {
  const rows = parseCsv(text);
  if (rows.length <= 1) {
    return [];
  }

  return rows
    .slice(1)
    .filter((row) => row.some((cell) => (cell ?? '').trim() !== ''))
    .map((row) => ({
      id: (row[0] ?? '').trim(),
      title: (row[1] ?? '').trim() || 'Новая карточка',
      price: Number((row[2] ?? '').replace(/\D/g, '')) || 0,
      circulation: (row[3] ?? '').replace(/\D/g, ''),
      make50: (row[4] ?? '').trim().toLowerCase() === 'да',
      productionCountry: parseCountry(row[5] ?? ''),
      tags: (row[6] ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      images: (row[7] ?? '')
        .split(' ')
        .map((url) => url.trim())
        .filter(Boolean),
      comments: parseComments(row[8] ?? ''),
    }));
}


