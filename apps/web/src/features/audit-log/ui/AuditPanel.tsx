import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { auditApi } from '../api';
import type { AuditListResponse, AuditLogEntry, AuditStats } from '../api';
import styles from './AuditPanel.module.css';

const ACTION_LABEL: Record<string, string> = {
  'product.create': 'Создание карточки',
  'product.update': 'Изменение карточки',
  'product.delete': 'Удаление карточки',
  'product.image.add': 'Добавление изображения',
  'product.image.delete': 'Удаление изображения',
  'comment.create': 'Создание комментария',
  'comment.update': 'Изменение комментария',
  'comment.delete': 'Удаление комментария',
  'comment.image.delete': 'Удаление изображения комментария',
  'user.create': 'Создание пользователя',
  'user.update': 'Изменение пользователя',
  'user.delete': 'Удаление пользователя',
  'user.logout': 'Завершение сессий пользователя',
  'user.password_view': 'Просмотр пароля',
  'auth.login': 'Вход',
  'auth.login_failed': 'Неудачный вход',
  'auth.logout': 'Выход',
  'auth.password_change': 'Смена пароля',
};

const ACTION_GROUPS = [
  { value: '', label: 'Все действия' },
  { value: 'product', label: 'Карточки' },
  { value: 'comment', label: 'Комментарии' },
  { value: 'image', label: 'Изображения' },
  { value: 'user', label: 'Пользователи' },
  { value: 'auth', label: 'Вход и пароли' },
];

const STAT_CARDS: Array<{ key: string; label: string }> = [
  { key: 'productCreated', label: 'Создано карточек' },
  { key: 'productUpdated', label: 'Изменено карточек' },
  { key: 'productDeleted', label: 'Удалено карточек' },
  { key: 'commentCreated', label: 'Комментариев' },
  { key: 'commentDeleted', label: 'Удалено комментариев' },
  { key: 'imagesDeleted', label: 'Удалено изображений' },
  { key: 'logins', label: 'Входов' },
  { key: 'loginsFailed', label: 'Неудачных входов' },
];

function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString('ru-RU');
}

function dateToIso(value: string, endOfDay = false): string {
  if (!value) {
    return '';
  }
  return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`).toISOString();
}

export function AuditPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const productId = searchParams.get('productId') ?? '';

  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<AuditListResponse | null>(null);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      action: action || undefined,
      search: search.trim() || undefined,
      from: dateToIso(from) || undefined,
      to: dateToIso(to, true) || undefined,
      productId: productId || undefined,
      page,
      limit: 50,
    }),
    [action, search, from, to, productId, page],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void Promise.all([auditApi.list(query), auditApi.stats(query)])
      .then(([list, nextStats]) => {
        if (!active) {
          return;
        }
        setData(list);
        setStats(nextStats);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить журнал');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [query]);

  const resetPage = () => setPage(1);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h1 className={styles.heading}>Журнал действий</h1>
          <p className={styles.subtitle}>
            Кто и что изменил. Записи хранятся без привязки к пользователям и карточкам, поэтому
            остаются после удаления.
          </p>
        </div>
      </div>
      {stats && (
        <>
          <div className={styles.cards}>
            {STAT_CARDS.map((card) => (
              <div key={card.key} className={styles.card}>
                <span className={styles.cardValue}>{stats.totals[card.key] ?? 0}</span>
                <span className={styles.cardLabel}>{card.label}</span>
              </div>
            ))}
          </div>

          {stats.byUser.length > 0 && (
            <div className={styles.byUser}>
              <span className={styles.byUserTitle}>Активнее всех:</span>
              {stats.byUser.slice(0, 6).map((user) => (
                <span key={`${user.actorId ?? 'none'}-${user.actorName}`} className={styles.chip}>
                  {user.actorName}: {user.count}
                </span>
              ))}
            </div>
          )}

          {stats.byDay.length > 0 && (
            <div className={styles.byUser}>
              <span className={styles.byUserTitle}>По дням:</span>
              {stats.byDay.slice(-10).map((day) => {
                const total = Object.values(day.actions).reduce((sum, count) => sum + count, 0);
                return (
                  <span key={day.date} className={styles.chip}>
                    {day.date}: {total}
                  </span>
                );
              })}
            </div>
          )}
        </>
      )}

      <div className={styles.filters}>
        <Select
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            resetPage();
          }}
        >
          {ACTION_GROUPS.map((group) => (
            <option key={group.value} value={group.value}>
              {group.label}
            </option>
          ))}
        </Select>
        <Input
          value={search}
          placeholder="Поиск по названию или логину"
          onChange={(event) => {
            setSearch(event.target.value);
            resetPage();
          }}
        />
        <label className={styles.dateField}>
          <span className={styles.dateLabel}>С</span>
          <Input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              resetPage();
            }}
          />
        </label>
        <label className={styles.dateField}>
          <span className={styles.dateLabel}>По</span>
          <Input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              resetPage();
            }}
          />
        </label>
        {productId && (
          <Button
            variant="ghost"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete('productId');
              setSearchParams(next);
              resetPage();
            }}
          >
            Только карточка ×
          </Button>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {loading && !data ? <p className={styles.state}>Загрузка…</p> : null}

      {data && (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Время</th>
                  <th>Кто</th>
                  <th>Действие</th>
                  <th>Объект</th>
                  <th>Детали</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.empty}>
                      Записей нет
                    </td>
                  </tr>
                ) : (
                  data.items.map((entry) => <AuditRow key={entry.id} entry={entry} />)
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <Button
              variant="ghost"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              ← Назад
            </Button>
            <span className={styles.pageInfo}>
              Страница {data.page} из {totalPages} · всего {data.total}
            </span>
            <Button
              variant="ghost"
              disabled={!data.hasMore || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Вперёд →
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  return (
    <tr>
      <td className={styles.nowrap}>{formatDate(entry.createdAt)}</td>
      <td>
        <span className={styles.actor}>{entry.actorName || 'неизвестно'}</span>
      </td>
      <td>{actionLabel(entry.action)}</td>
      <td>
        <span className={styles.entity}>{entry.title || '—'}</span>
        {entry.productId && <span className={styles.entityId}>{entry.productId.slice(0, 8)}</span>}
      </td>
      <td>
        {entry.details ? (
          <details>
            <summary className={styles.summary}>Показать</summary>
            <pre className={styles.details}>{JSON.stringify(entry.details, null, 2)}</pre>
          </details>
        ) : (
          '—'
        )}
      </td>
      <td className={styles.nowrap}>{entry.ip || '—'}</td>
    </tr>
  );
}

