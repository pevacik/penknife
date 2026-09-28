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
];

export interface CsvProductRow {
  id: string;
  title: string;
  price: number;
  circulation: string;
  make50: boolean;
  productionCountry: ProductionCountry;
  tags: string[];
}

function parseCountry(value: string): ProductionCountry {
  const label = value.trim().toLowerCase();
  return (
    productionCountryOptions.find((option) => option.label.toLowerCase() === label)?.value ??
    'russia'
  );
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
    }));
}

