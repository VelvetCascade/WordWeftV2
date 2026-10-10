import React, { useMemo, useState } from 'react';
import { chapterDiff, chapterMetadataChanges, changedWords, diffGroups, manuscriptLines, type ChapterSnapshot, type DiffRow } from '../utils/chapterComparison';
import '../styles/chapter-comparison.css';

function UnchangedLines({ rows, render }: { rows: DiffRow[]; render: (rows: DiffRow[]) => React.ReactNode }) {
    const [open, setOpen] = useState(false), [limit, setLimit] = useState(100);
    return <details className="ww-diff-context" onToggle={event => setOpen(event.currentTarget.open)}><summary>Show {rows.length} unchanged {rows.length === 1 ? 'line' : 'lines'}</summary>
        {open && <>{render(rows.slice(0, limit))}{limit < rows.length && <button type="button" className="ww-release-comparison-button" onClick={() => setLimit(value => value + 100)}>Show next {Math.min(100, rows.length - limit)} unchanged lines</button>}</>}
    </details>;
}

/** One readable comparison for recovery points, current edits and release review. */
export function ChapterDiff({ before, after, beforeLabel, afterLabel }: {
    before: ChapterSnapshot | null; after: ChapterSnapshot; beforeLabel: string; afterLabel: string;
}) {
    const diff = useMemo(() => chapterDiff(before?.content || '', after.content), [before?.content, after.content]);
    const metadata = useMemo(() => chapterMetadataChanges(before || { title: '', content: '' }, after), [before, after]);
    const groups = useMemo(() => diffGroups(diff.rows), [diff.rows]);
    const highlights = useMemo(() => {
        const result = new Map<DiffRow, ReturnType<typeof changedWords>['before']>();
        // Pair changed paragraphs in each edit run, never across unchanged prose.
        for (let start = 0; start < diff.rows.length;) {
            if (diff.rows[start].kind === 'equal') { start++; continue; }
            let end = start;
            while (end < diff.rows.length && diff.rows[end].kind !== 'equal') end++;
            const deleted = diff.rows.slice(start, end).filter(row => row.kind === 'delete');
            const added = diff.rows.slice(start, end).filter(row => row.kind === 'add');
            if (deleted.length <= 100 && added.length <= 100) deleted.slice(0, added.length).forEach((row, index) => {
                const words = changedWords(row.line.text, added[index].line.text);
                result.set(row, words.before); result.set(added[index], words.after);
            });
            start = end;
        }
        return result;
    }, [diff.rows]);
    const renderRows = (rows: DiffRow[]) => rows.map((row, index) => <div className={`ww-diff-row ww-diff-${row.kind}`} key={`${row.before || '-'}:${row.after || '-'}:${index}`}>
        <span className="ww-diff-number" aria-label={row.before ? `${beforeLabel} line ${row.before}` : undefined}>{row.before || ''}</span>
        <span className="ww-diff-number" aria-label={row.after ? `${afterLabel} line ${row.after}` : undefined}>{row.after || ''}</span>
        <span className="ww-diff-sign"><span className="sr-only">{row.kind === 'add' ? 'Added: ' : row.kind === 'delete' ? 'Deleted: ' : 'Unchanged: '}</span><span aria-hidden="true">{row.kind === 'add' ? '+' : row.kind === 'delete' ? '−' : ' '}</span></span>
        <div className="ww-diff-prose">{row.line.annotations.length > 0 && <small>{row.line.annotations.join(' · ')}</small>}
            <span>{highlights.has(row) ? highlights.get(row)!.map((part, i) => part.changed ? <mark key={i}>{part.text}</mark> : part.text) : row.line.text || <em>Empty paragraph</em>}</span>
        </div>
    </div>);
    return <section className="ww-chapter-diff" aria-label="Chapter differences">
        <header className="ww-diff-heading"><div><strong>{beforeLabel}</strong><span aria-hidden="true"> → </span><strong>{afterLabel}</strong></div><div className="ww-diff-counts"><span className="ww-diff-added">+{diff.added} added</span><span className="ww-diff-deleted">−{diff.deleted} deleted</span></div></header>
        <p className="ww-diff-help">Paragraphs and story elements are numbered as lines. Formatting changes appear beside the passage.</p>
        {metadata.length > 0 && <details className="ww-diff-details" open={!diff.added && !diff.deleted}><summary>{metadata.length} chapter {metadata.length === 1 ? 'detail' : 'details'} changed · {metadata.map(change => change.label.toLowerCase()).join(', ')}</summary><dl className="ww-diff-metadata">{metadata.map(change => <div key={change.label}><dt>{change.label}</dt><dd>{before && <div className="ww-diff-delete"><span className="ww-diff-sign" aria-label="Deleted">−</span><span>{change.before}</span></div>}<div className="ww-diff-add"><span className="ww-diff-sign" aria-label="Added">+</span><span>{change.after}</span></div></dd></div>)}</dl></details>}
        {!diff.added && !diff.deleted && <p className="ww-diff-empty">{metadata.length ? 'Chapter text and formatting are unchanged.' : 'No changes between these versions.'}</p>}
        {diff.simplified && <p className="ww-diff-help" role="status">Large rewrite: the changed portion is shown as a complete replacement.</p>}
        {diff.rows.length > 0 && <div className="ww-diff-manuscript" role="region" aria-label="Manuscript changes" tabIndex={0}>
            <div className="ww-diff-column-labels" aria-hidden="true"><span>Old</span><span>New</span><span /><span>Manuscript</span></div>
            {groups.map((group, index) => group.kind === 'context' ? <UnchangedLines key={index} rows={group.rows} render={renderRows} /> : <React.Fragment key={index}>{renderRows(group.rows)}</React.Fragment>)}
        </div>}
        <details className="ww-diff-complete"><summary>Read complete versions</summary><div className="ww-diff-copies">{[{ value: before, label: beforeLabel }, { value: after, label: afterLabel }].map(({ value, label }) => <section key={label}><h4>{label}</h4><div role="region" aria-label={`${label} manuscript`} tabIndex={0}>{value ? manuscriptLines(value.content).map(line => line.text).join('\n\n') : 'Not previously published.'}</div></section>)}</div></details>
    </section>;
}
