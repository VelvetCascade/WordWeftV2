
import React, { useState, useEffect, useMemo } from 'react';
import type { Author, Book } from '../types';
import { BookCard } from '../components/BookCard';
import { Footer } from '../components/Footer';
import { UserGroupIcon, PlusIcon, CheckCircleIcon, BookOpenIcon, StarIcon, EyeIcon, HeartIcon, TwitterIcon, InstagramIcon, ThreadsIcon, ClockIcon, TrophyIcon, DocumentPlusIcon, ChatBubbleLeftIcon } from '../components/icons/Icons';
import { ConnectionsModal } from '../components/ConnectionsModal';
import * as api from '../api/client';

// ── Inline icons not in the shared set ──

const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const MapPinIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const LinkIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
);

const QuillIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
        <line x1="16" y1="8" x2="2" y2="22" />
        <line x1="17.5" y1="15" x2="9" y2="15" />
    </svg>
);

// ── Helper Components ──

const StatPill: React.FC<{ icon: React.ReactNode; value: string | number; label: string }> = ({ icon, value, label }) => (
    <div className="flex flex-col items-center px-5 py-4 bg-white/60 dark:bg-dark-surface-alt/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-dark-border">
        <div className="text-accent mb-1.5">{icon}</div>
        <span className="font-sans font-extrabold text-xl text-text-rich dark:text-dark-text-rich tracking-tight">{value}</span>
        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-0.5">{label}</span>
    </div>
);

const formatReadingTime = (minutes: number) => {
    if (!minutes) return "0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

const formatJoinDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    } catch {
        return null;
    }
};

// ── Main Component ──

