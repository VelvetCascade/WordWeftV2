import { readHistoryState, updateHistoryState } from '../utils/historyEntryState';
import { SupportIncidentReference } from '../components/SupportIncidentReference';
import { latestSupportIncident } from '../utils/supportIncident';
import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, Plus, X } from 'lucide-react';
import { Footer } from '../components/Footer';
import { ReturnNavigation } from '../components/ReturnNavigation';
import * as api from '../api/client';
import { useAnalytics } from '../contexts/AnalyticsContext';
import AdUnit from '../components/AdUnit';
import '../styles/support-v2.css';

const Options: React.FC<{ name: string; choices: Array<[string, string]>; value: string; onChange: (value: string) => void }> = ({ name, choices, value, onChange }) => <div className="wv-feedback-options">{choices.map(([id, label]) => <label key={id} className={value === id ? 'is-selected' : ''}><input type="radio" name={name} value={id} checked={value === id} onChange={() => onChange(id)} /><span>{label}</span></label>)}</div>;
const CheckOption: React.FC<{ label: string; checked: boolean; onChange: (value: boolean) => void }> = ({ label, checked, onChange }) => <label className={`wv-feedback-check ${checked ? 'is-selected' : ''}`}><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /><span>{label}</span></label>;
const Group: React.FC<{ number: number; title: string; subtitle?: string; children: React.ReactNode }> = ({ number, title, subtitle, children }) => <fieldset className="wv-feedback-group"><legend><span>{String(number).padStart(2, '0')}</span>{title}</legend>{subtitle && <p className="wv-hint">{subtitle}</p>}<div className="wv-feedback-group-fields">{children}</div></fieldset>;

const TagInput: React.FC<{ tags: string[]; onChange: (tags: string[]) => void }> = ({ tags, onChange }) => {
    const [input, setInput] = useState('');
    const add = () => { const value = input.trim(); if (value && !tags.includes(value)) { onChange([...tags, value]); setInput(''); } };
    return <div><div className="wv-feedback-tags">{tags.map(tag => <span key={tag}>{tag}<button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(tags.filter(item => item !== tag))}><X size={14} /></button></span>)}</div><label htmlFor="feedback-feature" className="wv-field">Feature idea</label><div className="wv-feedback-tag-input"><input id="feedback-feature" value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); add(); } }} placeholder="Type a feature and press Enter" /><button type="button" onClick={add} className="wv-button"><Plus size={16} /> Add</button></div></div>;
};

