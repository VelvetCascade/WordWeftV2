
import React, { useState, useEffect } from 'react';
import { Footer } from '../components/Footer';
import * as api from '../api/client';
import { useAnalytics } from '../contexts/AnalyticsContext';
import AdUnit from '../components/AdUnit';

// --- Reusable Components ---

const SectionHeader: React.FC<{ number: number; title: string; subtitle?: string }> = ({ number, title, subtitle }) => (
    <div className="mb-5">
        <div className="flex items-baseline gap-3 mb-1">
            <span className="text-xs font-mono text-gray-400 dark:text-gray-500 tabular-nums">{String(number).padStart(2, '0')}</span>
            <h3 className="font-sans text-lg font-bold text-text-rich dark:text-dark-text-rich">{title}</h3>
        </div>
        {subtitle && <p className="text-sm text-text-body dark:text-dark-text-body ml-4 sm:ml-8">{subtitle}</p>}
    </div>
);

const RadioOption: React.FC<{
    name: string;
    value: string;
    label: string;
    selected: string;
    onChange: (val: string) => void;
}> = ({ name, value, label, selected, onChange }) => (
    <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all
        ${selected === value
            ? 'border-accent bg-accent/5 text-text-rich dark:text-dark-text-rich'
            : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600 text-text-body dark:text-dark-text-body'
        }`}>
        <input
            type="radio"
            name={name}
            value={value}
            checked={selected === value}
            onChange={() => onChange(value)}
            className="sr-only"
        />
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors
            ${selected === value ? 'border-accent' : 'border-gray-300 dark:border-gray-600'}`}>
            {selected === value && <div className="w-2 h-2 rounded-full bg-accent" />}
        </div>
        <span className="text-sm">{label}</span>
    </label>
);

