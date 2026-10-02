import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, ChevronDown, Pause, PenLine, Play, Search, UserRound } from 'lucide-react';
import { Footer } from '../components/Footer';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { WritingDemoModal } from '../components/WritingDemoModal';
import '../styles/support-v2.css';

const atmospheres = [
    { id: 'romantic', name: 'Tender', title: 'The silence leaned closer.', excerpt: 'Rain silvered the window. When Mira reached for the cup, her hand found his instead—and neither of them moved away.' },
    { id: 'tense', name: 'Tense', title: 'The lock turned downstairs.', excerpt: 'One click. Then another. Elara held her breath as the hallway light narrowed beneath the door.' },
    { id: 'melancholy', name: 'Wistful', title: 'Summer had kept his handwriting.', excerpt: 'The paper smelled faintly of cedar. Outside, the last train crossed the valley without slowing for her town.' },
    { id: 'triumphant', name: 'Radiant', title: 'At dawn, the gates opened.', excerpt: 'A thousand banners lifted with the wind. For the first time, the road ahead belonged entirely to them.' },
    { id: 'eerie', name: 'Uncanny', title: 'The portrait blinked second.', excerpt: 'No floorboard creaked. No curtain stirred. Still, the room had quietly rearranged itself around her.' },
    { id: 'serene', name: 'Still', title: 'Morning arrived without hurry.', excerpt: 'Mist rested on the reeds while the river carried small circles of light toward the sea.' },
] as const;

const MoodDemo = () => {
    const [active, setActive] = useState(0);
    const [playing, setPlaying] = useState(false);
    const preset = atmospheres[active];
    useEffect(() => {
        if (!playing || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const timer = window.setInterval(() => setActive(value => (value + 1) % atmospheres.length), 5200);
        return () => window.clearInterval(timer);
    }, [playing]);
    return <div className="wv-feature-demo wv-atmosphere-demo" data-atmosphere={preset.id}>
        <div className="wv-demo-topline"><span>Reading demonstration</span><button type="button" className="wv-demo-control" aria-pressed={playing} onClick={() => setPlaying(value => !value)}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? 'Pause' : 'Play'}</button></div>
        <article className="wv-demo-prose"><h4>{preset.title}</h4><p>{preset.excerpt}</p></article>
        <p className="wv-demo-hint">Atmosphere: {preset.name}</p>
        <div className="wv-demo-choices" role="group" aria-label="Choose an atmosphere">{atmospheres.map((mood, index) => <button type="button" key={mood.id} aria-pressed={index === active} onClick={() => { setActive(index); setPlaying(false); }}>{mood.name}</button>)}</div>
    </div>;
};

const SpoilerDemo = () => {
    const [revealed, setRevealed] = useState(false);
    return <div className="wv-feature-demo"><div className="wv-demo-topline">Spoiler demonstration</div><article className="wv-demo-prose"><p>The hero walked to the edge of the cliff. <button type="button" className={`wv-spoiler ${revealed ? 'is-revealed' : ''}`} aria-label={revealed ? 'Hide spoiler' : 'Reveal spoiler'} aria-pressed={revealed} onClick={() => setRevealed(value => !value)}><span aria-hidden={!revealed}>He was the villain all along.</span>{!revealed && <span className="wv-spoiler-label">Reveal spoiler</span>}</button></p></article><button type="button" className="wv-demo-control" onClick={() => setRevealed(value => !value)}>{revealed ? 'Hide spoiler' : 'Reveal spoiler'}</button><p className="wv-demo-hint">Sensitive text stays hidden until a reader chooses to reveal it.</p></div>;
};

