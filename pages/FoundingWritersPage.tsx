import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Upload } from 'lucide-react';
import { Footer } from '../components/Footer';
import { submitFoundingWriterApplication } from '../api/client';
import { analytics } from '../utils/analyticsService';
import type { User, FoundingWriterApplicationSubmission, FoundingWriterCompletionPeriod } from '../types';
import '../styles/founding-writers.css';
import '../styles/support-v2.css';
import { useRecoverableForm } from '../hooks/useRecoverableForm';
import { isCompatibleForm } from '../utils/formDrafts';
import { FormDraftNotice } from '../components/FormDraftNotice';
import '../styles/quality.css';

const benefits = [
  'A permanent Founding Writer badge on your profile',
  'Personal help setting up your profile and first story',
  'A dedicated Founding Writer spotlight and early-launch placement',
  'Early access to new writer features',
  'A direct channel for feedback on the tools we build for writers',
];

const eligibility = [
  'You are at least 18 years old.',
  'The story is your original work and is not plagiarized or AI-generated.',
  'Any proposed book cover is original or properly licensed and is not AI-generated.',
  'You can submit at least the first three chapters in one PDF, DOCX or TXT file under 5 MB.',
  'The story and cover comply with WordWeft’s Terms and Safety & Content Rules, including age ratings and content warnings.',
  'You genuinely intend to complete the story and provide honest feedback about publishing on WordWeft.',
];

const genres = [
  'Fantasy', 'Romance', 'Mystery', 'Thriller', 'Science Fiction', 'Horror',
  'Historical Fiction', 'Contemporary Fiction', 'Adventure', 'Young Adult',
  'Literary Fiction', 'Comedy', 'Drama', 'Fan Fiction', 'Other',
];

const completionPeriods: Array<{ value: FoundingWriterCompletionPeriod; label: string }> = [
  { value: 'LESS_THAN_2_MONTHS', label: 'Less than 2 months' },
  { value: 'TWO_TO_FOUR_MONTHS', label: '2–4 months' },
  { value: 'FOUR_TO_SIX_MONTHS', label: '4–6 months' },
  { value: 'MORE_THAN_6_MONTHS', label: 'More than 6 months' },
];

const confirmations = [
  ['ageConfirmed', 'I confirm that I am at least 18 years old.'],
  ['rightsConfirmed', 'I confirm that the submitted story is my original, non-AI-generated work and that I have the right to publish it.'],
  ['completionCommitted', 'I genuinely intend to complete this story.'],
  ['weeklyPublishingCommitted', 'If accepted, I can normally publish at least one chapter per week for the first four weeks and will communicate if I need flexibility.'],
  ['earningsDisclaimerConfirmed', 'I understand that paid publishing is not live and WordWeft does not guarantee readers or earnings.'],
] as const;

type FormState = Omit<FoundingWriterApplicationSubmission, 'draftedChapterCount' | 'plannedChapterCount' | 'expectedCompletionPeriod'> & {
  draftedChapterCount: string;
  plannedChapterCount: string;
  expectedCompletionPeriod: FoundingWriterCompletionPeriod | '';
};

const initialForm: FormState = {
  fullName: '', penName: '', email: '', country: '', instagramProfileUrl: '', genre: '',
  storyTitle: '', storyDescription: '', writingSampleUrl: '', pastedWritingSample: '',
  existingPublishingPlatform: '', draftedChapterCount: '', plannedChapterCount: '',
  expectedCompletionPeriod: '', ageConfirmed: false, rightsConfirmed: false,
  completionCommitted: false, weeklyPublishingCommitted: false,
  earningsDisclaimerConfirmed: false, termsConfirmed: false, organizationName: '', website_ref_hp: '', chaptersConfirmed: false,
};

