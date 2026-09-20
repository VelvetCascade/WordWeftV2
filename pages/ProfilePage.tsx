import React, { useEffect, useState } from 'react';
import type { Book, User } from '../types';
import { BookCard } from '../components/BookCard';
import { Footer } from '../components/Footer';
import {
    BookOpenIcon,
    ClockIcon,
    Cog6ToothIcon,
    DocumentPlusIcon,
    InstagramIcon,
    PlusIcon,
    ShareIcon,
    ThreadsIcon,
    TrophyIcon,
    TwitterIcon,
    UserGroupIcon,
} from '../components/icons/Icons';
import { AuthorShareModal } from '../components/AuthorShareModal';
import { ConnectionsModal } from '../components/ConnectionsModal';
import { ResilientImage } from '../components/ResilientImage';
import * as api from '../api/client';

const StatCard: React.FC<{
    icon: React.ReactNode;
    value: string | number;
    label: string;
    subLabel?: string;
    onClick?: () => void;
}> = ({ icon, value, label, subLabel, onClick }) => {
    const content = (
        <>
            <div>
                <div className="mb-3 text-accent">{icon}</div>
                <p className="font-sans text-3xl font-bold tracking-tight text-text-rich dark:text-dark-text-rich">{value}</p>
            </div>
            <div>
                <p className="text-sm font-medium text-text-body dark:text-dark-text-body">{label}</p>
                {subLabel && <p className="mt-1 text-xs text-gray-400">{subLabel}</p>}
            </div>
        </>
    );
    const className = `ww-profile-stat-card h-full w-full rounded-2xl bg-background p-6 text-left dark:bg-dark-surface-alt ${onClick ? 'cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-dark-surface' : ''}`;
    return onClick
        ? <button type="button" className={className} onClick={onClick}>{content}</button>
        : <div className={className}>{content}</div>;
};

const formatReadingTime = (minutes: number) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

