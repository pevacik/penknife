export type ProductFieldKey = 'title' | 'minOrder' | 'productionTime' | 'description';

export interface ProductFieldConfig {
  key: ProductFieldKey;
  label: string;
  placeholder: string;
  multiline?: boolean;
}

export const productFields: ProductFieldConfig[] = [
  {
    key: 'title',
    label: 'Название изделия',
    placeholder: 'Например: Складной нож',
  },
  {
    key: 'minOrder',
    label: 'Минимальный тираж',
    placeholder: 'Например: 100 шт.',
  },
  {
    key: 'productionTime',
    label: 'Срок производства',
    placeholder: 'Например: 2 недели',
  },
  {
    key: 'description',
    label: 'Описание',
    placeholder: 'Краткое описание изделия',
    multiline: true,
  },
];