export const FoundingWritersPage: React.FC<{ currentUser?: User | null }> = ({ currentUser }) => {
  const formSection = useRef<HTMLElement>(null);
  const defaults = { ...initialForm, fullName: currentUser?.name || '', email: currentUser?.email || '' };
  const recovery = useRecoverableForm(currentUser?.id || 'guest', 'founding-writer-application', defaults,
    (value): value is FormState => isCompatibleForm(initialForm, value));
  const form = recovery.value;
  const setForm = recovery.setValue;
  const [reviewing, setReviewing] = useState(false);
  const reviewSection = useRef<HTMLDivElement>(null);
  const [chapterFile, setChapterFile] = useState<File | null>(null);
  const completedSections = [
    !!(form.fullName && form.email && form.country),
    !!(form.genre && form.storyTitle && form.storyDescription),
    !!(chapterFile && form.chaptersConfirmed && Number(form.draftedChapterCount) >= 3 && Number(form.plannedChapterCount) >= 3 && form.expectedCompletionPeriod),
    confirmations.every(([field]) => form[field]) && form.termsConfirmed,
  ];
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [uploadPercent, setUploadPercent] = useState(0);

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm(previous => ({ ...previous, [field]: value }));
    setReviewing(false);
    if (error) setError('');
  };

  const scrollToForm = () => formSection.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });

  useEffect(() => {
    analytics.trackEvent('founding_writers', 'page_view', 'Founding Writers Application Page');
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chapterFile || chapterFile.size === 0 || chapterFile.size > 5 * 1024 * 1024 || !/\.(pdf|docx|txt)$/i.test(chapterFile.name)) {
      setError('Upload a non-empty PDF, DOCX or TXT file, up to 5 MB, containing at least three chapters.');
      document.getElementById('fw-chapter-file')?.focus();
      return;
    }

    if (Number(form.plannedChapterCount) < Number(form.draftedChapterCount)) {
      setError('Estimated total chapters must include the chapters you have already drafted.');
      return;
    }
    if (!reviewing) {
      setReviewing(true);
      requestAnimationFrame(() => { reviewSection.current?.scrollIntoView({ block: 'center', behavior: 'auto' }); reviewSection.current?.focus(); });
      return;
    }
    setSubmitting(true);
    setUploadPercent(0);
    setError('');

    analytics.trackEvent('founding_writers', 'submit_attempt', 'Application');

    try {
      await submitFoundingWriterApplication({
        ...form,
        expectedCompletionPeriod: form.expectedCompletionPeriod as FoundingWriterCompletionPeriod,
        draftedChapterCount: Number(form.draftedChapterCount),
        plannedChapterCount: Number(form.plannedChapterCount),
      }, chapterFile, setUploadPercent);
      analytics.trackEvent('founding_writers', 'submit_success', 'Application');
      recovery.clear();
      setSubmitted(true);
      requestAnimationFrame(scrollToForm);
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'We couldn\'t submit your application right now. Please try again shortly.';
      setError(message);
      analytics.trackEvent('founding_writers', 'submit_error', 'Application submission failed');
    } finally {
      setSubmitting(false);
      setUploadPercent(0);
    }
  };

  return (
    <div className="fw-page wv-support">
      <main className="fw-main">
        <header className="fw-page-header">
          <div className="fw-content-shell">
            <p className="fw-eyebrow">Founding writers · Applications are open</p>
            <h1>Help shape a new<br />home for stories.</h1>
            <p className="fw-page-intro">We are inviting original storytellers to help build WordWeft with us.</p>
            <div className="fw-intro-point"><h2>Your story stays yours.</h2><p>Publishing is non-exclusive. You keep ownership of your work and can publish elsewhere.</p></div>
            <div className="fw-intro-point"><h2>Start with three chapters.</h2><p>Send us a sample, tell us what you are writing, and share honest feedback as the platform grows.</p></div>
            <p className="fw-intro-note">Stories are free to read at this stage. Paid publishing has not launched and readers or earnings are not guaranteed.</p>
            <img className="fw-founder-art" src="/design-v2/assets/met-45294.jpg" alt="A Japanese woodblock print of boats beneath a bridge at sunset" />
            <button className="fw-secondary-button fw-mobile-apply" type="button" onClick={scrollToForm}>Go to application <ArrowRight size={17} /></button>
          </div>
        </header>

        <section className="fw-program-section" aria-labelledby="founding-program-details">
          <div className="fw-content-shell">
            <details className="fw-program-details">
            <summary id="founding-program-details">Read before applying <ChevronDown size={18} /></summary>

            <section className="fw-program-block">
              <h3>What WordWeft is building</h3>
              <p>Writers can publish stories chapter by chapter, receive reader feedback and build an audience over time. WordWeft is currently focused on growing its writer and reader community. All stories are free to read, and paid publishing has not launched.</p>
            </section>

            <section className="fw-program-block">
              <h3>What you need to apply</h3>
              <ul>{eligibility.map(item => <li key={item}>{item}</li>)}</ul>
              <p>The application asks for your basic information, story title, genre, description, current draft progress and expected completion period. We will notify you by email after review.</p>
            </section>

            <section className="fw-program-block">
              <h3>Publishing schedule</h3>
              <p>Accepted Founding Writers are expected to publish at least one new chapter per week for the first four weeks. We recommend having several chapters drafted before publishing begins.</p>
              <p>After those first four weeks, missing two consecutive weekly releases may lead to a notice from our team. If the gap continues for four consecutive weeks, the writer may be removed from the Founding Writers Programme. Removal from the programme does not remove the writer’s account or story; they may continue publishing as a regular WordWeft writer and keep the benefits available to regular writers.</p>
              <p>Emergencies and genuine delays happen. Contact us in advance whenever possible. We can discuss reasonable flexibility case by case.</p>
            </section>

            <section className="fw-program-block">
              <h3>Ownership, manuscript review and exclusivity</h3>
              <p>You keep ownership of your original work. Applying does not transfer ownership to WordWeft, and publishing is non-exclusive—you may publish the same story elsewhere.</p>
              <p>The first three chapters are collected only to review your application and are available only to authorised WordWeft administrators. If the upload does not work, email the file to <a href="mailto:wordweftstudio@gmail.com">wordweftstudio@gmail.com</a> with your name, story title and synopsis so we can match it to your application.</p>
            </section>

            <section className="fw-program-block">
              <h3>What accepted Founding Writers receive</h3>
              <ul>{benefits.map(item => <li key={item}>{item}</li>)}</ul>
            </section>

            <section className="fw-program-block">
              <h3>Future platform commission</h3>
              <p>Paid publishing is not live. If it launches, the founding commission benefit will be based on the order in which writers are accepted:</p>
              <div className="fw-table-wrap">
                <table className="fw-commission-table">
                  <thead><tr><th scope="col">Accepted group</th><th scope="col">WordWeft platform commission</th><th scope="col">Benefit period</th></tr></thead>
                  <tbody>
                    <tr><td>First 10 Founding Writers</td><td>0%</td><td rowSpan={3}>On the first ₹50,000 (or $500) of eligible net earnings, or for 12 months after paid publishing launches—whichever comes first</td></tr>
                    <tr><td>Next 15 Founding Writers</td><td>5%</td></tr>
                    <tr><td>Next 25 Founding Writers</td><td>10%</td></tr>
                  </tbody>
                </table>
              </div>
              <p>The ₹50,000 (or $500) is not a payment from WordWeft. It is the writer’s eligible net earnings from reader payments to which the stated platform commission applies. Payment-processing charges, taxes, refunds and legally required deductions may still apply. Payment and payout terms will be provided before monetization starts. WordWeft does not guarantee readers or earnings.</p>
            </section>

            <section className="fw-program-block">
              <h3>Promotion of accepted stories</h3>
              <p>WordWeft may feature selected books, excerpts, story descriptions or covers on the platform and WordWeft social channels to introduce writers and stories to readers. The writer keeps ownership. If you have a concern about a particular promotional use, contact us so we can discuss it.</p>
            </section>
            </details>
          </div>
        </section>

        <section className="fw-application-section" ref={formSection} aria-labelledby="founding-application-heading">
          <div className="fw-content-shell">
            <div className="fw-section-heading fw-form-heading">
              <h2 id="founding-application-heading">Share your story with us.</h2>
              <p>Complete the form below. Fields marked <span aria-hidden="true">*</span><span className="sr-only">with an asterisk</span> are required.</p>
            </div>

            {submitted ? (
              <div className="fw-success" role="status" aria-live="polite">
                <span className="fw-success-icon"><Check size={26} /></span>
                <h3>Application received</h3>
                <p>We’ll review it and normally respond within 3–4 business days using the email address you provided.</p>
                <div className="fw-success-actions">
                  <a className="fw-primary-button" href="/auth?view=signup">Create a WordWeft account</a>
                  <a className="fw-secondary-button" href="/">Return to WordWeft</a>
                </div>
              </div>
            ) : (
              <form className="fw-form" onSubmit={handleSubmit} aria-busy={submitting}>
                <fieldset className="ww-pending-fields" disabled={submitting} aria-label="Application details">
                <p className="ww-form-progress" role="status">{completedSections.filter(Boolean).length} of 4 sections complete · Review everything before sending</p>
                <fieldset>
                  <legend>Personal information</legend>
                  <div className="fw-field-grid">
                    <label className="fw-field">Full name <b>*</b><input required maxLength={120} autoComplete="name" value={form.fullName} onChange={event => setField('fullName', event.target.value)} /></label>
                    <label className="fw-field">Pen name <small>Optional</small><input maxLength={120} value={form.penName} onChange={event => setField('penName', event.target.value)} /></label>
                    <label className="fw-field">Email address <b>*</b><input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={event => setField('email', event.target.value)} /></label>
                    <label className="fw-field">Country <b>*</b><input required maxLength={120} autoComplete="country-name" value={form.country} onChange={event => setField('country', event.target.value)} /></label>
                    <label className="fw-field fw-field-wide">Instagram or public writing profile <small>Optional</small><input type="url" maxLength={500} placeholder="https://" value={form.instagramProfileUrl} onChange={event => setField('instagramProfileUrl', event.target.value)} /></label>
                  </div>
                </fieldset>

                <fieldset>
                  <legend>Story information</legend>
                  <div className="fw-field-grid">
                    <label className="fw-field">Primary genre <b>*</b><select required value={form.genre} onChange={event => setField('genre', event.target.value)}><option value="">Choose a genre</option>{genres.map(genre => <option key={genre}>{genre}</option>)}</select></label>
                    <label className="fw-field">Story title <b>*</b><input required maxLength={200} value={form.storyTitle} onChange={event => setField('storyTitle', event.target.value)} /></label>
                    <label className="fw-field fw-field-wide">Synopsis <b>*</b><textarea required rows={5} maxLength={1000} value={form.storyDescription} onChange={event => setField('storyDescription', event.target.value)} /><em>{form.storyDescription.length}/1,000</em></label>
                    <div className="fw-sample-group fw-field-wide">
                      <div><strong><Upload size={17} aria-hidden="true" /> First three chapters <b>*</b></strong><p>Upload one PDF, DOCX or TXT file under 5 MB. Clearly label each chapter. The file is private and used only to review this application.</p></div>
                      <label className="fw-field">Chapter file <b>*</b><input id="fw-chapter-file" required type="file" accept=".pdf,.docx,.txt" aria-describedby="fw-upload-help" onChange={event => { setChapterFile(event.target.files?.[0] || null); setReviewing(false); setError(''); }} /></label>
                      <p id="fw-upload-help" role="status">{chapterFile ? `${chapterFile.name} · ${(chapterFile.size / 1024 / 1024).toFixed(2)} MB selected. Uploaded when you submit.` : recovery.restored ? 'Your form is restored. Please choose your manuscript again; files are not saved in browser drafts.' : 'Choose one file containing at least three chapters.'}</p>
                      <div className="fw-confirmations"><label><input required type="checkbox" checked={form.chaptersConfirmed} onChange={event => setField('chaptersConfirmed', event.target.checked)} /><span>I confirm that this file contains at least three chapters.</span></label></div>
                    </div>
                    <label className="fw-field fw-field-wide">Where do you currently publish? <small>Optional</small><input maxLength={300} placeholder="Platform, publication or website" value={form.existingPublishingPlatform} onChange={event => setField('existingPublishingPlatform', event.target.value)} /></label>
                    <label className="fw-field">Chapters already drafted <b>*</b><input required type="number" min={3} max={10000} inputMode="numeric" value={form.draftedChapterCount} onChange={event => setField('draftedChapterCount', event.target.value)} /></label>
                    <label className="fw-field">Estimated total chapters <b>*</b><input required type="number" min={3} max={10000} inputMode="numeric" value={form.plannedChapterCount} onChange={event => setField('plannedChapterCount', event.target.value)} /></label>
                    <label className="fw-field fw-field-wide">Expected time to complete the story <b>*</b><select required value={form.expectedCompletionPeriod} onChange={event => setField('expectedCompletionPeriod', event.target.value as FoundingWriterCompletionPeriod)}><option value="">Choose a timeframe</option>{completionPeriods.map(period => <option value={period.value} key={period.value}>{period.label}</option>)}</select></label>
                  </div>
                </fieldset>

                <fieldset>
                  <legend>Confirmations</legend>
                  <div className="fw-confirmations">
                    {confirmations.map(([field, label]) => (
                      <label key={field} className={form[field] ? 'is-checked' : ''}><input required type="checkbox" checked={form[field]} onChange={event => setField(field, event.target.checked)} /><span>{label}</span></label>
                    ))}
                    <label className={form.termsConfirmed ? 'is-checked' : ''}><input required type="checkbox" checked={form.termsConfirmed} onChange={event => setField('termsConfirmed', event.target.checked)} /><span>I agree to the WordWeft <a href="/terms" target="_blank" rel="noreferrer">Terms of Service</a>, <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a> and <a href="/safety" target="_blank" rel="noreferrer">Safety &amp; Content Rules</a>.</span></label>
                  </div>
                </fieldset>

                <div className="fw-honeypot" aria-hidden="true">
                  <label>Leave this field empty<input type="text" name="website_ref_hp" tabIndex={-1} autoComplete="new-password" value={form.website_ref_hp || ''} onChange={event => setField('website_ref_hp', event.target.value)} /></label>
                </div>

                <FormDraftNotice {...recovery} onDiscard={() => { recovery.discard(); setChapterFile(null); setReviewing(false); }} guest={!currentUser} />
                {reviewing && <div className="ww-form-review" ref={reviewSection} tabIndex={-1} aria-labelledby="fw-review-heading">
                  <h3 id="fw-review-heading">Review your application</h3>
                  <dl><dt>Writer</dt><dd>{form.fullName}{form.penName ? ` · ${form.penName}` : ''}</dd><dt>Reply email</dt><dd>{form.email}</dd><dt>Story</dt><dd>{form.storyTitle} · {form.genre}</dd><dt>Progress</dt><dd>{form.draftedChapterCount} of {form.plannedChapterCount} chapters drafted</dd><dt>Completion</dt><dd>{completionPeriods.find(period => period.value === form.expectedCompletionPeriod)?.label}</dd><dt>Manuscript</dt><dd>{chapterFile?.name}</dd></dl>
                  <p>Your manuscript is private. Sending this application does not publish your story.</p>
                  <button type="button" className="fw-secondary-button" onClick={() => { setReviewing(false); scrollToForm(); }}>Edit application</button>
                </div>}
                {error && <p className="fw-form-error" role="alert">{error}</p>}

                {submitting ? (
                  <div className="fw-upload-progress-card" role="status" aria-live="polite">
                    <div className="fw-upload-progress-header">
                      <div className="fw-upload-progress-status"><span className="fw-upload-spinner" aria-hidden="true" /><span>{uploadPercent >= 100 ? 'Recording your application…' : 'Uploading manuscript…'}</span></div>
                      <span className="fw-upload-progress-percent">{uploadPercent}%</span>
                    </div>
                    <div className="fw-upload-track"><div className="fw-upload-fill" style={{ width: `${Math.max(6, uploadPercent)}%` }} /></div>
                    <div className="fw-upload-progress-footer"><span className="fw-upload-filename">{chapterFile?.name} {chapterFile?.size ? `(${(chapterFile.size / (1024 * 1024)).toFixed(1)} MB)` : ''}</span><span>Please keep this page open until complete.</span></div>
                  </div>
                ) : (
                  <div className="fw-submit-row">
                    <p>We use this information only to review and respond to your application.</p>
                    <button className="fw-primary-button" type="submit">{reviewing ? 'Confirm and send application' : 'Review application'} <ArrowRight size={17} /></button>
                  </div>
                )}
                </fieldset>
              </form>
            )}
          </div>
        </section>

        <section className="fw-contact-section">
          <div className="fw-content-shell">
            <h2>Questions or writer referrals</h2>
            <p>Email <a href="mailto:wordweftstudio@gmail.com">wordweftstudio@gmail.com</a> if you have a question or know another writer who may be interested. Suggestions about the platform are welcome.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};
