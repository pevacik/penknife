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
| `src/index.ts` | Точка входа: `PORT` / `HOST` (по умолчанию `127.0.0.1`), очистка истёкших сессий, печать LAN-адресов только при `HOST=0.0.0.0` |
| `src/app.ts` | Сборка Express: security-заголовки, CORS, JSON, auth, лимиты, маршруты, статика + SPA-fallback |
| `src/config.ts` | Настройки из env: CORS, TTL сессии, флаги cookie, trust proxy |
| `src/auth/*` | Пароли (scrypt), сессии в БД, cookie, типы `req.user` |
| `src/middleware/*` | `requireAuth`, `originCheck`, `rateLimit`, `securityHeaders`, `errorHandler` |
| `src/routes/auth.ts` | `POST /login`, `POST /logout`, `GET /me` |
| `src/db.ts` | Синглтон `PrismaClient` + загрузка `.env` |
| `src/storage.ts` | Путь к папке `uploads/` |
| `src/types.ts` | Доменные типы: `Product`, `ProductComment`, `ProductImage`, payload-типы |
| `src/routes/products.ts` | REST карточек: список (пагинация+фильтры), CRUD, комментарии, картинки, `POST /export-pdf` |
| `src/routes/uploads.ts` | Загрузка изображений (multipart) и `POST /from-url` → `/uploads/:file` |
| `src/routes/media.ts` | Раздача вариантов: `GET /media/:variant/:file` (WebP, immutable-кэш) |
| `src/images.ts` | Варианты (`thumb`/`medium`/PDF-JPEG), ленивая генерация, атомарная запись, импорт по ссылке |
| `src/safeFetch.ts` | Скачивание картинок: SSRF-гард, лимиты 15 МБ / 15 с, ручные редиректы |
| `src/httpError.ts` | Ошибка с HTTP-статусом для error-middleware |
| `src/store/prismaStore.ts` | Весь CRUD через Prisma + сериализация в прежнюю форму `Product` |
| `src/pdf.ts` | Генерация PDF (JPEG-вариант картинки + комментарий, кириллица) |
| `prisma/schema.prisma` | Модели: `Product`, `ProductImage`, `Comment`, `CommentImage` |
| `scripts/import-json-to-db.ts` | Разовый импорт старых данных из `data/products.json` |
| `scripts/create-user.ts` | Создание пользователя / смена пароля (`npm run user:create`) |
| `scripts/generate-image-variants.ts` | Прогрев вариантов всех картинок (`npm run images:variants`) |
| `assets/fonts/NotoSans-Regular.ttf` | Шрифт с кириллицей для PDF |

**Модель данных (Prisma)**:
- `Product` — карточка (`title`, `price`, `circulation`, `make50`, `productionCountry`, `tags[]`, `createdAt`).
- `ProductImage` — картинка карточки (`url`, `productId`, cascade delete).
- `Comment` — комментарий (`title`, `text`, `authorId`, `authorName`, `createdAt`, `updatedAt`, `productId`, cascade delete). Автор и имя фиксируются в момент создания, имя сохраняется даже после удаления пользователя.
- `CommentImage` — картинка комментария (`url`, `commentId`, cascade delete).
- `User` — администратор (`username`, `passwordHash`, `role`).
- `Session` — сессия (`tokenHash`, `userId`, `expiresAt`, cascade delete).

**Конфигурация**: `DATABASE_URL` в `apps/server/.env` (пример — `.env.example`); PostgreSQL поднимается `docker-compose.yml`.

## 3. Фронтенд (`apps/web`) — FSD

- `app/` — корень: `App.tsx`, глобальные стили (`styles/index.css`, CSS-переменные).
- `pages/` — `home`, `product-detail`, `login`, `admin-users`, `admin-audit`.
- `widgets/` — `header` (в т.ч. выпадающее `AccountMenu` с аккаунтом, паролем, админ-разделами и выходом), `product-list`.
- `features/` — бизнес-фичи:
  - `add-product` — кнопка «Добавить карточку».
  - `auth` — форма входа (данные сессии и права живут в `entities/session`).
  - `manage-users` — админ-панель: список пользователей, создание/удаление, роли и персональные права.
  - `cart` — корзина (`model/store`, `CartButton`, `CartToggleButton`, `CartIcon`).
  - `delete-product`, `edit-product` — удаление / форма редактирования.
  - `product-comments`, `product-images` — комментарии (с автором, временем и редактированием) и картинки на странице карточки.
  - `product-csv` — импорт/экспорт CSV.
  - `change-password` — управляемая `ChangePasswordModal` и обёртка-кнопка для смены своего пароля.
  - `audit-log` — журнал действий: фильтры, статистика, детали записей (`/admin/audit`).
  - `product-filters`, `search-products` — фильтры и поиск.
