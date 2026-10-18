import type { ProductionCountry } from './types';

export const productionCountryOptions: ReadonlyArray<{
  value: ProductionCountry;
  label: string;
}> = [
  { value: 'russia', label: 'Россия' },
  { value: 'china', label: 'Китай' },
];

export function getProductionCountryLabel(value: ProductionCountry): string {
  return productionCountryOptions.find((option) => option.value === value)?.label ?? value;
}

const PRODUCTION_TERM: Record<ProductionCountry, string> = {
  russia: '25 рабочих дней',
  china: '2 месяца',
};

export function getProductionTerm(value: ProductionCountry): string {
  return PRODUCTION_TERM[value];
}

