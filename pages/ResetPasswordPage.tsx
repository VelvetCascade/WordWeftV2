
import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon } from '../components/icons/Icons';
import { WordWeftLogo } from '../components/icons/WordWeftLogo';
import * as api from '../api/client';
import { useAnalytics } from '../contexts/AnalyticsContext';

interface ResetPasswordPageProps {
    token: string;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ token }) => {
    const { trackEvent } = useAnalytics();
    useEffect(() => { trackEvent('auth', 'reset_password_view'); }, []);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const validatePassword = (pw: string) => {
        const hasLength = pw.length >= 8 && pw.length <= 64;
        const hasUpper = /[A-Z]/.test(pw);
        const hasLower = /[a-z]/.test(pw);
        const hasNumber = /\d/.test(pw);
        const hasSpecial = /[@$!%*?&]/.test(pw);
        return hasLength && hasUpper && hasLower && hasNumber && hasSpecial;
    };

    const requirements = [
        { label: "8-64 characters", valid: newPassword.length >= 8 && newPassword.length <= 64 },
        { label: "One uppercase letter", valid: /[A-Z]/.test(newPassword) },
        { label: "One lowercase letter", valid: /[a-z]/.test(newPassword) },
        { label: "One number", valid: /\d/.test(newPassword) },
        { label: "One special char (@ $ ! % * ? &)", valid: /[@$!%*?&]/.test(newPassword) },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!validatePassword(newPassword)) {
            setError("Password does not meet the requirements.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsLoading(true);
        try {
            await api.resetPassword(token, newPassword);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Failed to reset password. The link may have expired.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background dark:bg-dark-background p-4 animate-slide-in-bottom">
            <div className="w-full max-w-md">
                <a href="/" onClick={(e) => { e.preventDefault(); window.location.hash = '/'; }} className="flex justify-center mb-6">
                    <WordWeftLogo className="w-20 h-20 md:w-24 md:h-24" />
                </a>
                <div className="bg-surface dark:bg-dark-surface rounded-3xl shadow-lifted p-8">
                    <button
                        onClick={() => window.location.hash = '/auth'}
                        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-surface-alt transition-colors mb-4"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>

                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircleIcon className="w-8 h-8 text-success" />
                            </div>
                            <h2 className="text-2xl font-bold text-text-rich dark:text-dark-text-rich mb-2 font-sans">
                                Password Reset!
                            </h2>
                            <p className="text-text-body dark:text-dark-text-body mb-6">
                                Your password has been updated successfully. You can now sign in with your new password.
                            </p>
                            <button
                                onClick={() => window.location.hash = '/auth'}
                                className="bg-accent text-white font-sans font-semibold px-8 py-3 rounded-xl hover:bg-primary transition-colors"
                            >
                                Sign In
                            </button>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-3xl font-bold text-center text-text-rich dark:text-dark-text-rich mb-2 font-sans">
                                Create New Password
                            </h2>
                            <p className="text-center text-text-body dark:text-dark-text-body mb-8">
                                Enter your new password below.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="relative">
                                    <label htmlFor="newPassword" className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">
                                        New Password
                                    </label>

                                    {/* Password Requirements Tooltip */}
                                    {isPasswordFocused && (
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
                                    )}

                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            id="newPassword"
                                            placeholder="Create a new password"
                                            className="w-full h-11 px-4 pr-11 rounded-xl font-sans text-base border-gray-300 shadow-sm focus:ring-accent focus:border-accent transition-all duration-300 dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich"
                                            required
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            onFocus={() => setIsPasswordFocused(true)}
                                            onBlur={() => setIsPasswordFocused(false)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showNewPassword ? (
                                                <EyeSlashIcon className="w-5 h-5" />
                                            ) : (
                                                <EyeIcon className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            id="confirmPassword"
                                            placeholder="Re-enter your new password"
                                            className="w-full h-11 px-4 pr-11 rounded-xl font-sans text-base border-gray-300 shadow-sm focus:ring-accent focus:border-accent transition-all duration-300 dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich"
                                            required
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showConfirmPassword ? (
                                                <EyeSlashIcon className="w-5 h-5" />
                                            ) : (
                                                <EyeIcon className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {error && <p className="text-center text-xs text-danger font-sans pt-2 leading-tight">{error}</p>}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-accent text-white font-sans font-semibold h-12 rounded-xl hover:bg-primary transition-transform hover:scale-105 duration-300 shadow-lg !mt-6 disabled:bg-gray-400 disabled:scale-100"
                                >
                                    {isLoading ? 'Resetting...' : 'Reset Password'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
