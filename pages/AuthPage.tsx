import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { User } from '../types';
import { GoogleIcon, XMarkIcon, CheckCircleIcon, ArrowLeftIcon } from '../components/icons/Icons';
import * as api from '../api/client';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { WordWeftLogo } from '../components/icons/WordWeftLogo';
import { GoogleProfileCompletion } from '../components/GoogleProfileCompletion';
import { ModernBirthdaySelector } from '../components/ModernBirthdaySelector';


// Module-level flag: Google GIS must only be initialized ONCE per page session.
// Calling initialize() more than once causes the callback to be silently dropped.
let googleGsiInitialized = false;

interface AuthPageProps {
    onLogin: (user: User) => void;
}

// ... PasswordRequirements and InputField ...
const PasswordRequirements: React.FC<{ password: string; isVisible: boolean }> = ({ password, isVisible }) => {
    if (!isVisible) return null;

    const requirements = [
        { label: "8-10 characters", valid: password.length >= 8 && password.length <= 10 },
        { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
        { label: "One lowercase letter", valid: /[a-z]/.test(password) },
        { label: "One number", valid: /\d/.test(password) },
        { label: "One special char (@ $ ! % * ? &)", valid: /[@$!%*?&]/.test(password) },
    ];

    return (
        <div className="absolute bottom-full mb-3 left-0 right-0 bg-white dark:bg-dark-surface p-4 rounded-xl shadow-xl border border-gray-200 dark:border-dark-border z-30 animate-slide-in-bottom">
            <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Password Requirements</h4>
            <ul className="space-y-1.5">
                {requirements.map((req, i) => (
                    <li key={i} className={`text-xs flex items-center gap-2 transition-colors duration-200 ${req.valid ? 'text-success font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                        {req.valid ? (
                            <CheckCircleIcon className="w-4 h-4 text-success flex-shrink-0" />
                        ) : (
                            <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 flex-shrink-0" />
                        )}
                        <span>{req.label}</span>
                    </li>
                ))}
            </ul>
            <div className="absolute top-full left-6 -mt-[6px] w-3 h-3 bg-white dark:bg-dark-surface border-b border-r border-gray-200 dark:border-dark-border transform rotate-45"></div>
        </div>
    );
};

const InputField: React.FC<{
    id: string;
    label: string;
    type: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    min?: string;
    max?: string;
    helpText?: string;
    onFocus?: () => void;
    onBlur?: () => void;
    children?: React.ReactNode;
}> = ({ id, label, type, placeholder, value, onChange, required = true, min, max, helpText, onFocus, onBlur, children }) => (
    <div className="relative">
        <label htmlFor={id} className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">
            {label}
        </label>
        {children}
        <input
            type={type}
            id={id}
            placeholder={placeholder}
            className="w-full h-11 px-4 rounded-xl font-sans text-base border-gray-300 shadow-sm focus:ring-accent focus:border-accent transition-all duration-300 dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich"
            required={required}
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            onFocus={onFocus}
            onBlur={onBlur}
        />
        {helpText && <p className="mt-1 text-[10px] text-gray-500 font-sans leading-tight">{helpText}</p>}
    </div>
);

const LegalModal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; content: React.ReactNode }> = ({ isOpen, onClose, title, content }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-surface dark:bg-dark-surface w-full max-w-2xl max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-gray-100 dark:border-dark-border flex justify-between items-center">
                    <h3 className="text-xl font-sans font-bold text-text-rich dark:text-dark-text-rich">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-8 overflow-y-auto font-serif text-text-body dark:text-dark-text-body prose prose-sm dark:prose-invert">
                    {content}
                </div>
                <div className="p-6 border-t border-gray-100 dark:border-dark-border flex justify-end">
                    <button onClick={onClose} className="bg-accent text-white px-6 py-2 rounded-xl font-sans font-semibold hover:bg-primary transition-colors">Close</button>
                </div>
            </div>
        </div>
    );
};

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
    const [view, setView] = useState<'login' | 'signup' | 'forgot' | 'otp'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');
    const [birthday, setBirthday] = useState('');
    const [otp, setOtp] = useState('');
    const [otpResendCooldown, setOtpResendCooldown] = useState(0);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Google Auth State
    const [showGoogleProfileModal, setShowGoogleProfileModal] = useState(false);
    const [pendingGoogleUser, setPendingGoogleUser] = useState<User | null>(null);

    const googleButtonRef = useRef<HTMLDivElement>(null);

    // --- Stable refs for Google GIS callback (avoids stale closure) ---
    const googleCallbackRef = useRef<(response: any) => void>(() => {});
    const isGoogleProcessingRef = useRef(false); // Prevents concurrent API calls

    const [modalContent, setModalContent] = useState<{ title: string; content: React.ReactNode } | null>(null);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const { trackEvent } = useAnalytics();

    // Keep the callback ref always pointing to the latest handler
    const handleGoogleResponse = useCallback(async (response: any) => {
        // Guard against concurrent calls (Google popup can fire multiple times)
        if (isGoogleProcessingRef.current) return;
        isGoogleProcessingRef.current = true;

        setIsLoading(true);
        setError(null);
        try {
            const result = await api.googleLogin(response.credential);
            if (result) {
                if (result.needsProfileCompletion) {
                    // New user from Google, need additional profile details
                    setPendingGoogleUser(result.user);
                    setShowGoogleProfileModal(true);
                } else {
                    // Returning user, log them straight in
                    onLogin(result.user);
                }
            } else {
                throw new Error("Could not log in with Google.");
            }
        } catch (err: any) {
            setError(err.message || 'Google Auth Error');
        } finally {
            setIsLoading(false);
            isGoogleProcessingRef.current = false;
        }
    }, [onLogin]);

    // Always keep the ref current — this is what Google GIS will call
    useEffect(() => {
        googleCallbackRef.current = handleGoogleResponse;
    }, [handleGoogleResponse]);

    // --- Effect 1: Initialize Google GIS exactly ONCE ---
    useEffect(() => {
        const doInit = () => {
            if (googleGsiInitialized) return; // Already initialized this session
            if (!window.google?.accounts?.id) return; // Script not loaded yet

            const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
            if (!clientId) {
                console.error('[GoogleAuth] VITE_GOOGLE_CLIENT_ID is not set');
                return;
            }

            // The stable wrapper delegates to googleCallbackRef, which always
            // points to the latest handleGoogleResponse. This avoids the stale
            // closure problem — Google GIS captures this wrapper once, but the
            // ref it reads from is always current.
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: (resp: any) => googleCallbackRef.current(resp),
                auto_select: false,
                cancel_on_tap_outside: true,
            });

            googleGsiInitialized = true;
        };

        // Try immediately (script may already be loaded)
        doInit();

        // If not loaded yet, poll with a bounded interval
        if (!googleGsiInitialized) {
            let attempts = 0;
            const maxAttempts = 100; // 10 seconds max
            const intervalId = setInterval(() => {
                attempts++;
                if (window.google?.accounts?.id) {
                    doInit();
                    clearInterval(intervalId);
                } else if (attempts >= maxAttempts) {
                    console.warn('[GoogleAuth] Google GIS script failed to load after 10s');
                    clearInterval(intervalId);
                }
            }, 100);

            return () => clearInterval(intervalId);
        }
    }, []); // Runs once on mount — initialization is module-level guarded

    // --- Effect 2: Render the Google button (separate from initialization) ---
    // This runs whenever `view` changes so the button text updates (signin_with vs signup_with)
    useEffect(() => {
        if (view === 'otp' || view === 'forgot') return; // No Google button on these views

        const renderBtn = () => {
            if (!window.google?.accounts?.id || !googleButtonRef.current) return;

            // Clear any previous button render to avoid stacking iframes
            googleButtonRef.current.innerHTML = '';

            window.google.accounts.id.renderButton(googleButtonRef.current, {
                theme: document.documentElement.classList.contains('dark') ? 'filled_black' : 'outline',
                size: 'large',
                type: 'standard',
                text: view === 'signup' ? 'signup_with' : 'signin_with',
                shape: 'rectangular',
                logo_alignment: 'left',
                width: Math.max(googleButtonRef.current.offsetWidth, 250),
            });
        };

        // Defer to next animation frame so the DOM has painted and offsetWidth is accurate
        const rafId = requestAnimationFrame(() => {
            if (googleGsiInitialized) {
                renderBtn();
            } else {
                // If GIS hasn't initialized yet, wait briefly then try
                const waitId = setInterval(() => {
                    if (googleGsiInitialized) {
                        renderBtn();
                        clearInterval(waitId);
                    }
                }, 150);
                // Safety: stop waiting after 5s
                setTimeout(() => clearInterval(waitId), 5000);
            }
        });

        return () => cancelAnimationFrame(rafId);
    }, [view]);

    useEffect(() => {
        if (otpResendCooldown > 0) {
            const timerId = setTimeout(() => setOtpResendCooldown(c => c - 1), 1000);
            return () => clearTimeout(timerId);
        }
    }, [otpResendCooldown]);

    const handleGoogleProfileComplete = (user: User) => {
        setShowGoogleProfileModal(false);
        onLogin(user);
    };


    const calculateAge = (birthDateString: string) => {
        const birthDate = new Date(birthDateString);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const validatePassword = (pw: string) => {
        const hasLength = pw.length >= 8 && pw.length <= 10;
        const hasUpper = /[A-Z]/.test(pw);
        const hasLower = /[a-z]/.test(pw);
        const hasNumber = /\d/.test(pw);
        const hasSpecial = /[@$!%*?&]/.test(pw);
        return hasLength && hasUpper && hasLower && hasNumber && hasSpecial;
    };

    const getFriendlyError = (err: any): string => {
        const msg = err?.message || '';

        // Network / connectivity errors
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
            return 'Unable to connect to the server. Please check your internet connection and try again.';
        }
        if (msg.includes('timeout') || msg.includes('Timeout')) {
            return 'The request timed out. Please try again.';
        }

        // Strip "Error: " prefix if the backend still sends it
        const cleaned = msg.replace(/^Error:\s*/i, '').trim();

        // If the message is empty or too technical
        if (!cleaned || cleaned === 'Unauthorized' || cleaned === 'Internal Server Error') {
            return 'Something went wrong. Please try again.';
        }

        return cleaned;
    };

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);
        setIsLoading(true);

        try {
            if (view === 'login') {
                const user = await api.login(email, password);
                if (user) {
                    trackEvent('auth', 'login_success', 'email');
                    onLogin(user);
                }
            } else if (view === 'signup') {
                // Signup Validations
                if (!validatePassword(password)) {
                    throw new Error("Password does not meet the requirements.");
                }
                if (password !== confirmPassword) throw new Error("Passwords do not match.");
                if (!birthday) throw new Error("Birthday is required.");

                const age = calculateAge(birthday);
                if (age < 13 || age > 100) throw new Error("For your safety, you must be at least 13 years old to create an account on WordWeft.");
                if (!termsAccepted || !privacyAccepted) throw new Error("Please accept the Terms and Privacy Policy.");

                const result = await api.signup(username, email, password);
                if (result.requiresOtp) {
                    trackEvent('auth', 'signup_success', 'otp_required');
                    setSuccessMsg(result.message);
                    setView('otp');
                    setOtpResendCooldown(60); // 1-minute cooldown initial
                } else if (result.user) {
                    trackEvent('auth', 'signup_success', 'direct');
                    onLogin(result.user);
                }
            } else if (view === 'otp') {
                if (otp.length !== 6) throw new Error("Please enter a valid 6-digit code.");
                const user = await api.verifyOtp(email, otp);
                onLogin(user);
            } else if (view === 'forgot') {
                const msg = await api.forgotPassword(email);
                setSuccessMsg(msg);
            }
        } catch (err: any) {
             const errorMsg = getFriendlyError(err);
             setError(errorMsg);
             trackEvent('auth', view === 'login' ? 'login_fail' : view === 'signup' ? 'signup_fail' : 'auth_error', errorMsg);
             if (view === 'login' && errorMsg.includes("Email not verified")) {
                 setView('otp');
                 setSuccessMsg("Please check your email for the verification code. You can request a new one below.");
             }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (otpResendCooldown > 0) return;
        setError(null);
        setSuccessMsg(null);
        try {
           const msg = await api.resendOtp(email);
           setSuccessMsg(msg);
           setOtpResendCooldown(60); // 1 min cooldown
        } catch (err: any) {
           setError(getFriendlyError(err));
        }
    };

    const showTerms = () => setModalContent({
        title: "Terms and Conditions",
        content: (
            <div className="space-y-6 text-sm">
                <p className="text-xs text-gray-500">Last Updated: February 15, 2026</p>
                {/* Shortened terms content for brevity in file editing */}
                <div><h4 className="font-bold mb-1">1. Eligibility</h4>
                    <p>You must be at least 13 years old, 18+ to publish mature content, provide accurate account information, and not create accounts on behalf of banned users. We may suspend accounts that impersonate, automate, or misrepresent identity.</p></div>
                <div><h4 className="font-bold mb-1">2. Account Responsibility</h4>
                    <p>You are responsible for all activity under your account, maintaining password security, and any content posted through your account. WordWeft is not liable for loss caused by unauthorized access. We may terminate accounts without prior notice if a security risk is suspected.</p></div>
                <div><h4 className="font-bold mb-1">3. Ownership of Content</h4>
                    <p>You retain ownership of your writing. However, by uploading content you grant WordWeft a worldwide, non-exclusive, royalty-free license to host, store, display, reproduce, distribute, and promote your content for platform operation. This license ends when content is deleted except for backups, legal compliance, and cached data.</p></div>
                <div><h4 className="font-bold mb-1">4. Content Storage & Removal</h4>
                    <p>We may compress media, reformat text, cache chapters, and create previews/snippets. We may remove content without notice if it violates rules, law, or platform stability. We are not a permanent storage service — always keep backups.</p></div>
                <div><h4 className="font-bold mb-1">5. Prohibited Content</h4>
                    <p><strong>Illegal:</strong> Copyrighted content you don't own, pirated books/translations/scraped works, real private documents, deepfake impersonations.</p>
                    <p><strong>Harmful:</strong> Terrorism promotion, real-world violence instructions, self-harm encouragement, exploitative sexual content involving minors (zero tolerance).</p>
                    <p><strong>Abuse:</strong> Spam chapters, SEO stuffing, fake engagement farming, bot-generated bulk posting, manipulated ranking attempts.</p></div>
                <div><h4 className="font-bold mb-1">6. Mature / NSFW Content</h4>
                    <p>Allowed only if properly tagged, fictional, consensual (unless clearly fictional narrative context), and no minors involved. We may restrict visibility based on reader filters or legal requirements and reserve the right to geo-restrict content.</p></div>
                <div><h4 className="font-bold mb-1">7. Anti-Spam & Manipulation Policy</h4>
                    <p>You may not artificially inflate reads, use scripts/refresh bots/engagement exchanges, create multiple accounts to boost rankings, or offer rewards for fake engagement. Violations may result in ranking removal, monetization ban, permanent account deletion, and payment forfeiture.</p></div>
                <div><h4 className="font-bold mb-1">8. Comments & Community Conduct</h4>
                    <p>You may not harass or threaten users, post promotional spam, links to malware/scams, or hate speech. We may remove comments or restrict features at our discretion.</p></div>
                <div><h4 className="font-bold mb-1">9. Monetization Rules (Future Feature)</h4>
                    <p>When enabled: earnings may be withheld for fraud investigation, chargebacks may deduct balance, abuse of paywalls leads to permanent ban, we may impose minimum payout thresholds, and taxes are user responsibility. We are not liable for third-party payment processor decisions.</p></div>
                <div><h4 className="font-bold mb-1">10. Algorithm & Discovery</h4>
                    <p>WordWeft uses discovery systems (search, tags, trending). You may not attempt to manipulate visibility through keyword flooding, misleading tagging, or mass coordinated traffic. We may manually adjust discoverability.</p></div>
                <div><h4 className="font-bold mb-1">11. AI Usage Policy</h4>
                    <p>Unless explicitly permitted: fully AI-generated books must be labeled, AI spam publishing is prohibited, AI impersonation of real authors is prohibited, and AI covers may be restricted. We may request proof of authorship.</p></div>
                <div><h4 className="font-bold mb-1">12. Intellectual Property Complaints (DMCA-style)</h4>
                    <p>To report infringement send: proof of ownership, link to content, and identity verification. We may remove content immediately during investigation. False claims may result in account suspension.</p></div>
                <div><h4 className="font-bold mb-1">13. Privacy & Data</h4>
                    <p>We collect usage analytics, reading behavior, and device data. We do NOT sell personal data. We may share data when required by law.</p></div>
                <div><h4 className="font-bold mb-1">14. Service Availability</h4>
                    <p>We may modify features, remove features, suspend service, or perform maintenance. We are not liable for lost drafts or interruptions.</p></div>
                <div><h4 className="font-bold mb-1">15. Termination</h4>
                    <p>We may suspend or terminate accounts for rule violations, legal risk, abuse of systems, or harm to community. No refunds for banned accounts.</p></div>
                <div><h4 className="font-bold mb-1">16. Limitation of Liability</h4>
                    <p>WordWeft is provided "as is". We are not liable for lost income, deleted content, reader reactions, or third-party payment failures. Maximum liability limited to amount paid to WordWeft in last 3 months (if any).</p></div>
                <div><h4 className="font-bold mb-1">17. Indemnification</h4>
                    <p>You agree to indemnify WordWeft against claims arising from your content, copyright violations, or unlawful usage.</p></div>
                <div><h4 className="font-bold mb-1">18. Jurisdiction</h4>
                    <p>These terms are governed under the laws of India.</p></div>
                <div><h4 className="font-bold mb-1">19. Changes to Terms</h4>
                    <p>We may update Terms anytime. Continued use constitutes acceptance.</p></div>
                <div><h4 className="font-bold mb-1">20. Contact</h4>
                    <p>For legal issues: <a href="mailto:wordweftstudio@gmail.com" className="text-accent hover:underline">wordweftstudio@gmail.com</a></p></div>
            </div>
        )
    });

    const showPrivacy = () => setModalContent({
        title: "Privacy Policy",
        content: (
            <div className="space-y-6 text-sm">
                <p className="text-xs text-gray-500">Last Updated: February 15, 2026 · Contact: wordweftstudio@gmail.com</p>
                {/* Shortened privacy content for brevity in file editing */}
                <div><h4 className="font-bold mb-1">1. What Data We Collect</h4>
                    <p><strong>Account:</strong> Username, email, encrypted password, display name, bio, profile image, social links (optional), country (optional). We never store plain text passwords.</p>
                    <p><strong>Usage:</strong> Stories read, chapters opened, reading time, scroll depth, bookmarks, likes, follows, comments, search queries, tags, library shelves, drafts & published content.</p>
                    <p><strong>Technical:</strong> IP address, browser/device type, OS, session timestamps, cookies, crash & performance logs — used only for security, debugging, and abuse prevention.</p>
                    <p><strong>Payments (Future):</strong> Handled by third-party processors. We do NOT store card numbers, CVV, or bank credentials. We may store transaction ID, payout amount, and tax info if required by law.</p>
                    <p><strong>Communications:</strong> Support messages, moderation reports, appeal requests, notifications.</p></div>
                <div><h4 className="font-bold mb-1">2. How We Use Your Data</h4>
                    <p><strong>Platform Operation:</strong> Authentication, saving drafts, syncing progress, libraries, comments.</p>
                    <p><strong>Safety:</strong> Detect spam/bots, prevent fraud, enforce content rules.</p>
                    <p><strong>Improvements:</strong> Performance optimization, bug fixing, feature analytics.</p>
                    <p><strong>Communication:</strong> Security alerts, account notices, optional newsletters.</p>
                    <p className="font-medium">We do NOT sell personal data to advertisers.</p></div>
                <div><h4 className="font-bold mb-1">3. Cookies & Tracking</h4>
                    <p>We use cookies to keep you logged in, remember preferences, prevent spam, and improve speed. You can disable cookies but some features may not work. We do not use cross-site ad tracking cookies.</p></div>
                <div><h4 className="font-bold mb-1">4. Content Visibility & Public Data</h4>
                    <p>Visible to others: username, profile picture, bio, published stories, comments, follower counts. Private data is never publicly displayed.</p></div>
                <div><h4 className="font-bold mb-1">5. Data Sharing</h4>
                    <p><strong>Service Providers:</strong> Hosting, database, email, payment processors — only minimum required data. <strong>Legal:</strong> We may disclose data if required by court order, law enforcement, or legal compliance.</p></div>
                <div><h4 className="font-bold mb-1">6. User Content Responsibility</h4>
                    <p>Content you publish is public. You are responsible for not sharing personal addresses, private contacts, or confidential documents. We are not responsible for data you voluntarily publish.</p></div>
                <div><h4 className="font-bold mb-1">7. Data Retention</h4>
                    <p>Account data: until deletion. Drafts: until deleted. Logs: up to 12 months. Payments: as required by law. Backups: up to 90 days. Deleted content may remain temporarily in backups.</p></div>
                <div><h4 className="font-bold mb-1">8. Account Deletion</h4>
                    <p>You may request deletion anytime. After deletion: profile removed, private data erased, content anonymized or deleted. Some data retained for fraud/legal compliance.</p></div>
                <div><h4 className="font-bold mb-1">9. Security Measures</h4>
                    <p>We use encrypted passwords, HTTPS, access control, abuse detection, and rate limiting. However, no internet service is 100% secure.</p></div>
                <div><h4 className="font-bold mb-1">10. Children's Privacy</h4>
                    <p>Users under 13 are not allowed. If detected: account removed and data deleted. Parents may contact us for removal.</p></div>
                <div><h4 className="font-bold mb-1">11. International Users</h4>
                    <p>Your data may be stored on servers outside your country. By using WordWeft you consent to cross-border data processing.</p></div>
                <div><h4 className="font-bold mb-1">12. Your Rights</h4>
                    <p>You may request: access to your data, correction, deletion, or restriction of processing. Contact: <a href="mailto:wordweftstudio@gmail.com" className="text-accent hover:underline">wordweftstudio@gmail.com</a></p></div>
                <div><h4 className="font-bold mb-1">13. Changes to Policy</h4>
                    <p>We may update this policy anytime. Major changes will be notified. Continued use = acceptance.</p></div>
                <div><h4 className="font-bold mb-1">14. Contact</h4>
                    <p>Contact us at: <a href="mailto:wordweftstudio@gmail.com" className="text-accent hover:underline">wordweftstudio@gmail.com</a></p></div>
            </div>
        )
    });

    const resetForm = (newView: 'login' | 'signup' | 'forgot') => {
        setView(newView);
        setError(null);
        setSuccessMsg(null);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setUsername('');
        setBirthday('');
        setTermsAccepted(false);
        setPrivacyAccepted(false);
    };

    return (
        <div className="ww-auth-page min-h-screen flex items-center justify-center bg-background dark:bg-dark-background p-4 animate-slide-in-bottom">
            <div className="ww-auth-layout">
            <aside className="ww-auth-story">
                <a href="#/" onClick={(e) => { e.preventDefault(); window.location.hash = '/'; }} className="ww-auth-story-brand">
                    <span><WordWeftLogo className="w-9 h-9" /></span><strong>WordWeft</strong>
                </a>
                <div className="ww-auth-story-copy">
                    <span>A place for the story-minded</span>
                    <h1>Read deeply.<br />Write bravely.</h1>
                    <p>Keep your library, reading progress, drafts, characters, and worlds together in one considered space.</p>
                </div>
                <div className="ww-auth-story-points">
                    <div><strong>01</strong><span>Build a library that remembers where you left off.</span></div>
                    <div><strong>02</strong><span>Write beside your characters, scenes, and story notes.</span></div>
                    <div><strong>03</strong><span>Publish into a reader designed for long-form fiction.</span></div>
                </div>
            </aside>
            <div className="ww-auth-form-shell w-full max-w-md">
                <a href="#/" onClick={(e) => { e.preventDefault(); window.location.hash = '/'; }} className="ww-auth-mobile-logo flex justify-center mb-6">
                    <WordWeftLogo className="w-20 h-20 md:w-24 md:h-24" />
                </a>
                <div className="ww-auth-card relative bg-surface dark:bg-dark-surface rounded-3xl shadow-lifted p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <button
                        onClick={() => window.location.hash = '/'}
                        className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-surface-alt transition-colors"
                        aria-label="Close"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>

                    {view === 'forgot' && (
                        <button onClick={() => resetForm('login')} className="absolute top-4 left-4 p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-surface-alt transition-colors">
                            <ArrowLeftIcon className="w-6 h-6" />
                        </button>
                    )}

                    <h2 className="text-3xl font-bold text-center text-text-rich dark:text-dark-text-rich mb-2 font-sans">
                        {view === 'login' && 'Welcome Back'}
                        {view === 'signup' && 'Create Account'}
                        {view === 'forgot' && 'Reset Password'}
                        {view === 'otp' && 'Verify Email'}
                    </h2>
                    <p className="text-center text-text-body dark:text-dark-text-body mb-8">
                        {view === 'login' && "Sign in to continue your journey."}
                        {view === 'signup' && "Join our community of readers and writers."}
                        {view === 'forgot' && "Enter your email to receive a reset link."}
                        {view === 'otp' && "We've sent a 6-digit code to your email."}
                    </p>

                    {(view === 'login' || view === 'signup') && (
                        <>
                            {/* Google Sign-in Button Container */}
                            <div className="w-full flex justify-center h-11 mb-2">
                                <div ref={googleButtonRef} className="w-full overflow-hidden rounded-xl"></div>
                            </div>

                            <div className="flex items-center my-6">
                                <div className="flex-grow border-t border-gray-200 dark:border-dark-border"></div>
                                <span className="flex-shrink mx-4 text-xs text-gray-400 dark:text-gray-500 font-sans uppercase">Or continue with Email</span>
                                <div className="flex-grow border-t border-gray-200 dark:border-dark-border"></div>
                            </div>
                        </>
                    )}

                    <form onSubmit={handleAuthAction} className="space-y-4">
                        {view === 'signup' && (
                            <>
                                <InputField id="username" label="Username" type="text" placeholder="e.g., JaneDoe" value={username} onChange={e => setUsername(e.target.value)} />
                                <ModernBirthdaySelector 
                                    value={birthday}
                                    onChange={(newVal: string) => setBirthday(newVal)}
                                />
                            </>
                        )}

                        {view !== 'otp' && (
                            <InputField id="email" label="Email Address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                        )}

                        {view === 'otp' && (
                            <div className="text-center mb-6">
                                <div className="w-full flex justify-center mb-4">
                                     <InputField
                                        id="otp"
                                        label="Verification Code"
                                        type="text"
                                        placeholder="······"
                                        value={otp}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').substring(0, 6);
                                            setOtp(val);
                                        }}
                                        required={true}
                                    />
                                </div>
                                <button 
                                    type="button" 
                                    disabled={otpResendCooldown > 0 || isLoading}
                                    onClick={handleResendOtp}
                                    className={`text-sm font-semibold transition-colors ${otpResendCooldown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-accent hover:underline'}`}
                                >
                                    {otpResendCooldown > 0 ? `Resend code in ${otpResendCooldown}s` : 'Resend Code'}
                                </button>
                            </div>
                        )}

                        {(view === 'login' || view === 'signup') && (
                            <InputField
                                id="password"
                                label="Password"
                                type="password"
                                placeholder={view === 'login' ? "••••••••" : "Create a password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required={true}
                                onFocus={() => setIsPasswordFocused(true)}
                                onBlur={() => setIsPasswordFocused(false)}
                            >
                                <PasswordRequirements password={password} isVisible={isPasswordFocused && view === 'signup'} />
                            </InputField>
                        )}

                        {view === 'login' && (
                            <div className="flex justify-end">
                                <button type="button" onClick={() => resetForm('forgot')} className="text-xs font-semibold text-accent hover:underline">
                                    Forgot Password?
                                </button>
                            </div>
                        )}

                        {view === 'signup' && (
                            <>
                                <InputField
                                    id="confirmPassword"
                                    label="Confirm Password"
                                    type="password"
                                    placeholder="Re-enter password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required={true}
                                />
                                <div className="space-y-3 pt-2">
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={termsAccepted}
                                            onChange={e => setTermsAccepted(e.target.checked)}
                                            className="mt-1 w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
                                            required
                                        />
                                        <span className="text-sm text-text-body dark:text-dark-text-body font-sans">
                                            I agree to the <button type="button" onClick={showTerms} className="text-accent font-semibold hover:underline">Terms and Conditions</button>
                                        </span>
                                    </label>
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={privacyAccepted}
                                            onChange={e => setPrivacyAccepted(e.target.checked)}
                                            className="mt-1 w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
                                            required
                                        />
                                        <span className="text-sm text-text-body dark:text-dark-text-body font-sans">
                                            I accept the <button type="button" onClick={showPrivacy} className="text-accent font-semibold hover:underline">Privacy Policy</button>
                                        </span>
                                    </label>
                                </div>
                            </>
                        )}

                        {error && <p className="text-center text-xs text-danger font-sans pt-2 leading-tight">{error}</p>}
                        {successMsg && <p className="text-center text-xs text-success font-sans pt-2 leading-tight font-semibold">{successMsg}</p>}

                        <button type="submit" disabled={isLoading || (view === 'otp' && otp.length !== 6)} className="w-full bg-accent text-white font-sans font-semibold h-12 rounded-xl hover:bg-primary transition-transform hover:scale-105 duration-300 shadow-lg !mt-6 disabled:bg-gray-400 disabled:scale-100">
                            {isLoading ? 'Processing...' : (
                                view === 'login' ? 'Sign In' :
                                    view === 'signup' ? 'Create Account' :
                                        view === 'otp' ? 'Verify' :
                                        'Send Reset Link'
                            )}
                        </button>
                    </form>

                    {(view === 'login' || view === 'signup') && (
                        <p className="text-center text-sm text-text-body dark:text-dark-text-body mt-8">
                            {view === 'login' ? "Don't have an account?" : "Already have an account?"}
                            <button
                                onClick={() => resetForm(view === 'login' ? 'signup' : 'login')}
                                className="font-semibold text-accent hover:underline ml-1"
                            >
                                {view === 'login' ? 'Sign Up' : 'Sign In'}
                            </button>
                        </p>
                    )}
                </div>
            </div>
            </div>

            <LegalModal
                isOpen={!!modalContent}
                onClose={() => setModalContent(null)}
                title={modalContent?.title || ''}
                content={modalContent?.content}
            />

            {/* Profile Completion Modal for New Google Users */}
            {showGoogleProfileModal && pendingGoogleUser && (
                <GoogleProfileCompletion
                    user={pendingGoogleUser}
                    onComplete={handleGoogleProfileComplete}
                    onCancel={() => {
                        api.logout(); // Logout if they cancel the mandatory step
                        setShowGoogleProfileModal(false);
                        setPendingGoogleUser(null);
                        setError("Signup cancelled. You must provide a username to complete registration.");
                    }}
                />
            )}
        </div>
    );
};
