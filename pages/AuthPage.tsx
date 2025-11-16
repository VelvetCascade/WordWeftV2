
import React, { useState } from 'react';
import type { User } from '../types';
import { GoogleIcon, XMarkIcon } from '../components/icons/Icons';
import * as api from '../api/client';

interface AuthPageProps {
  onLogin: (user: User) => void;
}

const InputField: React.FC<{ 
    id: string; 
    label: string; 
    type: string; 
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
}> = ({ id, label, type, placeholder, value, onChange, required = true }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">
            {label}
        </label>
        <input
            type={type}
            id={id}
            placeholder={placeholder}
            className="w-full h-11 px-4 rounded-xl font-sans text-base border-gray-300 shadow-sm focus:ring-accent focus:border-accent transition-all duration-300 dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich"
            required={required}
            value={value}
            onChange={onChange}
        />
    </div>
);

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
        if (isLoginView) {
            const user = await api.login(email, password);
            if (user) {
                onLogin(user);
            }
        } else {
            const newUser = await api.signup(username, email);
            onLogin(newUser);
        }
    } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark:bg-dark-background p-4 animate-slide-in-bottom">
      <div className="w-full max-w-md">
         <a href="#/" onClick={(e) => { e.preventDefault(); window.location.hash = '/'; }} className="font-sans font-bold text-3xl text-primary dark:text-gray-100 tracking-tighter text-center block mb-6">
            WordWeft
          </a>
        <div className="relative bg-surface dark:bg-dark-surface rounded-3xl shadow-lifted p-8">
            <button 
              onClick={() => window.location.hash = '/'} 
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
                    <InputField id="username" label="Username" type="text" placeholder="e.g., JaneDoe" value={username} onChange={e => setUsername(e.target.value)} />
                )}
                <InputField id="email" label="Email Address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <InputField 
                    id="password" 
                    label="Password" 
                    type="password" 
                    placeholder={isLoginView ? "••••••••" : "Create a password (use 'password')"} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required={isLoginView} // Password not needed for mock signup
                />

                {error && <p className="text-center text-sm text-danger font-sans pt-2">{error}</p>}
            
                <button type="submit" disabled={isLoading} className="w-full bg-accent text-white font-sans font-semibold h-12 rounded-xl hover:bg-primary transition-transform hover:scale-105 duration-300 shadow-lg !mt-6 disabled:bg-gray-400 disabled:scale-100">
                    {isLoading ? 'Processing...' : (isLoginView ? 'Sign In' : 'Create Account')}
                </button>
            </form>
            
            <p className="text-center text-sm text-text-body dark:text-dark-text-body mt-8">
                {isLoginView ? "Don't have an account?" : "Already have an account?"}
                <button 
                    onClick={() => {
                        setIsLoginView(!isLoginView);
                        setError(null);
                        setEmail('');
                        setPassword('');
                        setUsername('');
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