- `entities/` — `product`: модель (`types`, `fields`), `store` (zustand), `api`, `ui/ProductCard`, `lib/normalize`; `session`: стор `useAuthStore`, API (`login/logout/me`), эффективные права (`useCan`), подписи ролей и прав (`ROLE_LABEL`, `PERMISSION_LABEL`), типы.
- `shared/`:
  - `ui/` — `Button`, `Input`, `Select`, `Textarea`, `Modal`, `ImageLightbox`.
  - `api/` — `httpClient`, `uploadImage` (+ `importImageFromUrl`).
  - `lib/` — `csv`, `download`, `clipboard`, `imageUrl`, `toast`.
  - `ui/Toast` — хост всплывающих сообщений (в т.ч. «У вас нет прав для этого действия»).
  - `config/env.ts` — `API_URL` (по умолчанию `/api`, переопределяется `VITE_API_URL`).
## 4. Основные потоки данных

**Список карточек (пагинация)**:
`ProductList` → `useProductStore.loadProducts(filters)` → `GET /api/products?page&limit&query&country&circulation&maxBudget&make50` → сервер фильтрует и сортирует (по убыванию цены), возвращает `{ items, total, page, limit, hasMore }`. Догрузка по скроллу — через `IntersectionObserver` в `ProductList`.

**Страница карточки**: `ProductDetailPage` → `getProduct(id)` → `GET /api/products/:id`, кэш в `productsById`.

**Вход**: `App` → `loadMe()` → `GET /api/auth/me`; без сессии показывается `LoginPage` → `POST /api/auth/login` ставит httpOnly-cookie. Любой ответ `401` в `httpClient` отправляет событие `auth:unauthorized`, и стор сбрасывает пользователя на форму входа.

**Смена своего пароля**: в шапке `Header` → `AccountMenu` (выпадающее меню) → «Сменить пароль» → `ChangePasswordModal` → `POST /api/auth/password` с новым паролем (старый не запрашивается); сервер ставит `passwordChangedAt`/`passwordChangedById`/`passwordChangedByName` и завершает все сессии пользователя, кроме текущей. Пароль для входа хранится как scrypt-хеш, а для показа в админке — дополнительно в зашифрованном виде (`PASSWORD_ENCRYPTION_KEY`). Админ меняет чужой пароль через `PATCH /api/users/:id`, а кнопка «Пароль» в админ-панели показывает сохранённый пароль через `GET /api/users/:id/password`.

**Права в UI**: `useCan('createProduct' | …)` из `entities/session` читает эффективные права, которые вернул `GET /api/auth/me`; сервер независимо проверяет их через `requirePermission`. Кнопки действий не скрываются: без права они показывают toast «У вас нет прав для этого действия» и не отправляют запрос. На `403` фронт перезапрашивает `/me` (событие `auth:forbidden`), поэтому выданные или отозванные права подхватываются без перелогина. Авторство карточки и ссылка «История карточки» показываются только при `viewAudit`; это структурное право, которое нельзя выдать персонально.

**Админ-панель**: `AdminUsersPage` (`/admin/users`, доступ по `manageUsers`) → `features/manage-users` → `GET/POST/PATCH/DELETE /api/users`, `POST /api/users/:id/logout`. Персональные права хранятся как `grantedPermissions`/`revokedPermissions`, эффективный набор считает сервер.

**Журнал действий**: `AdminAuditPage` (`/admin/audit`, доступ по `viewAudit`) → `features/audit-log` → `GET /api/audit` и `GET /api/audit/stats`. Записи `AuditLog` создаются в маршрутах через `src/audit/record.ts`; ошибка записи аудита логируется и не ломает основную операцию. В записи — `action` (`product.create`, `comment.update`, `auth.login` …), `entityType/entityId`, `productId`, `actorId/actorName`, snapshot названия, `details` (before/after), IP и User-Agent. Связей с `User`/`Product` нет, поэтому журнал переживает их удаление. Фильтры: группа действия (`action=product`), поиск по названию/логину, период, `productId` (ссылка «История карточки»). Статистика — по действиям, дням и пользователям.

**Корзина**: `useCartStore` (zustand + persist в `localStorage`). Позиция хранит `{ id, title, imageUrl, comment }`. Комментарий генерируется автоматически (`Цена от … · Тираж от … · Срок: …`) и редактируется в корзине.

