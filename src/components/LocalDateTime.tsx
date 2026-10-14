'use client';

type Props = {
  date: string | Date;
  /** 'date' | 'time' | 'datetime' */
  mode?: 'date' | 'time' | 'datetime';
  className?: string;
};

/**
 * Formats a timestamp in the viewer's local timezone (browser).
 * Server-rendered pages default to UTC on Vercel, which is why times looked 3h off in EAT.
 */
export function LocalDateTime({ date, mode = 'datetime', className }: Props) {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (Number.isNaN(d.getTime())) {
    return <span className={className}>—</span>;
  }

  let text: string;
  if (mode === 'date') {
    text = d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } else if (mode === 'time') {
    text = d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } else {
    text = d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <time dateTime={d.toISOString()} className={className}>
      {text}
    </time>
  );
}