export const AuthorPage: React.FC<{ authorId: string }> = ({ authorId }) => {
    const [author, setAuthor] = useState<Author | null>(null);
    const [authorBooks, setAuthorBooks] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFollowLoading, setIsFollowLoading] = useState(false);
    const [connectionModalType, setConnectionModalType] = useState<'followers' | 'following' | null>(null);
    const [activeTab, setActiveTab] = useState<'published' | 'about'>('published');

    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            api.getAuthorById(authorId),
            api.getBooksByAuthor(authorId)
        ]).then(([fetchedAuthor, fetchedBooks]) => {
            setAuthor(fetchedAuthor);
            setAuthorBooks(fetchedBooks);
            setIsLoading(false);
        });
    }, [authorId]);

    const handleFollowToggle = async () => {
        if (!author) return;
        
        // Optimistic UI update
        const prevAuthor = { ...author };
        const isNowFollowing = !author.isFollowing;
        setAuthor({
            ...author,
            isFollowing: isNowFollowing,
            followersCount: (author.followersCount || 0) + (isNowFollowing ? 1 : -1)
        });
        
        setIsFollowLoading(true);
        try {
            if (prevAuthor.isFollowing) {
                await api.unfollowUser(author.id);
            } else {
                await api.followUser(author.id);
            }
        } catch (error) {
            // Revert on failure
            setAuthor(prevAuthor);
            if(!localStorage.getItem('wordweft_jwt')) {
                window.location.hash = '/auth';
            }
        } finally {
            setIsFollowLoading(false);
        }
    };

    // Aggregate stats from books
    const bookStats = useMemo(() => {
        const totalViews = authorBooks.reduce((sum, b) => sum + (b.viewCount || 0), 0);
        const totalLikes = authorBooks.reduce((sum, b) => sum + (b.likesCount || 0), 0);
        const totalChapters = authorBooks.reduce((sum, b) => sum + (b.chapters?.filter(c => c.status === 'published').length || 0), 0);
        const totalWords = authorBooks.reduce((sum, b) => sum + (b.chapters?.reduce((ws, c) => ws + (c.wordCount || 0), 0) || 0), 0);
        const avgRating = authorBooks.length > 0
            ? authorBooks.reduce((sum, b) => sum + (b.rating || 0), 0) / authorBooks.length
            : 0;
        const totalReviews = authorBooks.reduce((sum, b) => sum + (b.reviewsCount || 0), 0);
        const genres = [...new Set(authorBooks.flatMap(b => b.genres || []))];
        return { totalViews, totalLikes, totalChapters, totalWords, avgRating, totalReviews, genres };
    }, [authorBooks]);

    // --- Loading skeleton ---
    if (isLoading) {
        return (
            <div className="min-h-screen">
                <div className="bg-white dark:bg-dark-surface border-b border-gray-200/80 dark:border-dark-border">
                    <div className="container mx-auto px-6 py-12">
                        <div className="flex flex-col md:flex-row items-center gap-8 animate-pulse">
                            <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-dark-surface-alt" />
                            <div className="flex-1 space-y-4 w-full">
                                <div className="h-8 bg-gray-200 dark:bg-dark-surface-alt rounded-xl w-48" />
                                <div className="h-4 bg-gray-200 dark:bg-dark-surface-alt rounded-lg w-full max-w-md" />
                                <div className="h-4 bg-gray-200 dark:bg-dark-surface-alt rounded-lg w-32" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!author) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <div className="text-6xl">🔍</div>
                <h2 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich">Author Not Found</h2>
                <p className="text-text-body dark:text-dark-text-body">This profile doesn't exist or may have been removed.</p>
                <button onClick={() => window.location.hash = '/'} className="mt-4 bg-accent text-white px-6 py-2.5 rounded-xl font-sans font-bold hover:bg-primary transition-colors">
                    Go Home
                </button>
            </div>
        );
    }

    const joinDate = formatJoinDate(author.joinDate);
    const hasSocials = author.socials?.twitter || author.socials?.instagram || author.socials?.threads;
    const hasFavoriteGenres = author.favoriteGenres && author.favoriteGenres.length > 0;
    const hasAboutContent = author.bio || joinDate || author.location || author.website || hasSocials || hasFavoriteGenres || author.stats;
    const initial = author.name ? author.name.charAt(0).toUpperCase() : '?';

    return (
        <div>
            {/* ═══════════  Hero Header  ═══════════ */}
            <div className="relative overflow-hidden">
                {/* Background gradient banner */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent dark:from-primary/20 dark:via-accent/10 dark:to-transparent" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-accent/8 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary/6 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl" />

                <div className="relative container mx-auto px-6 pt-12 pb-8">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                        {/* Avatar */}
                        <div className="relative group flex-shrink-0">
                            {author.avatarUrl ? (
                                <img
                                    src={author.avatarUrl}
                                    alt={author.name}
                                    className="w-36 h-36 rounded-full object-cover ring-4 ring-white dark:ring-dark-surface shadow-lifted transition-transform duration-300 group-hover:scale-105"
                                />
                            ) : (
                                <div className="w-36 h-36 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center ring-4 ring-white dark:ring-dark-surface shadow-lifted">
                                    <span className="text-5xl font-bold text-white font-sans">{initial}</span>
                                </div>
                            )}
                            {/* Reader level badge */}
                            {author.stats?.readerLevel && (
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white dark:bg-dark-surface px-3 py-1 rounded-full shadow-md border border-gray-100 dark:border-dark-border">
                                    <span className="text-[10px] font-extrabold text-accent uppercase tracking-widest whitespace-nowrap">
                                        {author.stats.readerLevel}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Profile Info */}
                        <div className="flex-1 text-center md:text-left min-w-0">
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-3">
                                <h1 className="font-sans text-4xl md:text-5xl font-extrabold text-text-rich dark:text-dark-text-rich tracking-tight leading-tight">
                                    {author.name}
                                </h1>
                                <button 
                                    onClick={handleFollowToggle}
                                    disabled={isFollowLoading}
                                    className={`px-7 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all transform active:scale-95 flex-shrink-0 ${
                                        author.isFollowing 
                                        ? 'bg-gray-100 dark:bg-dark-border text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-dark-border hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950 dark:hover:text-red-400'
                                        : 'bg-accent text-white hover:bg-primary shadow-lg hover:shadow-xl'
                                    }`}
                                >
                                    {author.isFollowing ? (
                                        <>
                                            <CheckCircleIcon className="w-4 h-4" /> Following
                                        </>
                                    ) : (
                                        <>
                                            <PlusIcon className="w-4 h-4" /> Follow
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Bio */}
                            {author.bio && (
                                <p className="text-text-body dark:text-dark-text-body max-w-2xl text-lg leading-relaxed mb-4">
                                    {author.bio}
                                </p>
                            )}

                            {/* Meta info row */}
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                                {joinDate && (
                                    <span className="flex items-center gap-1.5">
                                        <CalendarIcon className="w-4 h-4" /> Joined {joinDate}
                                    </span>
                                )}
                                {author.location && (
                                    <span className="flex items-center gap-1.5">
                                        <MapPinIcon className="w-4 h-4" /> {author.location}
                                    </span>
                                )}
                                {author.website && (
                                    <a
                                        href={author.website.startsWith('http') ? author.website : `https://${author.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-accent hover:text-primary hover:underline transition-colors"
                                    >
                                        <LinkIcon className="w-4 h-4" /> {author.website.replace(/^https?:\/\//, '')}
                                    </a>
                                )}
                                {authorBooks.length > 0 && (
                                    <span className="flex items-center gap-1.5">
                                        <QuillIcon className="w-4 h-4" /> {authorBooks.length} {authorBooks.length === 1 ? 'Book' : 'Books'} Published
                                    </span>
                                )}
                            </div>

                            {/* Social links */}
                            {hasSocials && (
                                <div className="flex items-center justify-center md:justify-start gap-3 mt-4">
                                    {author.socials?.twitter && (
                                        <a href={author.socials.twitter} target="_blank" rel="noreferrer" className="p-2.5 bg-white/80 dark:bg-dark-surface-alt rounded-xl hover:bg-[#1DA1F2] hover:text-white transition-all shadow-sm hover:shadow-md group" title="Twitter / X">
                                            <TwitterIcon className="w-5 h-5" />
                                        </a>
                                    )}
                                    {author.socials?.instagram && (
                                        <a href={author.socials.instagram} target="_blank" rel="noreferrer" className="p-2.5 bg-white/80 dark:bg-dark-surface-alt rounded-xl hover:bg-gradient-to-tr hover:from-yellow-400 hover:via-red-500 hover:to-purple-500 hover:text-white transition-all shadow-sm hover:shadow-md" title="Instagram">
                                            <InstagramIcon className="w-5 h-5" />
                                        </a>
                                    )}
                                    {author.socials?.threads && (
                                        <a href={author.socials.threads} target="_blank" rel="noreferrer" className="p-2.5 bg-white/80 dark:bg-dark-surface-alt rounded-xl hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all shadow-sm hover:shadow-md" title="Threads">
                                            <ThreadsIcon className="w-5 h-5" />
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Followers / Following section */}
                            <div className="flex items-center justify-center md:justify-start gap-6 mt-6">
                                <button 
                                    onClick={() => setConnectionModalType('followers')}
                                    className="flex items-center gap-2 group"
                                >
                                    <span className="font-extrabold text-2xl text-text-rich dark:text-dark-text-rich group-hover:text-accent transition-colors">{author.followersCount || 0}</span>
                                    <span className="text-sm text-gray-500 group-hover:text-accent transition-colors">Followers</span>
                                </button>
                                <div className="w-px h-6 bg-gray-200 dark:bg-dark-border" />
                                <button 
                                    onClick={() => setConnectionModalType('following')}
                                    className="flex items-center gap-2 group"
                                >
                                    <span className="font-extrabold text-2xl text-text-rich dark:text-dark-text-rich group-hover:text-accent transition-colors">{author.followingCount || 0}</span>
                                    <span className="text-sm text-gray-500 group-hover:text-accent transition-colors">Following</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Stats Row ── */}
                    {authorBooks.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-10">
                            <StatPill icon={<BookOpenIcon className="w-5 h-5" />} value={authorBooks.length} label="Books" />
                            <StatPill icon={<DocumentPlusIcon className="w-5 h-5" />} value={bookStats.totalChapters} label="Chapters" />
                            <StatPill icon={<EyeIcon className="w-5 h-5" />} value={bookStats.totalViews.toLocaleString()} label="Total Views" />
                            <StatPill icon={<HeartIcon className="w-5 h-5" />} value={bookStats.totalLikes.toLocaleString()} label="Total Likes" />
                            <StatPill icon={<StarIcon className="w-5 h-5 fill-amber-400 text-amber-400" />} value={bookStats.avgRating > 0 ? bookStats.avgRating.toFixed(1) : '—'} label="Avg Rating" />
                            <StatPill icon={<ChatBubbleLeftIcon className="w-5 h-5" />} value={bookStats.totalReviews} label="Reviews" />
                        </div>
                    )}
                </div>

                {/* Bottom border with gradient */}
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-dark-border to-transparent" />
            </div>

            {/* ═══════════  Tab Navigation  ═══════════ */}
            <div className="sticky top-[72px] z-30 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-md border-b border-gray-100 dark:border-dark-border">
                <div className="container mx-auto px-6">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setActiveTab('published')}
                            className={`relative px-6 py-4 font-sans font-semibold text-sm transition-colors ${
                                activeTab === 'published'
                                    ? 'text-accent'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-text-rich dark:hover:text-dark-text-rich'
                            }`}
                        >
                            Published Works
                            {activeTab === 'published' && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
                            )}
                        </button>
                        {hasAboutContent && (
                            <button
                                onClick={() => setActiveTab('about')}
                                className={`relative px-6 py-4 font-sans font-semibold text-sm transition-colors ${
                                    activeTab === 'about'
                                        ? 'text-accent'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-text-rich dark:hover:text-dark-text-rich'
                                }`}
                            >
                                About
                                {activeTab === 'about' && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══════════  Content  ═══════════ */}
            <div className="container mx-auto px-6 py-10">
                {activeTab === 'published' && (
                    <>
                        {/* Genre tags for the author's works */}
                        {bookStats.genres.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-8">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider self-center mr-2">Writes in:</span>
                                {bookStats.genres.map(g => (
                                    <button
                                        key={g}
                                        onClick={() => window.location.hash = `/genre/${encodeURIComponent(g)}`}
                                        className="text-xs font-bold text-accent bg-accent/8 dark:bg-accent/15 px-3 py-1.5 rounded-lg hover:bg-accent/15 dark:hover:bg-accent/25 transition-colors cursor-pointer"
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        )}

                        {authorBooks.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10">
                                {authorBooks.map(book => (
                                    <BookCard key={book.id} book={book} onClick={() => window.location.hash = `/book/${book.id}`}/>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-dark-surface rounded-3xl border-2 border-dashed border-gray-200 dark:border-dark-border">
                                <QuillIcon className="w-12 h-12 text-gray-300 dark:text-dark-border mb-4" />
                                <p className="font-sans font-semibold text-text-body dark:text-dark-text-body text-lg mb-1">No published works yet</p>
                                <p className="text-sm text-gray-400 dark:text-gray-500">This author hasn't published any books yet. Check back later!</p>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'about' && (
                    <div className="max-w-3xl mx-auto space-y-8">
                        {/* Bio Section */}
                        {author.bio && (
                            <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 border border-gray-100 dark:border-dark-border shadow-sm">
                                <h3 className="font-sans text-lg font-bold text-text-rich dark:text-dark-text-rich mb-4 flex items-center gap-2">
                                    <QuillIcon className="w-5 h-5 text-accent" /> About {author.name}
                                </h3>
                                <p className="text-text-body dark:text-dark-text-body leading-relaxed text-lg whitespace-pre-line">
                                    {author.bio}
                                </p>
                            </div>
                        )}

                        {/* Favorite Genres */}
                        {hasFavoriteGenres && (
                            <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 border border-gray-100 dark:border-dark-border shadow-sm">
                                <h3 className="font-sans text-lg font-bold text-text-rich dark:text-dark-text-rich mb-4 flex items-center gap-2">
                                    <BookOpenIcon className="w-5 h-5 text-accent" /> Favorite Genres
                                </h3>
                                <div className="flex flex-wrap gap-2.5">
                                    {author.favoriteGenres!.map(g => (
                                        <span
                                            key={g}
                                            className="px-4 py-2 bg-accent/8 dark:bg-accent/15 text-accent font-sans font-semibold text-sm rounded-xl border border-accent/15 dark:border-accent/25"
                                        >
                                            {g}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Reading Stats (public) */}
                        {author.stats && (author.stats.booksRead > 0 || author.stats.totalWordsRead > 0) && (
                            <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 border border-gray-100 dark:border-dark-border shadow-sm">
                                <h3 className="font-sans text-lg font-bold text-text-rich dark:text-dark-text-rich mb-6 flex items-center gap-2">
                                    <TrophyIcon className="w-5 h-5 text-accent" /> Reading Activity
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center p-4 bg-background dark:bg-dark-background rounded-xl">
                                        <p className="font-sans font-extrabold text-2xl text-text-rich dark:text-dark-text-rich">{author.stats.readerLevel || 'Novice'}</p>
                                        <p className="text-xs text-gray-500 mt-1 font-medium">Reader Level</p>
                                    </div>
                                    <div className="text-center p-4 bg-background dark:bg-dark-background rounded-xl">
                                        <p className="font-sans font-extrabold text-2xl text-text-rich dark:text-dark-text-rich">{(author.stats.totalWordsRead || 0).toLocaleString()}</p>
                                        <p className="text-xs text-gray-500 mt-1 font-medium">Words Read</p>
                                    </div>
                                    <div className="text-center p-4 bg-background dark:bg-dark-background rounded-xl">
                                        <p className="font-sans font-extrabold text-2xl text-text-rich dark:text-dark-text-rich">{formatReadingTime(author.stats.readingTimeMinutes || 0)}</p>
                                        <p className="text-xs text-gray-500 mt-1 font-medium">Time Reading</p>
                                    </div>
                                    <div className="text-center p-4 bg-background dark:bg-dark-background rounded-xl">
                                        <p className="font-sans font-extrabold text-2xl text-text-rich dark:text-dark-text-rich">{author.stats.booksRead || 0}</p>
                                        <p className="text-xs text-gray-500 mt-1 font-medium">Books Read</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Details Card */}
                        {(joinDate || author.location || author.website) && (
                            <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 border border-gray-100 dark:border-dark-border shadow-sm">
                                <h3 className="font-sans text-lg font-bold text-text-rich dark:text-dark-text-rich mb-4 flex items-center gap-2">
                                    <UserGroupIcon className="w-5 h-5 text-accent" /> Details
                                </h3>
                                <div className="space-y-3">
                                    {joinDate && (
                                        <div className="flex items-center gap-3 text-text-body dark:text-dark-text-body">
                                            <CalendarIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                            <span>Member since <strong className="text-text-rich dark:text-dark-text-rich">{joinDate}</strong></span>
                                        </div>
                                    )}
                                    {author.location && (
                                        <div className="flex items-center gap-3 text-text-body dark:text-dark-text-body">
                                            <MapPinIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                            <span>{author.location}</span>
                                        </div>
                                    )}
                                    {author.website && (
                                        <div className="flex items-center gap-3 text-text-body dark:text-dark-text-body">
                                            <LinkIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                            <a
                                                href={author.website.startsWith('http') ? author.website : `https://${author.website}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-accent hover:underline hover:text-primary transition-colors"
                                            >
                                                {author.website.replace(/^https?:\/\//, '')}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <ConnectionsModal 
                isOpen={!!connectionModalType}
                onClose={() => setConnectionModalType(null)}
                title={connectionModalType === 'followers' ? 'Followers' : 'Following'}
                userId={author.id}
                type={connectionModalType || 'followers'}
            />
            
            <Footer />
        </div>
    );
};
