
import React, { useRef, useState } from 'react';
import type { NavigateTo, User } from '../types';
import { GoogleIcon, XMarkIcon } from '../components/icons/Icons';
import { sampleUsers } from '../constants';

interface AuthPageProps {
  navigateTo: NavigateTo;
  onLogin: (user: User) => void;
}

const InputField: React.FC<{ 
    id: string; 
    label: string; 
    type: string; 
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
    maxLength?: number;
}> = ({ id, label, type, placeholder, value, onChange, onFocus, onBlur, onMouseEnter, onMouseLeave, inputMode, maxLength }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">
            {label}
        </label>
        <input
            type={type}
            id={id}
            placeholder={placeholder}
            className="w-full h-11 px-4 rounded-xl font-sans text-base border-gray-300 shadow-sm focus:ring-accent focus:border-accent transition-all duration-300 dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich"
            required
            value={value}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            inputMode={inputMode}
            maxLength={maxLength}
        />
    </div>
);

export const AuthPage: React.FC<AuthPageProps> = ({ navigateTo, onLogin }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [birthday, setBirthday] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [showPasswordHint, setShowPasswordHint] = useState(false);
  const calendarInputRef = useRef<HTMLInputElement | null>(null);

  const today = new Date();
  const minDateObj = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
  const maxDateObj = new Date(today.getFullYear() - 8, today.getMonth(), today.getDate());
  const toIso = (d: Date) => d.toISOString().slice(0, 10); // yyyy-MM-dd
  const minDate = toIso(minDateObj);
  const maxDate = toIso(maxDateObj);

  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,10}$/;
  const passwordInvalid =
    !isLoginView &&
    (password.length > 0 || confirmPassword.length > 0) &&
    !passwordPattern.test(password);
  const parseDob = (text: string) => {
    const m = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) return null;
    const dd = Number(m[1]);
    const mm = Number(m[2]) - 1; // zero-based
    const yyyy = Number(m[3]);
    const d = new Date(yyyy, mm, dd);
    if (d.getFullYear() !== yyyy || d.getMonth() !== mm || d.getDate() !== dd) return null;
    return d;
  };

  const birthdayValid = (() => {
    if (isLoginView) return true;
    if (birthday.length === 0) return false;
    const d = parseDob(birthday);
    if (!d) return false;
    if (d < minDateObj || d > maxDateObj) return false;
    return true;
  })();
  const passwordsMismatch =
    !isLoginView && confirmPassword.length > 0 && password !== confirmPassword;

  const formatDob = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8); // ddMMyyyy
    const parts: string[] = [];
    if (digits.length >= 2) parts.push(digits.slice(0, 2));
    else if (digits.length > 0) parts.push(digits);
    if (digits.length >= 4) parts.push(digits.slice(2, 4));
    else if (digits.length > 2) parts.push(digits.slice(2));
    if (digits.length > 4) parts.push(digits.slice(4));
    return parts.join('-');
  };

  const handleAuthAction = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isLoginView) {
      // Mock login for multiple users. In a real app, this would be an API call.
      const user = sampleUsers.find(u => u.email === email);
      if (user && password === 'password') {
        onLogin(user);
      } else {
        setError('Invalid email or password.');
      }
    } else {
      if (!birthdayValid) {
        setError('Please enter your birthday as dd-MM-yyyy (age 8-100).');
        return;
      }
      if (passwordInvalid) {
        setError('Password must be 8-10 chars with upper, lower, number, special character.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (!acceptedTerms || !acceptedPrivacy) {
        setError('Please accept the Terms & Conditions and Privacy Policy to continue.');
        return;
      }
      // In a real app, this would register the user. For this demo, we'll just log in with the first user.
      onLogin(sampleUsers[0]);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark:bg-dark-background p-4 animate-slide-in-bottom">
      <div className="w-full max-w-md">
         <a href="#/" onClick={(e) => { e.preventDefault(); navigateTo({ name: 'home' })}} className="font-sans font-bold text-3xl text-primary dark:text-gray-100 tracking-tighter text-center block mb-6">
            WordWeft
          </a>
        <div className="relative bg-surface dark:bg-dark-surface rounded-3xl shadow-lifted p-8">
            <button 
              onClick={() => navigateTo({ name: 'home' })} 
              className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-surface-alt transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <h2 className="text-3xl font-bold text-center text-text-rich dark:text-dark-text-rich mb-2 font-sans">
            {isLoginView ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-center text-text-body dark:text-dark-text-body mb-8">
            {isLoginView ? "Sign in to continue your journey." : "Join our community of readers and writers."}
            </p>
            
            <button className="w-full flex items-center justify-center gap-3 h-11 px-4 rounded-xl font-sans font-semibold border border-gray-300 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface-alt transition-colors">
                <GoogleIcon className="w-5 h-5" />
                <span>Sign {isLoginView ? 'in' : 'up'} with Google</span>
            </button>
            
            <div className="flex items-center my-6">
            <div className="flex-grow border-t border-gray-200 dark:border-dark-border"></div>
            <span className="flex-shrink mx-4 text-xs text-gray-400 dark:text-gray-500 font-sans uppercase">Or</span>
            <div className="flex-grow border-t border-gray-200 dark:border-dark-border"></div>
            </div>
            
            <form onSubmit={handleAuthAction} className="space-y-4">
                {!isLoginView && (
                    <>
                        <InputField id="username" label="Username" type="text" placeholder="e.g., JaneDoe" value={username} onChange={e => setUsername(e.target.value)} />
                        <div>
                          <InputField
                            id="birthday"
                            label="Date of Birth"
                            type="text"
                            placeholder="dd-MM-yyyy"
                            value={birthday}
                            onChange={(e) => setBirthday(formatDob(e.target.value))}
                            inputMode="numeric"
                            maxLength={10}
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => calendarInputRef.current?.showPicker?.()}
                              className="text-sm text-accent hover:underline font-semibold"
                            >
                              Pick from calendar
                            </button>
                            <input
                              ref={calendarInputRef}
                              type="date"
                              className="sr-only"
                              min={minDate}
                              max={maxDate}
                              onChange={(e) => {
                                const iso = e.target.value; // yyyy-MM-dd
                                if (!iso) return;
                                const [y, m, d] = iso.split('-');
                                setBirthday(`${d}-${m}-${y}`);
                              }}
                            />
                            <span className="text-xs text-text-body dark:text-dark-text-body">
                              Age range: 8 - 100
                            </span>
                          </div>
                          {birthday.length > 0 && !birthdayValid && (
                            <p className="mt-2 text-sm text-danger font-sans">
                              Date of birth must be dd-MM-yyyy and age must be between 8 and 100.
                            </p>
                          )}
                        </div>
                    </>
                )}
                <InputField id="email" label="Email Address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <InputField
                  id="password"
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => !isLoginView && setShowPasswordHint(true)}
                  onBlur={() => setShowPasswordHint(false)}
                  onMouseEnter={() => !isLoginView && setShowPasswordHint(true)}
                  onMouseLeave={() => setShowPasswordHint(false)}
                />
                {!isLoginView && showPasswordHint && (
                  <div className="mt-2 text-xs sm:text-sm text-text-body dark:text-dark-text-body bg-surface dark:bg-dark-surface-alt border border-[#D7CCC8] dark:border-dark-border rounded-lg p-3 shadow-soft">
                    <p className="font-sans font-semibold mb-1 text-text-rich dark:text-dark-text-rich">
                      Password requirements
                    </p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>8–10 characters long</li>
                      <li>At least one uppercase letter (A–Z)</li>
                      <li>At least one lowercase letter (a–z)</li>
                      <li>At least one number (0–9)</li>
                      <li>At least one special character (@ $ ! % * ? &)</li>
                    </ul>
                  </div>
                )}
                {(!isLoginView && passwordInvalid) && (
                  <p className="mt-2 text-sm text-danger font-sans">
                    Password must be 8-10 characters and include uppercase, lowercase, number, and special character.
                  </p>
                )}
                {!isLoginView && (
                  <div>
                    <InputField
                      id="confirm-password"
                      label="Confirm Password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {passwordsMismatch && (
                      <p className="mt-2 text-sm text-danger font-sans">
                        Passwords do not match.
                      </p>
                    )}
                  </div>
                )}

                {!isLoginView && (
                  <div className="space-y-3 pt-2">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        required
                      />
                      <span className="text-sm text-text-body dark:text-dark-text-body">
                        I accept the{' '}
                        <a
                          href="#/terms"
                          onClick={(evt) => { evt.preventDefault(); window.location.hash = '/terms'; navigateTo({ name: 'terms' }); }}
                          className="font-semibold text-accent hover:underline"
                        >
                          Terms & Conditions
                        </a>
                        .
                      </span>
                    </label>
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                        checked={acceptedPrivacy}
                        onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                        required
                      />
                      <span className="text-sm text-text-body dark:text-dark-text-body">
                        I have read the{' '}
                        <a
                          href="#/privacy"
                          onClick={(evt) => { evt.preventDefault(); window.location.hash = '/privacy'; navigateTo({ name: 'privacy' }); }}
                          className="font-semibold text-accent hover:underline"
                        >
                          Privacy Policy
                        </a>
                        .
                      </span>
                    </label>
                  </div>
                )}

                {error && <p className="text-center text-sm text-danger font-sans pt-2">{error}</p>}
            
                <button
                  type="submit"
                  className="w-full bg-accent text-white font-sans font-semibold h-12 rounded-xl hover:bg-primary transition-transform hover:scale-105 duration-300 shadow-lg !mt-6 disabled:opacity-60 disabled:hover:scale-100"
                  disabled={
                    !isLoginView &&
                    (
                      !acceptedTerms ||
                      !acceptedPrivacy ||
                      !birthdayValid ||
                      passwordInvalid ||
                      password.length === 0 ||
                      confirmPassword.length === 0 ||
                      password !== confirmPassword
                    )
                  }
                >
                    {isLoginView ? 'Sign In' : 'Create Account'}
                </button>
            </form>
            
            <p className="text-center text-sm text-text-body dark:text-dark-text-body mt-8">
                {isLoginView ? "Don't have an account?" : "Already have an account?"}
                <button 
                    onClick={() => {
                        setIsLoginView(!isLoginView);
                        setError(null);
                        setAcceptedTerms(false);
                        setAcceptedPrivacy(false);
                    }} 
                    className="font-semibold text-accent hover:underline ml-1"
                >
                    {isLoginView ? 'Sign Up' : 'Sign In'}
                </button>
            </p>
        </div>
      </div>
    </div>
  );
};
