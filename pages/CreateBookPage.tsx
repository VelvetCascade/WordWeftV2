
import React, { useState, useEffect } from 'react';
import type { User, AgeRating, ContentWarning } from '../types';
import { ArrowLeftIcon } from '../components/icons/Icons';
import * as api from '../api/client';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { ImageUpload } from '../components/ImageUpload';

interface CreateBookPageProps {
    currentUser: User;
    onUserUpdate: (user: User) => void;
}

export const CreateBookPage: React.FC<CreateBookPageProps> = ({ currentUser, onUserUpdate }) => {
    const { trackEvent } = useAnalytics();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [category, setCategory] = useState('');
    const [ageRating, setAgeRating] = useState<AgeRating>('TEEN_13');
    const [contentWarnings, setContentWarnings] = useState<ContentWarning[]>([]);
    const [customDisclaimer, setCustomDisclaimer] = useState('');
    const [isAIGenerated, setIsAIGenerated] = useState(false);
    const [coverUrl, setCoverUrl] = useState('');
    const [coverFileId, setCoverFileId] = useState<string | null>(null);
    const [allGenres, setAllGenres] = useState<string[]>([]);
    const [isLoadingGenres, setIsLoadingGenres] = useState(true);
    const [genreSearch, setGenreSearch] = useState('');
    const [customCategory, setCustomCategory] = useState('');

    const BOOK_CATEGORIES = [
        'Novel', 'Novella', 'Short Story', 'Poetry', 'Essay',
        'Anthology', 'Memoir', 'Biography', 'Self-Help', 'Graphic Novel',
        'Light Novel', 'Web Novel', 'Fan Fiction', 'Screenplay', 'Play',
        'Journal', 'Guide', 'Other'
    ];
    const WARNING_OPTIONS: { value: ContentWarning; label: string }[] = [
        { value: 'VIOLENCE', label: 'Violence' }, { value: 'GORE', label: 'Gore' },
        { value: 'STRONG_LANGUAGE', label: 'Strong language' }, { value: 'SEXUAL_CONTENT', label: 'Sexual content' },
        { value: 'ABUSE', label: 'Abuse' }, { value: 'SELF_HARM', label: 'Self-harm' },
        { value: 'SUBSTANCE_USE', label: 'Substance use' }, { value: 'GRIEF', label: 'Grief' },
        { value: 'DISCRIMINATION', label: 'Discrimination' }, { value: 'OTHER', label: 'Other' },
    ];

    useEffect(() => {
        api.getGenres().then(fetchedGenres => {
            setAllGenres(fetchedGenres);
            setIsLoadingGenres(false);
        });
    }, []);

    const toggleGenre = (genre: string) => {
        setSelectedGenres(prev =>
            prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const finalCategory = category === 'Other' ? customCategory : category;

        const newBookData = {
            title,
            description,
            summary: description.substring(0, 150) + '...',
            coverUrl: coverUrl || 'https://picsum.photos/seed/newbook/400/600',
            coverFileId,
            genres: selectedGenres,
            category: finalCategory,
            tags: selectedGenres,
            ageRating,
            contentWarnings,
            customDisclaimer,
            isAIGenerated,
        };

        const updatedUser = await api.createBook(currentUser.id, newBookData);
        onUserUpdate(updatedUser);

        const newBookId = updatedUser.writtenBooks?.find(b => b.title === title)?.id;
        if (newBookId) {
            window.location.hash = `/write/book/${newBookId}/manage`;
        } else {
            window.location.hash = '/write';
        }
    };

    const filteredGenres = allGenres.filter(g => g.toLowerCase().includes(genreSearch.toLowerCase()));

    return (
        <div className="ww-create-book-page">
            <div className="ww-create-book-shell">
                <header className="ww-create-book-heading">
                    <button onClick={() => window.location.hash = '/write'} className="ww-create-back" aria-label="Back to my books">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <span className="ww-create-eyebrow">New story</span>
                        <h1>Begin a new world.</h1>
                        <p>Give the project a clear identity now. You can refine every detail as the story grows.</p>
                    </div>
                </header>

                <form onSubmit={handleSubmit} className="ww-create-form">
                    <div className="ww-create-main">
                        <section className="ww-create-section">
                            <div className="ww-create-section-heading">
                                <span>01</span>
                                <div><h2>Story essentials</h2><p>The title and promise readers see first.</p></div>
                            </div>
                            <div className="ww-create-field">
                                <label htmlFor="title">Book title</label>
                                <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="The Last Sky-Sailor" autoFocus />
                            </div>
                            <div className="ww-create-field">
                                <div className="ww-create-label-row"><label htmlFor="description">Story description</label><span>{description.length} characters</span></div>
                                <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} required rows={6} placeholder="What makes this story impossible to put down?" />
                            </div>
                        </section>

                        <section className="ww-create-section">
                            <div className="ww-create-section-heading">
                                <span>02</span>
                                <div><h2>Place it on the shelf</h2><p>Help the right readers discover it.</p></div>
                            </div>
                            <div className="ww-create-field">
                                <label htmlFor="category">Format</label>
                                <select id="category" value={category} onChange={e => setCategory(e.target.value)}>
                                    <option value="">Select a format</option>
                                    {BOOK_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            {category === 'Other' && (
                                <div className="ww-create-field">
                                    <label htmlFor="customCategory">Custom format</label>
                                    <input type="text" id="customCategory" value={customCategory} onChange={e => setCustomCategory(e.target.value)} required placeholder="e.g., LitRPG" />
                                </div>
                            )}
                            <div className="ww-create-field">
                                <div className="ww-create-label-row"><label htmlFor="genre-search">Genres</label><span>{selectedGenres.length} selected</span></div>
                                <input id="genre-search" type="search" placeholder="Search genres" value={genreSearch} onChange={e => setGenreSearch(e.target.value)} />
                                <div className="ww-create-genres">
                                    {isLoadingGenres ? <p>Loading genres…</p> : filteredGenres.map(g => (
                                        <button key={g} type="button" onClick={() => toggleGenre(g)} className={selectedGenres.includes(g) ? 'selected' : ''}>
                                            {selectedGenres.includes(g) && <span>✓</span>}{g}
                                        </button>
                                    ))}
                                    {!isLoadingGenres && filteredGenres.length === 0 && <p>No genres match your search.</p>}
                                </div>
                            </div>
                        </section>

                        <section className="ww-create-section">
                            <div className="ww-create-section-heading">
                                <span>03</span>
                                <div><h2>Reader guidance</h2><p>Set an honest rating and flag sensitive material.</p></div>
                            </div>
                            <div className="ww-create-field">
                                <label htmlFor="ageRating">Age rating</label>
                                <select id="ageRating" value={ageRating} onChange={e => setAgeRating(e.target.value as AgeRating)}>
                                    <option value="ALL_AGES">Everyone — suitable for all ages</option>
                                    <option value="TEEN_13">Teen 13+ — moderate themes</option>
                                    <option value="MATURE_18">Mature 18+ — explicit adult themes</option>
                                    <option value="ADULT_21">Adult 21+ — highly explicit material</option>
                                </select>
                                <small>Choose based on the strongest material anywhere in the story. Mature stories are hidden unless an eligible reader opts in.</small>
                            </div>
                            <div className="ww-create-field">
                                <label>Content warnings</label>
                                <div className="ww-create-genres">
                                    {WARNING_OPTIONS.map(item => <button key={item.value} type="button" className={contentWarnings.includes(item.value) ? 'selected' : ''} onClick={() => setContentWarnings(prev => prev.includes(item.value) ? prev.filter(w => w !== item.value) : [...prev, item.value])}>{contentWarnings.includes(item.value) && <span>✓</span>}{item.label}</button>)}
                                </div>
                            </div>
                            <div className="ww-create-field">
                                <label htmlFor="customDisclaimer">Author’s content note <span className="text-gray-400">(optional)</span></label>
                                <textarea id="customDisclaimer" rows={3} maxLength={1000} value={customDisclaimer} onChange={e => setCustomDisclaimer(e.target.value)} placeholder="Add context without spoiling the story." />
                            </div>
                        </section>
                    </div>

                    <aside className="ww-create-aside">
                        <section className="ww-create-cover">
                            <div className="ww-create-section-heading compact">
                                <span>04</span>
                                <div><h2>Cover</h2><p>Set the first impression.</p></div>
                            </div>
                            <ImageUpload
                                value={coverUrl}
                                onChange={(url, fileId) => { setCoverUrl(url); setCoverFileId(fileId); }}
                                label=""
                                fallbackUrl="https://picsum.photos/seed/newbook/400/600"
                                aspectRatio={2/3}
                                cropShape="rect"
                            />
                        </section>

                        <label htmlFor="isAIGenerated" className="ww-create-disclosure">
                            <input type="checkbox" id="isAIGenerated" checked={isAIGenerated} onChange={e => setIsAIGenerated(e.target.checked)} />
                            <span className="ww-create-check" />
                            <span><strong>AI-assisted content</strong><small>Disclose if generation tools shaped the text or structure.</small></span>
                        </label>

                        <div className="ww-create-preview-note">
                            <span>Next step</span>
                            <p>We’ll open your story studio so you can create the first chapter.</p>
                        </div>
                    </aside>

                    <footer className="ww-create-actions">
                        <button type="button" onClick={() => window.location.hash = '/write'}>Save for later</button>
                        <button type="submit" disabled={!title || !description}>Create story <span>→</span></button>
                    </footer>
                </form>
            </div>
        </div>
    );
};
