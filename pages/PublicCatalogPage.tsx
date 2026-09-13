import React, { useEffect, useState } from 'react';
import { Footer } from '../components/Footer';
import { applyMetadata } from '../utils/pageMetadata';
import { parseRoute, metadataFor, bookPath, authorPath, safeImage } from '../seo/metadata.mjs';

export const PublicCatalogPage: React.FC<{ path: string }> = ({ path }) => {
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState('');
    const route = parseRoute(path);
    useEffect(() => {
        const controller = new AbortController();
        setData(null); setError('');
        const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace(/\/+$/, '');
        fetch(`${base}/public/seo/catalog?page=${route.page}${route.filter ? `&${route.filter}=${encodeURIComponent(route.value)}` : ''}`, { signal: controller.signal })
            .then(response => { if (!response.ok) throw new Error('Stories could not be loaded. Please try again.'); return response.json(); })
            .then(result => {
                if (controller.signal.aborted) return;
                setData(result);
                const meta = metadataFor(route, result);
                if (route.filter === 'tag' && route.page === 1 && result.books.length < 3) meta.index = false;
                applyMetadata(meta);
            }).catch(failure => { if (!controller.signal.aborted) setError(failure.message); });
        return () => controller.abort();
    }, [path]);
    return <><article className="seo-landing">
        <header className="seo-hero"><p className="ww-page-eyebrow">Read online</p><h1>{route.value ? `${route.value} stories` : 'Stories and novels'}</h1><p>{metadataFor(route).description}</p></header>
        {error ? <p role="alert">{error} <a href={path}>Try again</a></p> : !data ? <p role="status">Loading stories…</p> : <>
            <div className="seo-book-grid">{data.books.map(book => <article key={book.id}><a href={bookPath(book.id)}><img src={safeImage(book.coverUrl)} alt={`Cover of ${book.title}`} width={200} height={300} loading="lazy" /><h2>{book.title}</h2></a><a href={authorPath(book.author.id)}>{book.author.name}</a><p>{book.summary}</p></article>)}</div>
            {!data.books.length && <p>No published stories were found here. <a href="/category">Explore the library</a>.</p>}
            <nav className="seo-pagination" aria-label="Pagination">{route.page > 1 && <a rel="prev" href={`${route.path}${route.page > 2 ? `?page=${route.page - 1}` : ''}`}>Previous page</a>}{data.hasMore && <a rel="next" href={`${route.path}?page=${route.page + 1}`}>Next page</a>}</nav>
        </>}
    </article><Footer /></>;
};