const ReaderDemo = () => {
    const [theme, setTheme] = useState('paper');
    return <div className="wv-feature-demo wv-reader-demo" data-theme={theme}><div className="wv-demo-topline">Reader demonstration</div><article className="wv-demo-prose"><p className="wv-demo-chapter">Chapter 7 · The revelation</p><h4>A morning in the library</h4><p>The morning sun cast golden rays across the library floor. Elara traced her fingers along the spines of ancient tomes, each one whispering secrets of a forgotten age.</p></article><div className="wv-demo-choices" role="group" aria-label="Reading theme">{['paper', 'sepia', 'night'].map(value => <button key={value} type="button" aria-pressed={theme === value} onClick={() => setTheme(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div></div>;
};

const CharacterDemo = () => {
    const [open, setOpen] = useState(false);
    return <div className="wv-feature-demo"><div className="wv-demo-topline">Character demonstration</div><article className="wv-demo-prose"><p>“You can’t be serious,” said <button type="button" className="wv-character-mention" aria-expanded={open} aria-controls="feature-character-card" onClick={() => setOpen(value => !value)}>Elara Nightshade</button>. The map trembled in her hands.</p></article>{open ? <div id="feature-character-card" className="wv-character-card"><UserRound size={27} aria-hidden="true" /><div><h4>Elara Nightshade</h4><span>Protagonist</span><p>A scholar turned warrior, searching for the truth behind her family’s history.</p></div></div> : <p className="wv-demo-hint">Select the character’s name to open the writer’s character note.</p>}</div>;
};

const WorldBuildingDemo = () => {
    const [tab, setTab] = useState<'characters' | 'scenes' | 'notes'>('characters');
    const content = {
        characters: [['Elara Nightshade', 'Protagonist · Scholar turned warrior'], ['Kael Ironfist', 'Antagonist · The exiled prince'], ['Mira Silverleaf', 'Ally · Elven healer and archivist']],
        scenes: [['The Crimson Library', 'Act I, Ch. 3 · Beneath the castle'], ['Battle of Windhollow', 'Act II, Ch. 7 · The army clashes at dawn']],
        notes: [['Magic system rules', 'Lore · Three tiers of elemental magic'], ['Timeline of Eldoria', 'Reference · Key historical dates']],
    };
    return <div className="wv-feature-demo"><div className="wv-demo-topline">Story guide demonstration</div><div className="wv-demo-choices" role="group" aria-label="Story guide section">{(['characters', 'scenes', 'notes'] as const).map(value => <button type="button" key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div><div className="wv-world-list">{content[tab].map(([title, detail]) => <div key={title}><h4>{title}</h4><p>{detail}</p></div>)}</div></div>;
};

const SearchDemo = () => {
    const [query, setQuery] = useState('midnight');
    const examples = [['Midnight Garden', 'Story · Luna Evergreen'], ['The Midnight Express', 'Story · Jack Thorne'], ['Midnight Quill', 'Writer']];
    const matches = query.trim() ? examples.filter(item => item[0].toLowerCase().includes(query.toLowerCase().trim())) : [];
    return <div className="wv-feature-demo"><div className="wv-demo-topline">Search demonstration · Fictional examples</div><label className="wv-demo-search"><Search size={18} /><span className="sr-only">Search demonstration stories and writers</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Try midnight" /></label><div className="wv-world-list" aria-live="polite">{matches.map(([title, detail]) => <div key={title}><h4>{title}</h4><p>{detail}</p></div>)}{!matches.length && <p className="wv-demo-hint">{query.trim() ? 'No demonstration results. Try “midnight”.' : 'Type a title or writer name.'}</p>}</div><a className="wv-demo-link" href="/search">Open WordWeft search <ArrowRight size={15} /></a></div>;
};

const Feature: React.FC<{ id: string; eyebrow: string; title: string; description: string; bullets: string[]; children: React.ReactNode }> = ({ id, eyebrow, title, description, bullets, children }) => <section id={id} className="wv-feature-section"><div><p className="wv-eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p><ul>{bullets.map(item => <li key={item}>{item}</li>)}</ul></div>{children}</section>;

export const FeaturesPage: React.FC = () => {
    const [demoOpen, setDemoOpen] = useState(false);
    const { trackEvent } = useAnalytics();
    useEffect(() => { trackEvent('content', 'features_view'); }, []);
    return <div className="wv-support wv-features">
        <WritingDemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} onStartWriting={() => { setDemoOpen(false); window.location.hash = '/auth'; }} />
        <main className="wv-support-shell">
            <header className="wv-feature-hero"><div className="wv-pagehead"><p className="wv-eyebrow">Read. Write. Return.</p><h1>Stories worth reading.<br />Tools for making yours.</h1><p className="wv-lead">Discover original fiction, follow writers, and draft your own work with chapters, characters and notes in one place.</p><div className="wv-actions"><button type="button" onClick={() => setDemoOpen(true)} className="wv-button wv-button-primary"><PenLine size={17} /> See the writing workspace</button><a href="/category" className="wv-button"><BookOpen size={17} /> Browse stories</a></div><p className="wv-feature-note">Free to begin. You keep ownership of your work.</p></div><img src="/design-v2/assets/met-436535.jpg" alt="Wheat Field with Cypresses, a painting by Vincent van Gogh" className="wv-feature-art" /></header>
            <nav className="wv-feature-nav" aria-label="Explore features">{[['reader', 'Reading'], ['worldbuilding', 'Writing'], ['characters', 'Characters'], ['spoiler', 'Spoilers'], ['mood', 'Atmosphere'], ['search', 'Search']].map(([id, label]) => <a href={`#${id}`} key={id}>{label}<ChevronDown size={14} /></a>)}</nav>
            <Feature id="reader" eyebrow="A place to read" title="Settle into the story." description="Choose a reading theme and type size, save your place, and join the conversation around a chapter or passage." bullets={['Paper, Sepia and Night reading themes', 'Adjustable type size and saved reading progress', 'Paragraph discussions, chapter likes and bookmarks']}><ReaderDemo /></Feature>
            <Feature id="worldbuilding" eyebrow="A place to write" title="Keep your whole world close." description="Write with your story details beside the manuscript. Organise chapters, characters, scenes and private notes, then publish when you are ready." bullets={['A chapter editor and story workspace', 'Characters, scenes and notes within reach', 'Book settings for your story’s details']}><WorldBuildingDemo /></Feature>
            <Feature id="characters" eyebrow="Character context" title="Remember the people in a story." description="Writers can mention characters in their chapters. Readers can open a character note for a biography, role or portrait." bullets={['Mention characters while writing', 'Reader access to character profiles', 'Writer-provided biographies and portraits']}><CharacterDemo /></Feature>
            <Feature id="spoiler" eyebrow="Reader choice" title="Keep a plot twist hidden." description="Mark sensitive text as a spoiler so readers can choose when to reveal it. Useful for discussions, reviews and a story’s own surprises." bullets={['A spoiler control in the editor', 'A clear reveal action for readers', 'Hidden content can be covered again']}><SpoilerDemo /></Feature>
            <Feature id="mood" eyebrow="Atmosphere" title="Give a passage its own feeling." description="Writers can tag passages with an atmosphere. Readers can explore the page’s mood while the words remain the focus." bullets={['Six atmosphere choices', 'Writers choose where an atmosphere begins', 'Reduced motion preferences are respected']}><MoodDemo /></Feature>
            <Feature id="search" eyebrow="Discovery" title="Find a story or its writer." description="Search by title or author, browse by genre, and use your library to keep the stories you want to return to." bullets={['Story and author search suggestions', 'Keyboard navigation and Ctrl+K search', 'Genres and a personal story library']}><SearchDemo /></Feature>
            <section className="wv-feature-end"><p className="wv-eyebrow">Start with a story</p><h2>Your next chapter is waiting.</h2><p>Find something to read, or begin a draft of your own.</p><div className="wv-actions"><a className="wv-button wv-button-primary" href="/write">Start writing <ArrowRight size={18} /></a><a className="wv-button" href="/category">Browse stories <ArrowRight size={18} /></a></div></section>
        </main><Footer />
    </div>;
};