**PDF**: `CartButton` → `productApi.exportPdf(items)` → `POST /api/products/export-pdf` с `{ items: [{ id, comment }] }` → `pdf.ts` рисует для каждой позиции альбомную страницу: картинка вписывается (`fit`, без кропа и растяжения) в 16:9-рамку на всю ширину страницы от верхнего края; при других пропорциях картинка центрируется и остаётся «воздух». Под рамкой — до 4 строк комментария (12 pt), длинный текст обрезается с «…».

**CSV**: `CsvMenu` — экспорт через `GET /api/products/all`, импорт через существующие API (создание/обновление). Битые ссылки на картинки пропускаются и не роняют импорт.

**Комментарии**: `CommentSection` → `POST /api/products/:id/comments`; сервер записывает `authorId`/`authorName` из сессии и `createdAt`. Редактирование — `PATCH /api/products/:id/comments/:commentId`: любой пользователь с `manageComments` может редактировать любой комментарий (свой и чужой); при изменении ставятся `updatedAt`, `updatedById`/`updatedByName`. Удаление (`DELETE .../comments/:commentId`) — только право `deleteComments` (роль `admin`); удаление картинки комментария — только `deleteImages` (роль `admin`).

**Картинки**: `ImageSection` → `uploadImage(file)` → `POST /api/uploads` (multipart) или `importImageFromUrl(url)` → `POST /api/uploads/from-url`. В обоих случаях сервер сохраняет файл как `/uploads/<uuid>.<ext>`, прогревает варианты и возвращает локальный URL, который уходит в `POST /api/products/:id/images`; удаление изображения карточки требует `deleteImages` (только `admin`). Сервер сам скачивает внешние `http(s)`-URL (в том числе из CSV и комментариев), поэтому в БД попадают только локальные ссылки.

## 5. Картинки: варианты, кэш, как добавить новый размер

- В БД хранится один URL — `/uploads/<uuid>.<ext>`; производные размеры вычисляются из него.
- Варианты (`apps/server/src/images.ts`, `IMAGE_VARIANTS`):

| Вариант | Ширина | Формат | Где используется |
|---|---|---|---|
| `thumb` | 480 px | WebP q72 | витрина, корзина, превью в галерее и комментариях |
| `medium` | 1280 px | WebP q80 | резерв для карточки/крупных экранов |
| `pdf` | до 1600 px | JPEG q82 | встраивание в PDF (пропорции сохраняются, в PDF вписывается в 16:9-рамку) |

- Файлы лежат в `apps/server/uploads/.variants/<variant>/<uuid>.webp` (для PDF — `.jpg`). Папка с точкой не раздаётся `express.static` (`dotfiles: 'ignore'`), наружу доступен только `/media/:variant/:file`.
- Генерация: при загрузке/импорте (сразу `thumb` + `medium`) и лениво в `GET /media/:variant/:file` — `ensureVariant()` досоздаёт вариант при первом запросе. Параллельные запросы одного варианта делят один `Promise`; запись атомарная (tmp-файл → `rename`).
- Прогрев существующих файлов: `npm run images:variants` (progress + отчёт по весам).
- Кэш: `/uploads` и `/media` — `Cache-Control: public, max-age=31536000, immutable`; `/assets/*` (Vite, хэш в имени) — тоже `immutable`; `index.html` — `no-cache`. Имена файлов — UUID, поэтому `immutable` безопасен.
- Фронтенд: `getImageUrl(url, variant)` из `shared/lib/imageUrl` превращает `/uploads/x.png` в `/media/thumb/x.png`; у превью `loading="lazy"` и `decoding="async"`, лайтбокс всегда грузит `original`.
- **Как добавить новый размер**: добавить запись в `IMAGE_VARIANTS` (`images.ts`) → прогнать `npm run images:variants` → использовать `getImageUrl(url, 'новый')` во фронте. Схема БД и API карточек не меняются.
- Ограничения: анимированные GIF дают статичные варианты (оригинал остаётся анимированным); при удалении картинки из БД файлы и варианты не чистятся; `immutable` на год корректен только пока файлы не перезаписываются на месте.

## 6. Переиспользуемые элементы

- `shared/ui/Modal` — модальное окно (`title`, `onClose`, `children`, `actions`); используется в корзине и CSV.
- `shared/ui/Button`, `Input`, `Select`, `Textarea` — базовые контролы.
- `shared/ui/ImageLightbox` — просмотр картинок (листание).
- `shared/lib/download` — `downloadBlob`, `downloadTextFile`.
- `shared/lib/clipboard` — чтение картинок из буфера обмена.
- `shared/api/httpClient` — обёртка над `fetch` (JSON + blob); ошибки — `HttpError` со `status` и сообщением сервера; `uploadImage`, `importImageFromUrl`.
- `entities/product/model/fields` — `getProductionCountryLabel`, `getProductionTerm`.
- `features/cart/ui/CartIcon` — иконка корзины.

