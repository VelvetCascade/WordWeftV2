import type { DailyTrendPoint } from '../types.ts';

export function normalizeDailyTrend(
    points: DailyTrendPoint[],
    days = 14,
    now = new Date(),
): DailyTrendPoint[] {
    const byDate = new Map(points.map(point => [point.date, point]));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const result: DailyTrendPoint[] = [];

    for (let offset = days - 1; offset >= 0; offset -= 1) {
        const date = new Date(end);
        date.setUTCDate(end.getUTCDate() - offset);
        const key = date.toISOString().slice(0, 10);
        const point = byDate.get(key);
        result.push({
            date: key,
            readers: finiteNonNegative(point?.readers),
            views: finiteNonNegative(point?.views),
        });
    }
    return result;
}

export function formatRate(value: number): string {
    const safe = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
    return `${Math.round(safe)}%`;
}

function finiteNonNegative(value: number | undefined): number {
    return Number.isFinite(value) ? Math.max(0, value ?? 0) : 0;
}
