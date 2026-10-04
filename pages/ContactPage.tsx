import { SupportIncidentReference } from '../components/SupportIncidentReference';
import { latestSupportIncident } from '../utils/supportIncident';
import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, LockKeyhole, Mail, Plus, Search } from 'lucide-react';
import { Footer } from '../components/Footer';
import { ReturnNavigation } from '../components/ReturnNavigation';
import * as api from '../api/client';
import { useAnalytics } from '../contexts/AnalyticsContext';
import type { User } from '../types';
import AdUnit from '../components/AdUnit';
import '../styles/support-v2.css';

const helpTopics = [
    ['My reading progress is missing. What should I do?', 'Check that you are signed in to the same account. Reopen the story from your library and allow a moment for progress to sync. If you were offline, reconnect before retrying. Do not clear browser data while you have unsaved writing. Contact us with the story link and the chapter you expected to resume.'],
    ['The app showed an error or a page will not load.', 'Use Try again on the error screen. If it persists, copy its incident reference and tell us the page, browser and what you were doing. Reload only after preserving unsaved work. Never include a password, sign-in link or manuscript in a report.'],
    ['Why do I have to tap more than once?', 'Wait for the current action’s loading or saving state to finish before retrying. Check your connection and close any open menu or dialog. If taps still do not respond, tell us your device, browser and the control involved. Real-device touch issues are still being investigated.'],
    ['An image or manuscript upload failed.', 'Keep your original file. Check the file type and size shown by the upload control and your connection, then retry once the previous attempt finishes. An upload is complete only after its success state appears. Tell support the file type, size and error message; do not send private manuscript content.'],
    ['How do I save a story to my library?', 'Sign in, open a story and use its library control to save it. You can find your saved stories in Your library.'],
    ['Can I publish a story somewhere else too?', 'Yes. Publishing on WordWeft is non-exclusive and you keep ownership of your original work. Read the Terms of Service for the licence needed to host and display your work.'],
    ['How do paragraph comments work?', 'Open the comment control beside a passage to discuss that part of the chapter. Chapter discussions are also available after the story text. Keep comments respectful and mark spoilers.'],
    ['How do I mark a story as mature?', 'Choose the appropriate age rating and content warnings in your story details before publishing. Mature 18+ and Adult 21+ stories require an eligible writer account. See the Safety & Content Rules for the complete requirements.'],
    ['Can I unpublish a chapter?', 'Use your story’s chapter management controls to change its publication status. Keep your own copy of your manuscript and check the chapter’s status before sharing a link.'],
] as const;
const categories = [
    ['general', 'General support'], ['safety', 'Safety & abuse report'], ['copyright', 'Copyright / IP complaint'], ['privacy', 'Privacy request'], ['appeal', 'Appeal'], ['business', 'Business & partnerships'], ['legal', 'Legal request'], ['feedback', 'Feedback & suggestions'], ['other', 'Other'],
] as const;