## 7. Запуск / сборка / БД

```bash
npm install
docker compose up -d          # PostgreSQL
cd apps/server
npx prisma generate
npx prisma db push            # синхронизировать схему
npm run db:import             # необязательно: перенос data/products.json
npm run user:create -- admin  # создать пользователя для входа (спросит пароль)
# из корня:
npm run dev                   # фронт + сервер
```

Сборка: `npm run build` (фронт), `npm run build:server` (сервер), `npm run start` (собранный сервер).

`.env` в корне задаёт `POSTGRES_PASSWORD` для docker compose; `apps/server/.env` — `DATABASE_URL`, `HOST`, `CORS_ORIGINS`, `SESSION_TTL_DAYS`, `COOKIE_SECURE`, `TRUST_PROXY` (образцы — `.env.example`).

## 8. Как добавить фичу

1. **Сервер**: при необходимости — модель в `prisma/schema.prisma` → `prisma db push`; добавить функцию в `store/prismaStore.ts` (или новый store); добавить маршрут в `routes/`.
2. **Фронт**: тип/поле в `entities/product/model/types.ts`; метод в `api/productApi.ts`; экшен в `model/store.ts`; UI-компонент в нужной `features/*`.
3. Прогнать `npm run build` и `npm run build:server`.

## 9. Известные нюансы

- **pdfkit**: не используй `doc.heightOfString()` — он создаёт лишние страницы. Комментарий в PDF рисуется с `height = 4 * currentLineHeight()` и `ellipsis: true` — так он занимает максимум 4 строки и не уезжает на новую страницу; без `height` длинный текст создаёт лишнюю страницу.
- **PDF-картинки**: рисуются в рамке 16:9 на всю ширину страницы от верхнего края через `doc.image(..., { fit, align: 'center', valign: 'center' })` — пропорции сохраняются, кропа и растяжения нет. Для не-16:9 остаётся «воздух» по бокам или сверху/снизу; при печати на принтере без borderless края 16:9-картинки могут подрезаться.
- **pdfkit не читает WebP** — в PDF попадает JPEG-вариант (`getPdfImageBuffer`), а не `medium`.
- Встроенные шрифты pdfkit не поддерживают кириллицу — используется `assets/fonts/NotoSans-Regular.ttf`.
- **Prisma зафиксирована на v6** (`6.19.3`); v7 — другой мажорный релиз.
- Картинки лежат на диске в `apps/server/uploads/`, в БД — только локальные URL (см. раздел 5).
- `/uploads` и `/media` отдаются с `private, immutable` на год: не перезаписывай файлы на месте, иначе браузер продолжит показывать старую версию.
- SSRF-гард (`safeFetch.ts`) блокирует loopback, приватные, link-local и CGNAT-адреса и перепроверяет каждый редирект, но не закрывает DNS-rebinding (адрес резолвится отдельно при проверке и при `fetch`).
- `198.18.0.0/15` (используется частью VPN/прокси) намеренно не блокируется, иначе импорт по ссылке ломается в таких сетях.
- Метки стран дублируются между сервером (`COUNTRY_LABEL` в `prismaStore.ts`) и фронтом (`getProductionCountryLabel`) — это разные рантаймы, синхронизировать вручную.
- `.env`, `apps/server/data/`, `apps/server/uploads/` — в `.gitignore`.

## 10. Аутентификация, роли и безопасность

