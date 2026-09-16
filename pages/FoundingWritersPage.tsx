import React, { useRef, useState } from 'react';
import { ArrowRight, BadgeCheck, Check, HeartHandshake, Sparkles } from 'lucide-react';
import { Footer } from '../components/Footer';
import { submitFoundingWriterApplication } from '../api/client';
import type { FoundingWriterApplicationSubmission, FoundingWriterCompletionPeriod } from '../types';
import '../styles/founding-writers.css';

const benefits = [
  'Permanent Founding Writer badge on your writer profile',
  'Personal help setting up your profile and first story',
  'A dedicated Founding Writer Spotlight',
  'Featured placement during WordWeft’s early launch',
  'Early access to new writer features',
  'Direct input into features developed for writers',
];

const requirements = [
  'You must be at least 18 years old.',
  'Your submitted story must be original, or you must have the legal right to publish it.',
  'Begin with one fiction story.',
  'Upload a file containing at least three chapters of your story with your application.',
  'After publishing begins, normally publish at least one chapter per week until the story is completed.',
  'Take reasonable breaks when needed, as long as you communicate with the WordWeft team.',
  'Genuinely intend to complete your submitted story rather than publish a few chapters and abandon it.',
  'Provide honest feedback about the WordWeft writing and publishing experience.',
  'Publishing on WordWeft is non-exclusive. You may continue publishing elsewhere.',
  'Follow WordWeft’s existing content and community policies.',
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
  ['rightsConfirmed', 'I confirm that I own this work or have the right to publish it.'],
  ['completionCommitted', 'I intend to complete this story.'],
  ['weeklyPublishingCommitted', 'I can generally publish one chapter per week, with communicated breaks when necessary.'],
  ['earningsDisclaimerConfirmed', 'I understand that WordWeft does not guarantee readers or earnings.'],
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
  earningsDisclaimerConfirmed: false, termsConfirmed: false, organizationName: '', chaptersConfirmed: false,
};