export const ContactPage: React.FC<{ currentUser: User | null; onSignIn?: () => void }> = ({ currentUser, onSignIn }) => {
    const { trackEvent } = useAnalytics();
    useEffect(() => { trackEvent('support', 'contact_form_view'); }, []);
    const [initialDraft] = useState(() => {
        const saved = typeof window !== 'undefined' ? window.history.state?.wordWeftContact : undefined;
        return saved?.userId === (currentUser?.id || 'guest') ? saved : undefined;
    });
    const [query, setQuery] = useState(initialDraft?.query || '');
    const [formData, setFormData] = useState({ name: currentUser?.name || '', email: currentUser?.email || '', category: '', subject: '', message: '', ...initialDraft?.formData });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [incidentId] = useState(latestSupportIncident);
    const [includeIncident, setIncludeIncident] = useState(false);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        if (window.location.pathname !== '/contact' || submitted) return;
        window.history.replaceState({ ...window.history.state, wordWeftContact: { userId: currentUser?.id || 'guest', query, formData } }, '');
    }, [currentUser?.id, query, formData, submitted]);
    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData(previous => ({ ...previous, [event.target.name]: event.target.value }));
        setError(null);
    };
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault(); setIsSubmitting(true); setError(null);
        try {
            await api.submitGrievance({ ...formData, message: `${formData.message}${includeIncident && incidentId ? `\n\nIncident reference: ${incidentId}` : ''}` });
            const { wordWeftContact: discardedDraft, ...historyState } = window.history.state || {};
            window.history.replaceState(historyState, '');
            setSubmitted(true);
            setFormData({ name: currentUser?.name || '', email: currentUser?.email || '', category: '', subject: '', message: '' });
        } catch (failure) { setError(failure instanceof Error ? failure.message : 'Something went wrong. Please try again later.'); }
        finally { setIsSubmitting(false); }
    };
    const topics = helpTopics.filter(topic => topic.join(' ').toLowerCase().includes(query.trim().toLowerCase()));
    return (
        <div className="wv-support">
            <main className="wv-support-shell">
                <ReturnNavigation />
                <header className="wv-pagehead"><p className="wv-eyebrow">Help at WordWeft</p><h1>How can we help?</h1><p className="wv-lead">Find an answer, or send us a note with the details.</p></header>
                <label className="wv-help-search"><Search size={21} aria-hidden="true" /><span className="sr-only">Search help topics</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search help topics" /></label>
                <div className="wv-help-grid wv-section">
                    <section aria-labelledby="help-questions">
                        <h2 id="help-questions">Common questions</h2>
                        <div className="wv-faq-list">{topics.map(([question, answer]) => <details className="wv-faq" key={question}><summary>{question} <Plus size={18} aria-hidden="true" /></summary><p>{answer}</p></details>)}{!topics.length && <div className="wv-empty" role="status"><h3>No matching help topics</h3><p>Try another word, or send us a note.</p><button type="button" className="wv-button" onClick={() => setQuery('')}>Clear search</button></div>}</div>
                        <aside className="wv-help-email"><Mail size={19} aria-hidden="true" /><div><h3>Prefer email?</h3><a href="mailto:wordweftstudio@gmail.com">wordweftstudio@gmail.com</a><p>Include your username and a story or chapter link where relevant.</p></div></aside>
                        <nav className="wv-help-policies" aria-label="WordWeft policies"><a href="/terms">Terms of Service</a><a href="/privacy">Privacy Policy</a><a href="/safety">Safety & Content Rules</a></nav>
                    </section>
                    <section className="wv-contact-form" aria-labelledby="help-note">
                        <h2 id="help-note">Send us a note</h2>
                        {!currentUser ? <div className="wv-notice wv-signin-notice"><LockKeyhole size={28} aria-hidden="true" /><h3>Sign in to send a message</h3><p>The grievance submission form is available to signed-in users. You can also contact us directly by email.</p><a href="/auth" onClick={event => { if (onSignIn) { event.preventDefault(); onSignIn(); } }} className="wv-button wv-button-primary">Sign in or register <ArrowRight size={18} /></a></div> : submitted ? <div className="wv-notice wv-success" role="status"><Check size={28} aria-hidden="true" /><h3>Message sent</h3><p>Thank you for reaching out. We’ll respond to your inquiry as soon as possible.</p><button type="button" onClick={() => setSubmitted(false)} className="wv-button">Send another message</button></div> : <form onSubmit={handleSubmit} className="wv-form" aria-busy={isSubmitting}>
                            {error && <p className="wv-error" role="alert">{error}</p>}
                            <div className="wv-field-pair">
                                <label className="wv-field" htmlFor="contact-name">Full name <span aria-hidden="true">*</span><input id="contact-name" name="name" autoComplete="name" value={formData.name} onChange={handleChange} required placeholder="Your name" /></label>
                                <label className="wv-field" htmlFor="contact-email">Email <span aria-hidden="true">*</span><input id="contact-email" name="email" type="email" autoComplete="email" value={formData.email} onChange={handleChange} required readOnly={!!currentUser.email} /></label>
                            </div>
                            <label className="wv-field" htmlFor="contact-category">What is this about? <span aria-hidden="true">*</span><select id="contact-category" name="category" value={formData.category} onChange={handleChange} required><option value="" disabled>Choose a topic</option>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                            <label className="wv-field" htmlFor="contact-subject">Subject <span aria-hidden="true">*</span><input id="contact-subject" name="subject" value={formData.subject} onChange={handleChange} required placeholder="A short description" /></label>
                            <label className="wv-field" htmlFor="contact-message">Your message <span aria-hidden="true">*</span><textarea id="contact-message" name="message" value={formData.message} onChange={handleChange} required rows={6} placeholder="Tell us what happened. Include a story or chapter link if it helps." /></label>
                            <SupportIncidentReference incidentId={incidentId} selected={includeIncident} onChange={setIncludeIncident} /><button type="submit" disabled={isSubmitting} className="wv-button wv-button-primary">{isSubmitting ? 'Sending…' : 'Send message'} {!isSubmitting && <ArrowRight size={18} />}</button><p className="wv-hint">All fields are required. Your message is sent to the WordWeft support team.</p>
                        </form>}
                    </section>
                </div>
            </main>
            <AdUnit format="horizontal" /><Footer />
        </div>
    );
};
