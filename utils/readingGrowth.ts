export function challengeStatusLabel(challenge: { joined: boolean; completed: boolean; progress: number; target: number }): string {
    if (!challenge.joined) return 'Join challenge';
    if (challenge.completed) return 'Completed';
    return `${challenge.progress} of ${challenge.target}`;
}

export function eventTimingLabel(startAt: string, endAt: string, now = new Date()): string {
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (now < start) return `Starts ${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    if (now > end) return 'Ended';
    return `Open until ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}
