
import React, { useState } from 'react';
import type { NavigateTo } from '../types';
import { GoogleIcon, XMarkIcon } from '../components/icons/Icons';

interface AuthPageProps {
  navigateTo: NavigateTo;
  onLogin: () => void;
}

const InputField: React.FC<{ id: string; label: string; type: string; placeholder: string;}> = ({ id, label, type, placeholder }) => (
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
        />
    </div>
);

export const AuthPage: React.FC<AuthPageProps> = ({ navigateTo, onLogin }) => {
  const [isLoginView, setIsLoginView] = useState(true);

  const handleAuthAction = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would call an API with form data
    onLogin();
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
                        <InputField id="username" label="Username" type="text" placeholder="e.g., JaneDoe" />
                        <InputField id="birthday" label="Birthday" type="date" placeholder="" />
                    </>
                )}
                <InputField id="email" label="Email Address" type="email" placeholder="you@example.com" />
                <InputField id="password" label="Password" type="password" placeholder="••••••••" />
            
                <button type="submit" className="w-full bg-accent text-white font-sans font-semibold h-12 rounded-xl hover:bg-purple-700 transition-transform hover:scale-105 duration-300 shadow-lg mt-2">
                    {isLoginView ? 'Sign In' : 'Create Account'}
                </button>
            </form>
            
            <p className="text-center text-sm text-text-body dark:text-dark-text-body mt-8">
                {isLoginView ? "Don't have an account?" : "Already have an account?"}
                <button onClick={() => setIsLoginView(!isLoginView)} className="font-semibold text-accent hover:underline ml-1">
                    {isLoginView ? 'Sign Up' : 'Sign In'}
                </button>
            </p>
        </div>
      </div>
    </div>
  );
};