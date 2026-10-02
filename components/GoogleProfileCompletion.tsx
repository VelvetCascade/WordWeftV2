import '../styles/account-v2.css';
import { useDialog } from '../hooks/useDialog';
import { ModernBirthdaySelector } from './ModernBirthdaySelector';
import React, { useState } from 'react';
import * as api from '../api/client';
import type { User } from '../types';
import { Book, User as UserIcon } from 'lucide-react';

interface GoogleProfileCompletionProps {
    user: User;
    onComplete: (user: User) => void;
    onCancel: () => void;
}

export function GoogleProfileCompletion({ user, onComplete, onCancel }: GoogleProfileCompletionProps) {
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [birthday, setBirthday] = useState('');
    const [accepted, setAccepted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const dialogRef = useDialog(true, onCancel, !isLoading);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (username.length < 3) {
            setError('Username must be at least 3 characters long');
            return;
        }

        const birthDate = new Date(`${birthday}T00:00:00`);
        const today = new Date();
        const minimumAgeDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
        if (!birthday || !Number.isFinite(birthDate.getTime()) || birthDate > minimumAgeDate) {
            setError('You must be at least 13 years old to join WordWeft. Please enter your birthday.');
            return;
        }
        if (!accepted) { setError('Please accept the Terms and Privacy Policy to continue.'); return; }
        setIsLoading(true);
        try {
            const updatedUser = await api.updateUserProfile(user.id, { name: username, bio, dateOfBirth: birthday });
            onComplete(updatedUser);
        } catch (err: any) {
            setError(err.message || 'Failed to update profile. Username might be taken.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="account-v2-dialog fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="google-profile-heading" className="bg-surface dark:bg-dark-surface ww-google-completion rounded-2xl p-8 max-w-md w-full shadow-2xl relative border border-primary/20 dark:border-dark-border animate-slide-in-bottom">

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary dark:text-dark-text-rich">
                        <Book className="w-8 h-8" />
                    </div>
                    <h2 id="google-profile-heading" className="text-2xl font-bold font-serif text-text-rich dark:text-dark-text-rich mb-2">
                        Make yourself at home
                    </h2>
                    <p className="text-text-body dark:text-dark-text-body">
                        You're almost there. Please choose a username to complete your profile.
                    </p>
                </div>

                {error && (
                    <div role="alert" className="mb-6 p-4 bg-danger/10 border border-danger/20 text-danger rounded-xl text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="google-profile-name" className="block text-sm font-medium text-text-rich dark:text-dark-text-rich mb-1">
                            Choose a Username <span className="text-danger">*</span>
                        </label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-body/50" />
                            <input
                                id="google-profile-name"
                                autoComplete="username"
                                maxLength={20}
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-primary/20 dark:border-dark-border bg-background dark:bg-dark-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-text-rich dark:text-dark-text-rich placeholder-text-body/50"
                                placeholder="creative_writer42"
                            />
                        </div>
                        <p className="text-xs text-text-body mt-2">3–20 letters, numbers, or underscores.</p>
                    </div>

                    <div>
                        <label htmlFor="google-profile-bio" className="block text-sm font-medium text-text-rich dark:text-dark-text-rich mb-1">
                            Short Bio (Optional)
                        </label>
                        <textarea
                            id="google-profile-bio"
                            maxLength={1000}
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-primary/20 dark:border-dark-border bg-background dark:bg-dark-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-text-rich dark:text-dark-text-rich placeholder-text-body/50 h-24 resize-none"
                            placeholder="Tell others a bit about your writing..."
                        />
                    </div>

                    <ModernBirthdaySelector value={birthday} onChange={setBirthday} />
                    <label className="flex items-start gap-3 text-sm"><input type="checkbox" required checked={accepted} onChange={event => setAccepted(event.target.checked)} className="mt-1" /><span>I agree to the <a href="/terms" target="_blank" rel="noreferrer" className="underline">Terms</a> and <a href="/privacy" target="_blank" rel="noreferrer" className="underline">Privacy Policy</a>.</span></label>
                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isLoading}
                            className="px-6 py-3 rounded-xl font-medium text-text-body hover:bg-primary/5 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || username.length < 3}
                            className="flex-1 bg-primary text-surface py-3 rounded-xl font-medium hover:bg-primary/90 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                        >
                            {isLoading ? 'Saving...' : 'Complete Profile'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
