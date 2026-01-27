
import React, { useState } from 'react';
import type { User } from '../types';
import { GoogleIcon, XMarkIcon, CheckCircleIcon, ArrowLeftIcon, EyeIcon, EyeSlashIcon } from '../components/icons/Icons';
import * as api from '../api/client';

interface AuthPageProps {
    onLogin: (user: User) => void;
}

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

export const InputField: React.FC<{
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
}> = ({ id, label, type, placeholder, value, onChange, required = true, min, max, helpText, onFocus, onBlur, children }) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const isPasswordType = type === 'password';
    const inputType = isPasswordType ? (isPasswordVisible ? 'text' : 'password') : type;

    return (
        <div className="relative">
            <label htmlFor={id} className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">
                {label}
            </label>
            {children}
            <div className="relative">
                <input
                    type={inputType}
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
                {isPasswordType && (
                    <button
                        type="button"
                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                    >
                        {isPasswordVisible ? (
                            <EyeSlashIcon className="w-5 h-5" />
                        ) : (
                            <EyeIcon className="w-5 h-5" />
                        )}
                    </button>
                )}
            </div>
            {helpText && <p className="mt-1 text-[10px] text-gray-500 font-sans leading-tight">{helpText}</p>}
        </div>
    );
};

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
    const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');
    const [birthday, setBirthday] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [modalContent, setModalContent] = useState<{ title: string; content: React.ReactNode } | null>(null);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

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

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);
        setIsLoading(true);

        try {
            if (view === 'login') {
                const user = await api.login(email, password);
                if (user) {
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
                if (age < 8 || age > 100) throw new Error("You must be between 8 and 100 years old to join WordWeft.");
                if (!termsAccepted || !privacyAccepted) throw new Error("Please accept the Terms and Privacy Policy.");

                const newUser = await api.signup(username, email, password);
                onLogin(newUser);
            } else if (view === 'forgot') {
                const msg = await api.forgotPassword(email);
                setSuccessMsg(msg);
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const showTerms = () => setModalContent({
        title: "Terms and Conditions",
        content: (
            <div className="space-y-4">
                <p>Welcome to WordWeft. By using our services, you agree to these terms.</p>
                <h4 className="font-bold">1. Content Ownership</h4>
                <p>Authors retain full ownership of their intellectual property. WordWeft is granted a non-exclusive license to host and distribute the content on the platform.</p>
                <h4 className="font-bold">2. User Conduct</h4>
                <p>Users must not upload harmful, illegal, or abusive content. We reserve the right to remove content that violates our community guidelines.</p>
                <h4 className="font-bold">3. Account Safety</h4>
                <p>You are responsible for maintaining the confidentiality of your account credentials.</p>
                <p>Last updated: June 2024.</p>
            </div>
        )
    });

    const showPrivacy = () => setModalContent({
        title: "Privacy Policy",
        content: (
            <div className="space-y-4">
                <p>Your privacy is paramount to us at WordWeft.</p>
                <h4 className="font-bold">1. Data Collection</h4>
                <p>We collect minimal data: your email for authentication, and your reading progress to sync your experience across devices.</p>
                <h4 className="font-bold">2. Data Usage</h4>
                <p>We do not sell your personal information to third parties. We use cookies only for essential session management.</p>
                <h4 className="font-bold">3. Rights</h4>
                <p>You have the right to request a copy of your data or its permanent deletion at any time.</p>
                <p>Last updated: June 2024.</p>
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
        <div className="min-h-screen flex items-center justify-center bg-background dark:bg-dark-background p-4 animate-slide-in-bottom">
            <div className="w-full max-w-md">
                <a href="#/" onClick={(e) => { e.preventDefault(); window.location.hash = '/'; }} className="font-sans font-bold text-3xl text-primary dark:text-gray-100 tracking-tighter text-center block mb-6">
                    WordWeft
                </a>
                <div className="relative bg-surface dark:bg-dark-surface rounded-3xl shadow-lifted p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
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
                    </h2>
                    <p className="text-center text-text-body dark:text-dark-text-body mb-8">
                        {view === 'login' && "Sign in to continue your journey."}
                        {view === 'signup' && "Join our community of readers and writers."}
                        {view === 'forgot' && "Enter your email to receive a reset link."}
                    </p>

                    {view !== 'forgot' && (
                        <>
                            <button className="w-full flex items-center justify-center gap-3 h-11 px-4 rounded-xl font-sans font-semibold border border-gray-300 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface-alt transition-colors">
                                <GoogleIcon className="w-5 h-5" />
                                <span>Sign {view === 'login' ? 'in' : 'up'} with Google</span>
                            </button>

                            <div className="flex items-center my-6">
                                <div className="flex-grow border-t border-gray-200 dark:border-dark-border"></div>
                                <span className="flex-shrink mx-4 text-xs text-gray-400 dark:text-gray-500 font-sans uppercase">Or</span>
                                <div className="flex-grow border-t border-gray-200 dark:border-dark-border"></div>
                            </div>
                        </>
                    )}

                    <form onSubmit={handleAuthAction} className="space-y-4">
                        {view === 'signup' && (
                            <>
                                <InputField id="username" label="Username" type="text" placeholder="e.g., JaneDoe" value={username} onChange={e => setUsername(e.target.value)} />
                                <InputField
                                    id="birthday"
                                    label="Birthday"
                                    type="date"
                                    placeholder=""
                                    value={birthday}
                                    onChange={e => setBirthday(e.target.value)}
                                />
                            </>
                        )}

                        <InputField id="email" label="Email Address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />

                        {view !== 'forgot' && (
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

                        <button type="submit" disabled={isLoading} className="w-full bg-accent text-white font-sans font-semibold h-12 rounded-xl hover:bg-primary transition-transform hover:scale-105 duration-300 shadow-lg !mt-6 disabled:bg-gray-400 disabled:scale-100">
                            {isLoading ? 'Processing...' : (
                                view === 'login' ? 'Sign In' :
                                    view === 'signup' ? 'Create Account' :
                                        'Send Reset Link'
                            )}
                        </button>
                    </form>

                    {view !== 'forgot' && (
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

            <LegalModal
                isOpen={!!modalContent}
                onClose={() => setModalContent(null)}
                title={modalContent?.title || ''}
                content={modalContent?.content}
            />
        </div>
    );
};