const CheckboxOption: React.FC<{
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}> = ({ label, checked, onChange }) => (
    <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all
        ${checked
            ? 'border-accent bg-accent/5 text-text-rich dark:text-dark-text-rich'
            : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600 text-text-body dark:text-dark-text-body'
        }`}>
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only"
        />
        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
            ${checked ? 'border-accent bg-accent' : 'border-gray-300 dark:border-gray-600'}`}>
            {checked && (
                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
        </div>
        <span className="text-sm">{label}</span>
    </label>
);

const RatingScale: React.FC<{
    value: number;
    onChange: (val: number) => void;
    labels: string[];
}> = ({ value, onChange, labels }) => (
    <div className="space-y-3">
        <div className="flex gap-2">
            {labels.map((_, i) => (
                <button
                    key={i}
                    type="button"
                    onClick={() => onChange(i + 1)}
                    className={`flex-1 h-12 rounded-xl border-2 font-semibold text-lg transition-all
                        ${value === i + 1
                            ? 'border-accent bg-accent text-white scale-105'
                            : 'border-gray-200 dark:border-dark-border text-text-body dark:text-dark-text-body hover:border-gray-300'
                        }`}
                >
                    {i + 1}
                </button>
            ))}
        </div>
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 px-1">
            <span>{labels[0]}</span>
            <span>{labels[labels.length - 1]}</span>
        </div>
    </div>
);

const TagInput: React.FC<{
    tags: string[];
    onChange: (tags: string[]) => void;
    placeholder: string;
}> = ({ tags, onChange, placeholder }) => {
    const [input, setInput] = useState('');

    const addTag = () => {
        const trimmed = input.trim();
        if (trimmed && !tags.includes(trimmed)) {
            onChange([...tags, trimmed]);
            setInput('');
        }
    };

    const removeTag = (tag: string) => {
        onChange(tags.filter(t => t !== tag));
    };

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-3">
                {tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1.5 bg-accent/10 text-accent text-sm px-3 py-1.5 rounded-lg">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
                                <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                        </button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder={placeholder}
                    className="flex-1 h-11 px-4 rounded-xl text-sm border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface-alt text-text-rich dark:text-dark-text-rich focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                />
                <button
                    type="button"
                    onClick={addTag}
                    className="px-4 h-11 rounded-xl border border-gray-200 dark:border-dark-border text-sm text-text-body dark:text-dark-text-body hover:border-accent hover:text-accent transition-all"
                >
                    Add
                </button>
            </div>
        </div>
    );
};

const Divider: React.FC = () => (
    <div className="border-t border-gray-100 dark:border-dark-border my-10" />
);

// --- Main Page ---

export const FeedbackPage: React.FC = () => {
    const { trackEvent } = useAnalytics();
    useEffect(() => { trackEvent('support', 'feedback_view'); }, []);
    const [userType, setUserType] = useState('');
    const [overallRating, setOverallRating] = useState(0);
    const [triedFeatures, setTriedFeatures] = useState<Record<string, boolean>>({});
    const [otherFeature, setOtherFeature] = useState('');
    const [whatFeltGood, setWhatFeltGood] = useState('');
    const [whatWasFrustrating, setWhatWasFrustrating] = useState('');
    const [missingFeatures, setMissingFeatures] = useState<string[]>([]);
    const [performanceIssue, setPerformanceIssue] = useState('');
    const [performanceDetails, setPerformanceDetails] = useState('');
    const [usageFrequency, setUsageFrequency] = useState('');
    const [usageWhy, setUsageWhy] = useState('');
    const [openThoughts, setOpenThoughts] = useState('');
    const [contactPermission, setContactPermission] = useState(false);
    const [contactEmail, setContactEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const featureOptions = [
        'Writing a story',
        'Reading stories',
        'Comments/discussions',
        'Library/shelves',
        'Searching for stories',
        'Profile',
        'Notifications'
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const selectedFeatures = Object.entries(triedFeatures)
                .filter(([, v]) => v)
                .map(([k]) => k);

            await api.submitFeedback({
                userType,
                overallRating: overallRating || null,
                triedFeatures: selectedFeatures,
                otherTriedFeature: otherFeature || null,
                whatFeltGood: whatFeltGood || null,
                whatWasFrustrating: whatWasFrustrating || null,
                missingFeatures,
                performanceIssue: performanceIssue || null,
                performanceDetails: performanceDetails || null,
                usageFrequency: usageFrequency || null,
                usageFrequencyWhy: usageWhy || null,
                openThoughts: openThoughts || null,
                contactPermission,
                contactEmail: contactPermission ? contactEmail : null,
            });

            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div>
                <div className="min-h-[70vh] flex items-center justify-center px-6">
                    <div className="max-w-lg text-center">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none">
                                <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h1 className="font-sans text-3xl font-extrabold text-text-rich dark:text-dark-text-rich mb-4 tracking-tight">
                            Thank you
                        </h1>
                        <p className="text-text-body dark:text-dark-text-body text-lg leading-relaxed mb-8">
                            Thanks for helping shape WordWeft. You're literally influencing what gets built next.
                        </p>
                        <a
                            href="#/"
                            className="inline-block bg-accent text-white font-sans font-semibold px-6 py-3 rounded-xl hover:bg-primary transition-all text-sm"
                        >
                            Back to WordWeft
                        </a>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="bg-white dark:bg-dark-surface border-b border-gray-200/80 dark:border-dark-border">
                <div className="container mx-auto px-6 py-16 max-w-2xl text-center">
                    <h1 className="font-sans text-3xl md:text-4xl font-extrabold text-text-rich dark:text-dark-text-rich mb-4 tracking-tight">
                        Help Us Shape WordWeft
                    </h1>
                    <p className="text-text-body dark:text-dark-text-body leading-relaxed">
                        You're using an early version of WordWeft. Your thoughts directly influence what we build next.
                        Tell us what worked, what didn't, and what you wish existed.
                    </p>
                </div>
            </div>

            {/* Form */}
            <div className="container mx-auto px-6 py-12 max-w-2xl">
                <form onSubmit={handleSubmit}>

                    {/* Section 1: User Type */}
                    <SectionHeader number={1} title="What describes you best?" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 ml-4 sm:ml-8">
                        <RadioOption name="userType" value="writer" label="Mainly a Writer" selected={userType} onChange={setUserType} />
                        <RadioOption name="userType" value="reader" label="Mainly a Reader" selected={userType} onChange={setUserType} />
                        <RadioOption name="userType" value="both" label="Both" selected={userType} onChange={setUserType} />
                    </div>

                    <Divider />

                    {/* Section 2: Overall Experience */}
                    <SectionHeader number={2} title="Overall experience" subtitle="How would you rate your experience so far?" />
                    <div className="ml-8">
                        <RatingScale
                            value={overallRating}
                            onChange={setOverallRating}
                            labels={['Very confusing', 'Somewhat confusing', 'Neutral', 'Easy to use', 'Extremely smooth']}
                        />
                    </div>

                    <Divider />

                    {/* Section 3: What did you try? */}
                    <SectionHeader number={3} title="What did you try?" subtitle="Select all that apply." />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-4 sm:ml-8">
                        {featureOptions.map(feature => (
                            <CheckboxOption
                                key={feature}
                                label={feature}
                                checked={!!triedFeatures[feature]}
                                onChange={(checked) => setTriedFeatures(prev => ({ ...prev, [feature]: checked }))}
                            />
                        ))}
                    </div>
                    <div className="mt-3 ml-4 sm:ml-8">
                        <input
                            type="text"
                            value={otherFeature}
                            onChange={e => setOtherFeature(e.target.value)}
                            placeholder="Other (please specify)"
                            className="w-full h-11 px-4 rounded-xl text-sm border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface-alt text-text-rich dark:text-dark-text-rich focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                        />
                    </div>

                    <Divider />

                    {/* Section 4: What felt good? */}
                    <SectionHeader number={4} title="What felt good?" />
                    <div className="ml-8">
                        <textarea
                            value={whatFeltGood}
                            onChange={e => setWhatFeltGood(e.target.value)}
                            rows={4}
                            placeholder="Anything you enjoyed, even small things."
                            className="w-full px-4 py-3 rounded-xl text-sm border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface-alt text-text-rich dark:text-dark-text-rich focus:ring-2 focus:ring-accent focus:border-accent transition-all resize-none leading-relaxed"
                        />
                    </div>

                    <Divider />

                    {/* Section 5: What was frustrating? */}
                    <SectionHeader number={5} title="What was frustrating?" />
                    <div className="ml-8">
                        <textarea
                            value={whatWasFrustrating}
                            onChange={e => setWhatWasFrustrating(e.target.value)}
                            rows={4}
                            placeholder="Confusing steps, missing features, bugs, or anything annoying."
                            className="w-full px-4 py-3 rounded-xl text-sm border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface-alt text-text-rich dark:text-dark-text-rich focus:ring-2 focus:ring-accent focus:border-accent transition-all resize-none leading-relaxed"
                        />
                    </div>

                    <Divider />

                    {/* Section 6: Missing Features */}
                    <SectionHeader number={6} title="Missing features" subtitle="What do you wish existed? Add as many as you like." />
                    <div className="ml-8">
                        <TagInput
                            tags={missingFeatures}
                            onChange={setMissingFeatures}
                            placeholder="Type a feature and press Enter"
                        />
                    </div>

                    <Divider />

                    {/* Section 7: Performance */}
                    <SectionHeader number={7} title="Performance" subtitle="Did anything feel slow?" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 ml-4 sm:ml-8">
                        <RadioOption name="performance" value="no" label="No" selected={performanceIssue} onChange={setPerformanceIssue} />
                        <RadioOption name="performance" value="sometimes" label="Sometimes" selected={performanceIssue} onChange={setPerformanceIssue} />
                        <RadioOption name="performance" value="often" label="Often" selected={performanceIssue} onChange={setPerformanceIssue} />
                        <RadioOption name="performance" value="very_often" label="Very often" selected={performanceIssue} onChange={setPerformanceIssue} />
                    </div>
                    {performanceIssue && performanceIssue !== 'no' && (
                        <div className="mt-3 ml-4 sm:ml-8">
                            <input
                                type="text"
                                value={performanceDetails}
                                onChange={e => setPerformanceDetails(e.target.value)}
                                placeholder="Where did it happen? (optional)"
                                className="w-full h-11 px-4 rounded-xl text-sm border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface-alt text-text-rich dark:text-dark-text-rich focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                            />
                        </div>
                    )}

                    <Divider />

                    {/* Section 8: Would you use this regularly? */}
                    <SectionHeader number={8} title="Would you use this regularly?" />
                    <div className="grid grid-cols-2 gap-3 ml-4 sm:ml-8">
                        <RadioOption name="usage" value="daily" label="Yes, daily" selected={usageFrequency} onChange={setUsageFrequency} />
                        <RadioOption name="usage" value="few_times_week" label="Few times a week" selected={usageFrequency} onChange={setUsageFrequency} />
                        <RadioOption name="usage" value="occasionally" label="Occasionally" selected={usageFrequency} onChange={setUsageFrequency} />
                        <RadioOption name="usage" value="probably_not" label="Probably not yet" selected={usageFrequency} onChange={setUsageFrequency} />
                    </div>
                    <div className="mt-3 ml-4 sm:ml-8">
                        <input
                            type="text"
                            value={usageWhy}
                            onChange={e => setUsageWhy(e.target.value)}
                            placeholder="Why? (optional)"
                            className="w-full h-11 px-4 rounded-xl text-sm border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface-alt text-text-rich dark:text-dark-text-rich focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                        />
                    </div>

                    <Divider />

                    {/* Section 9: Open Thoughts */}
                    <SectionHeader number={9} title="Open thoughts" subtitle="If WordWeft could magically improve one thing, what would it be?" />
                    <div className="ml-8">
                        <textarea
                            value={openThoughts}
                            onChange={e => setOpenThoughts(e.target.value)}
                            rows={4}
                            placeholder="Write freely..."
                            className="w-full px-4 py-3 rounded-xl text-sm border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface-alt text-text-rich dark:text-dark-text-rich focus:ring-2 focus:ring-accent focus:border-accent transition-all resize-none leading-relaxed"
                        />
                    </div>

                    <Divider />

                    {/* Section 10: Contact Permission */}
                    <SectionHeader number={10} title="Can we follow up?" subtitle="Only if you're open to it." />
                    <div className="ml-8 space-y-3">
                        <CheckboxOption
                            label="Allow us to contact you for clarification"
                            checked={contactPermission}
                            onChange={setContactPermission}
                        />
                        {contactPermission && (
                            <input
                                type="email"
                                value={contactEmail}
                                onChange={e => setContactEmail(e.target.value)}
                                placeholder="Your email address"
                                className="w-full h-11 px-4 rounded-xl text-sm border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface-alt text-text-rich dark:text-dark-text-rich focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                            />
                        )}
                    </div>

                    <Divider />

                    {/* Error */}
                    {error && (
                        <div className="mb-6 ml-4 sm:ml-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 text-sm text-red-700 dark:text-red-300">
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <div className="ml-8 flex items-center justify-between">
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            All responses are kept confidential.
                        </p>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-accent text-white font-sans font-semibold px-8 py-3 rounded-xl hover:bg-primary transition-all hover:scale-105 duration-300 shadow-lg disabled:bg-gray-400 disabled:scale-100 disabled:shadow-none text-sm"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Submitting...
                                </span>
                            ) : 'Submit Feedback'}
                        </button>
                    </div>
                </form>
            </div>

            <AdUnit format="horizontal" />

            <Footer />
        </div>
    );
};
