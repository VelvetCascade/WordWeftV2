const MINIMUM_LEAD_MS = 2 * 60 * 1000;
const MAXIMUM_LEAD_MS = 365 * 24 * 60 * 60 * 1000;

export function toUtcSchedule(localValue: string, now = new Date()): string {
    const release = new Date(localValue);
    if (!localValue || Number.isNaN(release.getTime())) {
        throw new Error('Choose a valid release time.');
    }
    const lead = release.getTime() - now.getTime();
    if (lead < MINIMUM_LEAD_MS) {
        throw new Error('Choose a release time at least two minutes from now.');
    }
    if (lead > MAXIMUM_LEAD_MS) {
        throw new Error('Choose a release time within the next year.');
    }
    return release.toISOString();
}

export function localScheduleInputValue(date = new Date(Date.now() + 60 * 60 * 1000)): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function browserTimezoneLabel(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local timezone';
}

/** Shared writer status text always includes the timezone for a dated release. */
export function publicationStatusLabel(chapter?: { status: string; scheduledAt?: string | null; publishedAt?: string | null } | null, now = new Date()): string {
    const label = chapter?.status === 'scheduled' ? 'Scheduled' : chapter?.status === 'published' ? 'Published' : 'Private draft';
    const instant = chapter?.status === 'scheduled' ? chapter.scheduledAt : chapter?.status === 'published' ? chapter.publishedAt : null;
    if (!instant) return label;
    const date = new Date(instant);
    if (Number.isNaN(date.getTime())) return label;
    const absolute = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    const seconds = (date.getTime() - now.getTime()) / 1000;
    const unit = Math.abs(seconds) >= 86400 ? 'day' : Math.abs(seconds) >= 3600 ? 'hour' : 'minute';
    const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(Math.round(seconds / (unit === 'day' ? 86400 : unit === 'hour' ? 3600 : 60)), unit);
    return `${label} · ${absolute} ${browserTimezoneLabel()} · ${relative}`;
}