export const ProfilePage: React.FC<{ user: User }> = ({ user }) => {
    const [writtenBooks, setWrittenBooks] = useState<Book[]>([]);
    const [connectionModalType, setConnectionModalType] = useState<'followers' | 'following' | null>(null);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [profileLoadError, setProfileLoadError] = useState('');
    const [loadAttempt, setLoadAttempt] = useState(0);

    useEffect(() => {
        let active = true;
        setProfileLoadError('');
        api.getBooksByAuthor(user.id)
            .then(books => {
                if (active) setWrittenBooks(books);
            })
            .catch(() => {
                if (active) setProfileLoadError('Your published stories could not be loaded.');
            });
        return () => { active = false; };
    }, [user.id, loadAttempt]);

    return (
        <div className="ww-profile-page">
            <header className="ww-profile-hero relative overflow-hidden border-b border-gray-200/80 bg-white dark:border-dark-border dark:bg-dark-surface">
                <div className="ww-profile-banner-orb" aria-hidden="true" />
                <div className="ww-profile-hero-inner container relative z-10 mx-auto px-6 py-12">
                    <span className="ww-page-eyebrow">Your public portfolio</span>
                    <div className="ww-profile-identity mt-5 flex flex-col items-start gap-8 md:flex-row">
                        <div className="ww-profile-avatar relative shrink-0">
                            <ResilientImage src={user.avatarUrl} alt={user.name} fallbackLabel={user.name} className="h-32 w-32 rounded-3xl border-4 border-white object-cover shadow-lifted dark:border-dark-surface" />
                            <div className="absolute -bottom-3 -right-3 rounded-xl bg-white p-1.5 shadow-md dark:bg-dark-surface">
                                <span className="block rounded-lg bg-gradient-to-r from-amber-200 to-yellow-400 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-yellow-900">{user.stats?.readerLevel || 'Novice'}</span>
                            </div>
                        </div>

                        <div className="ww-profile-info w-full flex-1">
                            <div className="flex flex-col gap-5 md:flex-row md:justify-between">
                                <div className="min-w-0">
                                    <h1 className="mb-2 break-words font-sans text-4xl font-extrabold text-text-rich dark:text-dark-text-rich">{user.name}</h1>
                                    <p className="max-w-2xl break-words text-lg leading-relaxed text-text-body dark:text-dark-text-body">{user.bio || 'Tell readers what you write and what keeps you turning pages.'}</p>
                                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                                        <p>Joined {new Date(user.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
                                        {user.location && <p>Based in {user.location}</p>}
                                        {user.website && <a href={user.website.startsWith('http') ? user.website : `https://${user.website}`} target="_blank" rel="noopener noreferrer" className="break-all text-accent transition-colors hover:text-primary hover:underline">{user.website.replace(/^https?:\/\//, '')}</a>}
                                    </div>
                                    <div className="mt-6 flex flex-wrap items-center gap-3">
                                        {user.socials?.twitter && <a href={user.socials.twitter} target="_blank" rel="noreferrer" aria-label="Open Twitter profile" className="ww-profile-social"><TwitterIcon className="h-5 w-5" /></a>}
                                        {user.socials?.instagram && <a href={user.socials.instagram} target="_blank" rel="noreferrer" aria-label="Open Instagram profile" className="ww-profile-social"><InstagramIcon className="h-5 w-5" /></a>}
                                        {user.socials?.threads && <a href={user.socials.threads} target="_blank" rel="noreferrer" aria-label="Open Threads profile" className="ww-profile-social"><ThreadsIcon className="h-5 w-5" /></a>}
                                        {!!user.favoriteGenres?.length && <div className="ww-profile-genres flex flex-wrap gap-2 border-l border-gray-200 pl-4 dark:border-dark-border">{user.favoriteGenres.map(genre => <button type="button" key={genre} onClick={() => { window.location.hash = `/genre/${encodeURIComponent(genre)}`; }} className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-500 hover:text-accent dark:bg-dark-surface-alt dark:text-gray-400">{genre}</button>)}</div>}
                                    </div>
                                </div>

                                <div className="ww-profile-actions flex shrink-0 gap-2 self-start">
                                    <button type="button" onClick={() => { window.location.hash = '/edit-profile'; }} className="flex items-center gap-2 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold transition-colors hover:bg-gray-200 dark:bg-dark-surface-alt dark:hover:bg-dark-border"><Cog6ToothIcon className="h-4 w-4" /> Edit profile</button>
                                    <button type="button" onClick={() => setIsShareOpen(true)} className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-primary"><ShareIcon className="h-4 w-4" /> Share portfolio</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="ww-profile-stats mt-12 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
                        <StatCard icon={<TrophyIcon className="h-6 w-6" />} value={user.stats?.readerLevel || 'Novice'} label="Reader rank" subLabel="Based on words read" />
                        <StatCard icon={<ClockIcon className="h-6 w-6" />} value={formatReadingTime(user.stats?.readingTimeMinutes || 0)} label="Time reading" />
                        <StatCard icon={<DocumentPlusIcon className="h-6 w-6" />} value={(user.stats?.totalWordsRead || 0).toLocaleString()} label="Words read" />
                        <StatCard icon={<UserGroupIcon className="h-6 w-6" />} value={user.followersCount || 0} label="Followers" onClick={() => setConnectionModalType('followers')} />
                        <StatCard icon={<UserGroupIcon className="h-6 w-6" />} value={user.followingCount || 0} label="Following" onClick={() => setConnectionModalType('following')} />
                    </div>
                </div>
            </header>

            {profileLoadError && <div role="alert" className="container mx-auto mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/5 px-5 py-3 text-sm text-danger"><span>{profileLoadError}</span><button type="button" className="font-bold underline" onClick={() => setLoadAttempt(attempt => attempt + 1)}>Retry</button></div>}

            <main className="container mx-auto px-4 py-10 sm:px-6">
                <section aria-labelledby="portfolio-heading">
                    <div className="ww-profile-section-head">
                        <div><span>Written by you</span><h2 id="portfolio-heading">Your published work</h2><p>This is the work readers see when they visit your portfolio.</p></div>
                        <button type="button" onClick={() => { window.location.hash = '/write/book/create'; }}><PlusIcon className="h-4 w-4" /> New story</button>
                    </div>
                    {writtenBooks.length > 0 ? <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{writtenBooks.map(book => <BookCard key={book.id} book={book} onClick={() => { window.location.hash = `/book/${book.id}`; }} />)}</div> : <div className="ww-profile-empty"><BookOpenIcon className="h-11 w-11" /><h3>Your portfolio is ready for its first story.</h3><p>Publish a story and it will appear here automatically.</p><button type="button" onClick={() => { window.location.hash = '/write'; }}>Open writer studio</button></div>}
                </section>
            </main>

            <ConnectionsModal isOpen={!!connectionModalType} onClose={() => setConnectionModalType(null)} title={connectionModalType === 'followers' ? 'Followers' : 'Following'} userId={user.id} type={connectionModalType || 'followers'} />
            <AuthorShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} author={user} authorBooks={writtenBooks} />
            <Footer />
        </div>
    );
};
