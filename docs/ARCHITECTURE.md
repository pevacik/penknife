# Архитектура и руководство по разработке

## 1. Обзор

Penknife — приложение в стиле маркетплейса для управления карточками товаров.

- **Frontend**: Vite + React 19 + TypeScript, архитектура [Feature-Sliced Design](https://feature-sliced.design/), состояние — Zustand.
- **Backend**: Express + Prisma ORM + PostgreSQL (в Docker), генерация PDF (pdfkit), загрузка файлов (multer).

Монорепозиторий (npm workspaces):

```
apps/
├── web/       # фронтенд (FSD)
└── server/    # API-сервер
```

## 2. Бэкенд (`apps/server`)

| Файл | Ответственность |
|---|---|
| `src/index.ts` | Точка входа: `PORT` / `HOST` (0.0.0.0), печать IP для доступа из сети |
| `src/app.ts` | Сборка Express: CORS, JSON, маршруты, раздача собранного фронта + SPA-fallback |
| `src/db.ts` | Синглтон `PrismaClient` + загрузка `.env` |
| `src/storage.ts` | Путь к папке `uploads/` |
| `src/types.ts` | Доменные типы: `Product`, `ProductComment`, `ProductImage`, payload-типы |
| `src/routes/products.ts` | REST карточек: список (пагинация+фильтры), CRUD, комментарии, картинки, `POST /export-pdf` |
| `src/routes/uploads.ts` | Загрузка изображений (multer) → `/uploads/:file` |
| `src/store/prismaStore.ts` | Весь CRUD через Prisma + сериализация в прежнюю форму `Product` |
| `src/pdf.ts` | Генерация PDF (картинка + комментарий, кириллица) |
| `prisma/schema.prisma` | Модели: `Product`, `ProductImage`, `Comment`, `CommentImage` |
| `scripts/import-json-to-db.ts` | Разовый импорт старых данных из `data/products.json` |
| `assets/fonts/NotoSans-Regular.ttf` | Шрифт с кириллицей для PDF |

**Модель данных (Prisma)**:
- `Product` — карточка (`title`, `price`, `circulation`, `make50`, `productionCountry`, `tags[]`, `createdAt`).
- `ProductImage` — картинка карточки (`url`, `productId`, cascade delete).
- `Comment` — комментарий (`title`, `text`, `createdAt`, `productId`, cascade delete).
- `CommentImage` — картинка комментария (`url`, `commentId`, cascade delete).

**Конфигурация**: `DATABASE_URL` в `apps/server/.env` (пример — `.env.example`); PostgreSQL поднимается `docker-compose.yml`.

## 3. Фронтенд (`apps/web`) — FSD

- `app/` — корень: `App.tsx`, глобальные стили (`styles/index.css`, CSS-переменные).
- `pages/` — `home`, `product-detail`.
- `widgets/` — `header`, `product-list`.
- `features/` — бизнес-фичи:
  - `add-product` — кнопка «Добавить карточку».
  - `cart` — корзина (`model/store`, `CartButton`, `CartToggleButton`, `CartIcon`).
  - `delete-product`, `edit-product` — удаление / форма редактирования.
  - `product-comments`, `product-images` — комментарии и картинки на странице карточки.
  - `product-csv` — импорт/экспорт CSV.
  - `product-filters`, `search-products` — фильтры и поиск.
- `entities/` — `product`: модель (`types`, `fields`), `store` (zustand), `api`, `ui/ProductCard`, `lib/normalize`.
- `shared/`:
  - `ui/` — `Button`, `Input`, `Select`, `Textarea`, `Modal`, `ImageLightbox`.
  - `api/` — `httpClient`, `uploadImage`.
  - `lib/` — `csv`, `download`, `clipboard`.
  - `config/env.ts` — `API_URL` (по умолчанию `/api`, переопределяется `VITE_API_URL`).
## 4. Основные потоки данных

**Список карточек (пагинация)**:
`ProductList` → `useProductStore.loadProducts(filters)` → `GET /api/products?page&limit&query&country&circulation&maxBudget&make50` → сервер фильтрует и сортирует (по убыванию цены), возвращает `{ items, total, page, limit, hasMore }`. Догрузка по скроллу — через `IntersectionObserver` в `ProductList`.

**Страница карточки**: `ProductDetailPage` → `getProduct(id)` → `GET /api/products/:id`, кэш в `productsById`.

**Корзина**: `useCartStore` (zustand + persist в `localStorage`). Позиция хранит `{ id, title, imageUrl, comment }`. Комментарий генерируется автоматически (`Цена от … · Тираж от … · Срок: …`) и редактируется в корзине.

**PDF**: `CartButton` → `productApi.exportPdf(items)` → `POST /api/products/export-pdf` с `{ items: [{ id, comment }] }` → `pdf.ts` рисует для каждой позиции альбомную страницу (картинка + комментарий).

**CSV**: `CsvMenu` — экспорт через `GET /api/products/all`, импорт через существующие API (создание/обновление).

## 5. Переиспользуемые элементы

- `shared/ui/Modal` — модальное окно (`title`, `onClose`, `children`, `actions`); используется в корзине и CSV.
- `shared/ui/Button`, `Input`, `Select`, `Textarea` — базовые контролы.
- `shared/ui/ImageLightbox` — просмотр картинок (листание).
- `shared/lib/download` — `downloadBlob`, `downloadTextFile`.
- `shared/lib/clipboard` — чтение картинок из буфера обмена.
- `shared/api/httpClient` — обёртка над `fetch` (JSON + blob), `uploadImage`.
- `entities/product/model/fields` — `getProductionCountryLabel`, `getProductionTerm`.
- `features/cart/ui/CartIcon` — иконка корзины.

## 6. Запуск / сборка / БД

```bash
npm install
docker compose up -d          # PostgreSQL
cd apps/server
npx prisma generate
npx prisma db push            # синхронизировать схему
npm run db:import             # необязательно: перенос data/products.json
# из корня:
npm run dev                   # фронт + сервер
```

Сборка: `npm run build` (фронт), `npm run build:server` (сервер), `npm run start` (собранный сервер).

## 7. Как добавить фичу

1. **Сервер**: при необходимости — модель в `prisma/schema.prisma` → `prisma db push`; добавить функцию в `store/prismaStore.ts` (или новый store); добавить маршрут в `routes/`.
2. **Фронт**: тип/поле в `entities/product/model/types.ts`; метод в `api/productApi.ts`; экшен в `model/store.ts`; UI-компонент в нужной `features/*`.
3. Прогнать `npm run build` и `npm run build:server`.

## 8. Известные нюансы

- **pdfkit**: не используй `doc.heightOfString()` — он создаёт лишние страницы; под комментарий зарезервирована фиксированная область.
- Встроенные шрифты pdfkit не поддерживают кириллицу — используется `assets/fonts/NotoSans-Regular.ttf`.
- **Prisma зафиксирована на v6** (`6.19.3`); v7 — другой мажорный релиз.
- Картинки лежат на диске в `apps/server/uploads/`, в БД хранятся только URL.
- Метки стран дублируются между сервером (`COUNTRY_LABEL` в `prismaStore.ts`) и фронтом (`getProductionCountryLabel`) — это разные рантаймы, синхронизировать вручную.
- `.env`, `apps/server/data/`, `apps/server/uploads/` — в `.gitignore`.