export const FoundingWritersPage: React.FC = () => {
  const formSection = useRef<HTMLElement>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [chapterFile, setChapterFile] = useState<File | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm(previous => ({ ...previous, [field]: value }));
    if (error) setError('');
  };

  const scrollToForm = () => formSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chapterFile || chapterFile.size === 0 || chapterFile.size > 5 * 1024 * 1024 || !/\.(pdf|docx|txt)$/i.test(chapterFile.name)) {
      setError('Upload a non-empty PDF, DOCX, or TXT file, up to 5 MB, containing at least three chapters.');
      document.getElementById('fw-chapter-file')?.focus();
      return;
    }

    setSubmitting(true);
    setUploadPercent(0);
    setError('');
    try {
      await submitFoundingWriterApplication({
        ...form,
        expectedCompletionPeriod: form.expectedCompletionPeriod as FoundingWriterCompletionPeriod,
        draftedChapterCount: Number(form.draftedChapterCount),
        plannedChapterCount: Number(form.plannedChapterCount),
      }, chapterFile, (percent) => {
        setUploadPercent(percent);
      });
      setSubmitted(true);
      requestAnimationFrame(scrollToForm);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'We couldn\'t submit your application right now. Please try again shortly.');
    } finally {
      setSubmitting(false);
      setUploadPercent(0);
    }
  };

  return (
    <div className="fw-page">
      <section className="fw-hero" aria-labelledby="founding-writers-heading">
        <div className="fw-shell fw-hero-grid">
          <div className="fw-hero-copy">
            <span className="fw-places"><Sparkles size={14} /> Founding Writer applications open</span>
            <p className="fw-eyebrow">An invitation to early storytellers</p>
            <h1 id="founding-writers-heading">Become a WordWeft Founding Writer</h1>
            <p className="fw-hero-description">Publish your story, help shape WordWeft from the beginning and receive permanent recognition as one of the platform’s earliest writers.</p>
            <button className="fw-primary-button" type="button" onClick={scrollToForm}>
              Apply as a Founding Writer <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <section className="fw-section fw-shell" aria-labelledby="founding-benefits-heading">
        <div className="fw-section-heading">
          <p className="fw-eyebrow">A place in the opening chapter</p>
          <h2 id="founding-benefits-heading">What founding writers receive</h2>
          <p>Early writers will get practical support, lasting recognition and a direct voice in the tools we make next.</p>
        </div>
        <div className="fw-benefit-grid">
          {benefits.map(benefit => (
            <article className="fw-benefit-card" key={benefit}>
              <span><Check size={16} /></span>
              <p>{benefit}</p>
            </article>
          ))}
          <article className="fw-benefit-card fw-benefit-card-featured">
            <span><BadgeCheck size={17} /></span>
            <div>
              <p>For the first 10 Founding Writers: zero WordWeft platform commission on the first ₹50,000 (or $500) of eligible net earnings or for 12 months after paid publishing launches, whichever comes first</p>
              <small>Paid publishing is not currently live. Payment-processing charges, applicable taxes, refunds and legally required deductions may still apply. WordWeft does not guarantee earnings or a particular number of readers.</small>
            </div>
          </article>
        </div>
      </section>

      <section className="fw-commitment-section" aria-labelledby="founding-commitment-heading">
        <div className="fw-shell fw-commitment-grid">
          <div className="fw-commitment-intro">
            <p className="fw-eyebrow">A shared commitment</p>
            <h2 id="founding-commitment-heading">What we ask of founding writers</h2>
            <p>This is not an employment contract. It is a good-faith promise to show up for your story, your readers and the small community building WordWeft alongside you.</p>
            <div className="fw-kind-note">
              <HeartHandshake size={23} />
              <p>Missing a single week will not automatically remove a writer from the programme. We understand that writing takes time. We only ask founding writers to communicate with us and make a genuine effort to complete their story.</p>
            </div>
          </div>
          <ol className="fw-requirement-list">
            {requirements.map((requirement, index) => (
              <li key={requirement}><span>{String(index + 1).padStart(2, '0')}</span><p>{requirement}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="fw-application-section" ref={formSection} aria-labelledby="founding-application-heading">
        <div className="fw-shell">
          <div className="fw-section-heading fw-form-heading">
            <p className="fw-eyebrow">Tell us about your story</p>
            <h2 id="founding-application-heading">Founding Writer application</h2>
            <p>A short, honest introduction is enough. Fields marked <span aria-hidden="true">*</span><span className="sr-only">with an asterisk</span> are required.</p>
          </div>

          {submitted ? (
            <div className="fw-success" role="status" aria-live="polite">
              <span className="fw-success-icon"><Check size={30} /></span>
              <p className="fw-eyebrow">Application sent</p>
              <h3>Your application has been received.</h3>
              <p>We’ll review your story and contact you using the email address you provided. While you wait, you can create your WordWeft account and explore the writer studio.</p>
              <div className="fw-success-actions">
                <a className="fw-primary-button" href="/auth?view=signup">Create a WordWeft account</a>
                <a className="fw-secondary-button" href="/">Return to WordWeft</a>
              </div>
            </div>
          ) : (
            <form className="fw-form" onSubmit={handleSubmit} noValidate={false}>
              <fieldset>
                <legend><span>01</span> Personal information</legend>
                <div className="fw-field-grid">
                  <label className="fw-field">Full name <b>*</b><input required maxLength={120} autoComplete="name" value={form.fullName} onChange={event => setField('fullName', event.target.value)} /></label>
                  <label className="fw-field">Pen name <small>Optional</small><input maxLength={120} value={form.penName} onChange={event => setField('penName', event.target.value)} /></label>
                  <label className="fw-field">Email address <b>*</b><input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={event => setField('email', event.target.value)} /></label>
                  <label className="fw-field">Country <b>*</b><input required maxLength={120} autoComplete="country-name" value={form.country} onChange={event => setField('country', event.target.value)} /></label>
                  <label className="fw-field fw-field-wide">Instagram or public writing profile <small>Optional</small><input type="url" maxLength={500} placeholder="https://" value={form.instagramProfileUrl} onChange={event => setField('instagramProfileUrl', event.target.value)} /></label>
                </div>
              </fieldset>

              <fieldset>
                <legend><span>02</span> Writing information</legend>
                <div className="fw-field-grid">
                  <label className="fw-field">Primary genre <b>*</b><select required value={form.genre} onChange={event => setField('genre', event.target.value)}><option value="">Choose a genre</option>{genres.map(genre => <option key={genre}>{genre}</option>)}</select></label>
                  <label className="fw-field">Story title <b>*</b><input required maxLength={200} value={form.storyTitle} onChange={event => setField('storyTitle', event.target.value)} /></label>
                  <label className="fw-field fw-field-wide">Short story description <b>*</b><textarea required rows={5} maxLength={1000} value={form.storyDescription} onChange={event => setField('storyDescription', event.target.value)} /><em>{form.storyDescription.length}/1,000</em></label>
                  <div className="fw-sample-group fw-field-wide">
                    <div><strong>Upload your chapters <b>*</b></strong><p>Include at least three chapters in one PDF, DOCX, or TXT file (up to 5 MB). Clearly label each chapter. Your file is private and available only to WordWeft administrators for review.</p></div>
                    <label className="fw-field">Chapter file <b>*</b><input id="fw-chapter-file" required type="file" accept=".pdf,.docx,.txt" aria-describedby="fw-upload-help" onChange={event => { setChapterFile(event.target.files?.[0] || null); setError(''); }} /></label>
                    <p id="fw-upload-help" role="status">{chapterFile ? `${chapterFile.name} · ${(chapterFile.size / 1024 / 1024).toFixed(2)} MB selected. Uploaded when you submit.` : 'Choose one file containing at least three chapters.'}</p>
                    <div className="fw-confirmations"><label><input required type="checkbox" checked={form.chaptersConfirmed} onChange={event => setField('chaptersConfirmed', event.target.checked)} /><span>I confirm that this file contains at least three chapters of my story.</span></label></div>
                  </div>
                  <label className="fw-field fw-field-wide">Where do you currently publish? <small>Optional</small><input maxLength={300} placeholder="A platform name, publication or your own site" value={form.existingPublishingPlatform} onChange={event => setField('existingPublishingPlatform', event.target.value)} /></label>
                  <label className="fw-field">Chapters already drafted <b>*</b><input required type="number" min={3} max={10000} inputMode="numeric" value={form.draftedChapterCount} onChange={event => setField('draftedChapterCount', event.target.value)} /></label>
                  <label className="fw-field">Estimated total chapters <b>*</b><input required type="number" min={3} max={10000} inputMode="numeric" value={form.plannedChapterCount} onChange={event => setField('plannedChapterCount', event.target.value)} /></label>
                  <label className="fw-field fw-field-wide">How long do you expect to take to complete it? <b>*</b><select required value={form.expectedCompletionPeriod} onChange={event => setField('expectedCompletionPeriod', event.target.value as FoundingWriterCompletionPeriod)}><option value="">Choose a timeframe</option>{completionPeriods.map(period => <option value={period.value} key={period.value}>{period.label}</option>)}</select></label>
                </div>
              </fieldset>

              <fieldset>
                <legend><span>03</span> Confirmations</legend>
                <div className="fw-confirmations">
                  {confirmations.map(([field, label]) => (
                    <label key={field} className={form[field] ? 'is-checked' : ''}><input required type="checkbox" checked={form[field]} onChange={event => setField(field, event.target.checked)} /><span>{label}</span></label>
                  ))}
                  <label className={form.termsConfirmed ? 'is-checked' : ''}><input required type="checkbox" checked={form.termsConfirmed} onChange={event => setField('termsConfirmed', event.target.checked)} /><span>I agree to the WordWeft <a href="/terms" target="_blank" rel="noreferrer">Terms</a> and <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</span></label>
                </div>
              </fieldset>

              <div className="fw-honeypot" aria-hidden="true">
                <label>Organization name<input tabIndex={-1} autoComplete="off" value={form.organizationName} onChange={event => setField('organizationName', event.target.value)} /></label>
              </div>

              {error && <p className="fw-form-error" role="alert">{error}</p>}

              {submitting ? (
                <div className="fw-upload-progress-card" role="status" aria-live="polite">
                  <div className="fw-upload-progress-header">
                    <div className="fw-upload-progress-status">
                      <span className="fw-upload-spinner" aria-hidden="true" />
                      <span>{uploadPercent >= 100 ? 'Recording your application…' : 'Uploading manuscript…'}</span>
                    </div>
                    <span className="fw-upload-progress-percent">{uploadPercent}%</span>
                  </div>

                  <div className="fw-upload-track">
                    <div
                      className="fw-upload-fill"
                      style={{ width: `${Math.max(6, uploadPercent)}%` }}
                    />
                  </div>

                  <div className="fw-upload-progress-footer">
                    <span className="fw-upload-filename">
                      {chapterFile?.name} {chapterFile?.size ? `(${(chapterFile.size / (1024 * 1024)).toFixed(1)} MB)` : ''}
                    </span>
                    <span>Please keep this page open until complete.</span>
                  </div>
                </div>
              ) : (
                <div className="fw-submit-row">
                  <p>We’ll use your information only to review and respond to this application.</p>
                  <button className="fw-primary-button" type="submit">
                    Submit application <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
};
