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