export const FeedbackPage: React.FC = () => {
    const { trackEvent } = useAnalytics();
    useEffect(() => { trackEvent('support', 'feedback_view'); }, []);
    const [initialDraft] = useState<Record<string, any>>(() => typeof window !== 'undefined' ? readHistoryState()?.wordWeftFeedback || {} : {});
    const textDraft = (field: string) => typeof initialDraft[field] === 'string' ? initialDraft[field] : '';
    const [userType, setUserType] = useState(() => textDraft('userType'));
    const [overallRating, setOverallRating] = useState(() => Number.isInteger(initialDraft.overallRating) ? Math.max(0, Math.min(5, initialDraft.overallRating)) : 0);
    const [triedFeatures, setTriedFeatures] = useState<Record<string, boolean>>(() => Object.fromEntries(Object.entries(initialDraft.triedFeatures || {}).filter(([, value]) => typeof value === 'boolean')) as Record<string, boolean>);
    const [otherFeature, setOtherFeature] = useState(() => textDraft('otherFeature'));
    const [whatFeltGood, setWhatFeltGood] = useState(() => textDraft('whatFeltGood'));
    const [whatWasFrustrating, setWhatWasFrustrating] = useState(() => textDraft('whatWasFrustrating'));
    const [missingFeatures, setMissingFeatures] = useState<string[]>(() => Array.isArray(initialDraft.missingFeatures) ? initialDraft.missingFeatures.filter((item: unknown) => typeof item === 'string') : []);
    const [performanceIssue, setPerformanceIssue] = useState(() => textDraft('performanceIssue'));
    const [performanceDetails, setPerformanceDetails] = useState(() => textDraft('performanceDetails'));
    const [usageFrequency, setUsageFrequency] = useState(() => textDraft('usageFrequency'));
    const [usageWhy, setUsageWhy] = useState(() => textDraft('usageWhy'));
    const [openThoughts, setOpenThoughts] = useState(() => textDraft('openThoughts'));
    const [contactPermission, setContactPermission] = useState(initialDraft.contactPermission === true);
    const [contactEmail, setContactEmail] = useState(() => textDraft('contactEmail'));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [incidentId] = useState(latestSupportIncident);
    const [includeIncident, setIncludeIncident] = useState(false);
    const [error, setError] = useState('');
    const features = ['Writing a story', 'Reading stories', 'Comments/discussions', 'Library/shelves', 'Searching for stories', 'Profile', 'Notifications'];
    const ratingLabels = ['Very confusing', 'Somewhat confusing', 'Neutral', 'Easy to use', 'Extremely smooth'];

    useEffect(() => {
        if (window.location.pathname !== '/feedback' || submitted) return;
        updateHistoryState({ wordWeftFeedback: { userType, overallRating, triedFeatures, otherFeature, whatFeltGood, whatWasFrustrating, missingFeatures, performanceIssue, performanceDetails, usageFrequency, usageWhy, openThoughts, contactPermission, contactEmail } });
    }, [userType, overallRating, triedFeatures, otherFeature, whatFeltGood, whatWasFrustrating, missingFeatures, performanceIssue, performanceDetails, usageFrequency, usageWhy, openThoughts, contactPermission, contactEmail, submitted]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault(); setError(''); setIsSubmitting(true);
        try {
            await api.submitFeedback({ userType, overallRating: overallRating || null, triedFeatures: Object.entries(triedFeatures).filter(([, selected]) => selected).map(([feature]) => feature), otherTriedFeature: otherFeature || null, whatFeltGood: whatFeltGood || null, whatWasFrustrating: whatWasFrustrating || null, missingFeatures, performanceIssue: performanceIssue || null, performanceDetails: `${performanceDetails}${includeIncident && incidentId ? `\nIncident reference: ${incidentId}` : ''}` || null, usageFrequency: usageFrequency || null, usageFrequencyWhy: usageWhy || null, openThoughts: openThoughts || null, contactPermission, contactEmail: contactPermission ? contactEmail : null });
            updateHistoryState({ wordWeftFeedback: undefined });
            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        } catch (failure) { setError(failure instanceof Error ? failure.message : 'Something went wrong. Please try again.'); }
        finally { setIsSubmitting(false); }
    };

    return <div className="wv-support">
        {submitted ? <main className="wv-support-shell wv-feedback-success"><ReturnNavigation /><div className="wv-notice wv-success" role="status"><Check size={30} /><h1>Thank you.</h1><p>Thanks for helping shape WordWeft. Your feedback helps us decide what to improve next.</p><a href="/" className="wv-button wv-button-primary">Back to WordWeft <ArrowRight size={18} /></a></div></main> : <main className="wv-support-shell">
            <ReturnNavigation />
            <header className="wv-pagehead"><p className="wv-eyebrow">Your experience matters</p><h1>Help shape WordWeft.</h1><p className="wv-lead">Tell us what worked, what felt difficult, and what you wish existed. Answer the questions that are useful to you.</p></header>
            <div className="wv-feedback-layout">
                <aside className="wv-feedback-aside"><h2>A better place for stories.</h2><p>You’re using an early version of WordWeft. Reader and writer feedback helps us choose what to build next.</p><p>Need help with an account or want to report content?</p><a href="/contact" className="wv-button">Help and contact <ArrowRight size={17} /></a><a href="/privacy" className="wv-feedback-privacy">Read our Privacy Policy</a></aside>
                <form className="wv-feedback-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
                    <Group number={1} title="What describes you best?"><Options name="userType" choices={[["writer", "Mainly a writer"], ["reader", "Mainly a reader"], ["both", "Both"]]} value={userType} onChange={setUserType} /></Group>
                    <Group number={2} title="Overall experience" subtitle="How would you rate your experience so far?"><div className="wv-feedback-rating" role="group" aria-label="Overall experience rating">{ratingLabels.map((label, index) => <button key={label} type="button" aria-pressed={overallRating === index + 1} aria-label={`${index + 1}: ${label}`} className={overallRating === index + 1 ? 'is-selected' : ''} onClick={() => setOverallRating(index + 1)}>{index + 1}</button>)}</div><div className="wv-feedback-rating-labels"><span>{ratingLabels[0]}</span><span>{overallRating ? ratingLabels[overallRating - 1] : ratingLabels[4]}</span></div></Group>
                    <Group number={3} title="What did you try?" subtitle="Select all that apply."><div className="wv-feedback-options">{features.map(feature => <CheckOption key={feature} label={feature} checked={!!triedFeatures[feature]} onChange={selected => setTriedFeatures(previous => ({ ...previous, [feature]: selected }))} />)}</div><label className="wv-field">Other feature <span className="wv-hint">Optional</span><input value={otherFeature} onChange={event => setOtherFeature(event.target.value)} placeholder="Anything else you tried" /></label></Group>
                    <Group number={4} title="What felt good?"><label className="wv-field">What you enjoyed<textarea value={whatFeltGood} onChange={event => setWhatFeltGood(event.target.value)} rows={4} placeholder="Anything you enjoyed, even small things." /></label></Group>
                    <Group number={5} title="What was frustrating?"><label className="wv-field">What could work better<textarea value={whatWasFrustrating} onChange={event => setWhatWasFrustrating(event.target.value)} rows={4} placeholder="Confusing steps, missing features, or bugs." /></label></Group>
                    <Group number={6} title="Missing features" subtitle="What do you wish existed? Add as many as you like."><TagInput tags={missingFeatures} onChange={setMissingFeatures} /></Group>
                    <Group number={7} title="Performance" subtitle="Did anything feel slow?"><Options name="performance" choices={[["no", "No"], ["sometimes", "Sometimes"], ["often", "Often"], ["very_often", "Very often"]]} value={performanceIssue} onChange={setPerformanceIssue} />{performanceIssue && performanceIssue !== 'no' && <label className="wv-field">Where did it happen? <span className="wv-hint">Optional</span><input value={performanceDetails} onChange={event => setPerformanceDetails(event.target.value)} placeholder="A page or action that felt slow" /></label>}</Group>
                    <Group number={8} title="Would you use this regularly?"><Options name="usage" choices={[["daily", "Yes, daily"], ["few_times_week", "Few times a week"], ["occasionally", "Occasionally"], ["probably_not", "Probably not yet"]]} value={usageFrequency} onChange={setUsageFrequency} /><label className="wv-field">Why? <span className="wv-hint">Optional</span><input value={usageWhy} onChange={event => setUsageWhy(event.target.value)} placeholder="What would bring you back?" /></label></Group>
                    <Group number={9} title="Open thoughts" subtitle="If WordWeft could improve one thing, what would it be?"><label className="wv-field">Your thoughts<textarea value={openThoughts} onChange={event => setOpenThoughts(event.target.value)} rows={4} placeholder="Write freely…" /></label></Group>
                    <Group number={10} title="Can we follow up?" subtitle="Only if you’re open to it."><CheckOption label="Allow us to contact you for clarification" checked={contactPermission} onChange={setContactPermission} />{contactPermission && <label className="wv-field">Email address<input type="email" autoComplete="email" value={contactEmail} onChange={event => setContactEmail(event.target.value)} placeholder="you@example.com" /></label>}</Group>
                    <SupportIncidentReference incidentId={incidentId} selected={includeIncident} onChange={setIncludeIncident} />
                    {error && <p className="wv-error" role="alert">{error}</p>}
                    <div className="wv-feedback-submit"><p className="wv-hint">Your responses are shared with the WordWeft team.</p><button type="submit" disabled={isSubmitting} className="wv-button wv-button-primary">{isSubmitting ? 'Submitting…' : 'Send feedback'} {!isSubmitting && <ArrowRight size={18} />}</button></div>
                </form>
            </div>
        </main>}
        <AdUnit format="horizontal" /><Footer />
    </div>;
};