- **Роли и права**: база по роли (`admin` — всё; `user` — создание/редактирование карточек, добавление изображений, комментарии, PDF, но без удаления (карточек, изображений, комментариев) и CSV; `viewer` — только чтение) плюс персональные `grantedPermissions`/`revokedPermissions`. Эффективные права = `(база ∪ granted) \ revoked`; структурные права `viewProducts`, `deleteProduct`, `deleteImages`, `deleteComments`, `csv`, `manageUsers`, `viewAudit` не переопределяются (удаление, CSV, пользователи и журнал — только у `admin`); `viewAudit` принудительно удаляется у не-админа, поэтому авторство карточки и история недоступны даже при старых/некорректных данных в БД. Неизвестная роль трактуется как `viewer`.
- **Модели**: `User` (`username`, `passwordHash`, `passwordEncrypted`, `passwordChangedAt`, `passwordChangedById`, `passwordChangedByName`, `role` с дефолтом `viewer`, `grantedPermissions[]`, `revokedPermissions[]`), `Session` (`tokenHash`, `expiresAt`, `lastUsedAt`), `AuditLog` (событие, актор, snapshot, `details Json`, IP/UA, индексы по дате/действию/актору/карточке), `Product` (`createdById/Name`, `updatedById/Name`, `updatedAt`), `Comment` (`updatedById/Name`).
- **Пароли**: `crypto.scrypt` (N=16384, r=8, p=1, соль 16 байт, ключ 64 байта), формат `scrypt$N$r$p$salt$hash`, проверка через `timingSafeEqual`. Для несуществующего логина выполняется проверка по dummy-хэшу, чтобы время ответа не выдавало наличие пользователя. Для показа в админке дополнительно сохраняется AES-256-GCM-копия (`PASSWORD_ENCRYPTION_KEY`); при входе/создании/смене пароля копия обновляется, без ключа показ отключён.
- **Сессия**: случайный токен в httpOnly-cookie `penknife_sid` (`SameSite=Lax`, `Secure` в проде, `Path=/`, TTL 7 дней из `SESSION_TTL_DAYS`). В БД хранится SHA-256 токена; `lastUsedAt` обновляется не чаще раза в час; истёкшие сессии чистятся при старте и раз в час.
- **CLI**: `npm run user:create --workspace server -- <логин> [--role=admin|user|viewer] [--grant=...] [--revoke=...]`. Без `--role` первый пользователь в пустой БД становится `admin`, остальные — `user`. Есть `--list` (роль, доп. права, отозванные, сессии) и `--delete=<логин>`; последнего `admin` удалить нельзя; смена пароля или роли удаляет все сессии пользователя.
- **Middleware** (порядок в `app.ts`): `securityHeaders` → `cors` (allowlist + `credentials`) → `express.json` → `requestId` (`X-Request-Id`) → `originCheck` → `/api/health` и `/api/auth` → `apiRateLimit` → `requireAuth` → роутеры с `requirePermission(...)` → `errorHandler`.
- **Доступ**: публичны только `/api/health`, `/api/auth/*` и статика фронта; `/api/*`, `/media`, `/uploads` требуют сессию. Права на операции: `createProduct`, `editProduct`, `deleteProduct`, `manageImages`, `deleteImages`, `manageComments`, `deleteComments`, `csv`, `exportPdf`, `viewAudit`; `/api/users*` — только `manageUsers`, `/api/audit*` — только `viewAudit`. `deleteProduct`, `deleteImages`, `deleteComments`, `csv`, `manageUsers`, `viewAudit` структурные: есть только у `admin`, персонально не выдаются.
- **Админ-панель**: `/admin/users` (только `manageUsers`): создание/удаление пользователей, роль, персональные права, показ пароля по кнопке «Пароль», «Смена пароля» и «Разлогинить». В таблице отображается, когда и кем обновлён пароль (`passwordChangedAt` + `passwordChangedById/Name`: сам, admin или CLI). Показ пароля доступен только `admin`, отдаётся с `Cache-Control: no-store` и фиксируется в `AuditLog` (`user.password_view`). Нельзя изменить/удалить себя и остаться без администратора; смена роли или пароля завершает сессии пользователя, изменение только прав — нет (применяется сразу).
- **Фронтенд**: `useCan()` из `entities/session` читает эффективные права из `/api/auth/me`; кнопки действий остаются видимыми, но без права показывают toast и не отправляют запрос; `viewer` получает read-only форму карточки. Это UX — сервер проверяет права сам. При `403` и возврате на вкладку стор перезапрашивает `/me` (не чаще раза в 30 секунд).
- **CSRF**: cookie `SameSite=Lax` + проверка `Origin` для не-GET запросов в production (в dev отключена, чтобы не ломать LAN-адреса за Vite-прокси).
- **Лимиты**: вход — 5 неудач на IP+логин за 15 минут (`429` + `Retry-After`); API — 300 запросов/мин на IP. Все лимитеры in-memory, рассчитаны на один процесс.
- **Ошибки**: 4xx отдают понятное сообщение, 500 — нейтральное «Ошибка сервера»; стек и детали Prisma только в серверный лог вместе с `X-Request-Id`. `X-Powered-By` отключён.
- **CSP** (`production`): `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`.
- **Ограничения**: нет 2FA и сброса пароля по email; права не привязаны к объектам (владельца у карточки нет); `manageUsers` и `viewAudit` нельзя выдать отдельно — только ролью `admin`; при показе по обычному http в проде нужен `COOKIE_SECURE=false`; фронтенд-бандл после входа всё равно скачивается клиенту; журнал хранится в той же БД и не ротируется автоматически.

