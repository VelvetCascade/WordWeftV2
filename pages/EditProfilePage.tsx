
import React, { useState } from 'react';
import type { User } from '../types';
import { ArrowLeftIcon } from '../components/icons/Icons';

interface EditProfilePageProps {
  user: User;
  onUpdateProfile: (updatedData: Partial<User>) => void;
}

export const EditProfilePage: React.FC<EditProfilePageProps> = ({ user, onUpdateProfile }) => {
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);


  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({ name, avatarUrl });
    // Navigation back to profile is handled in App.tsx's onUpdateProfile via hash change
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword || !confirmPassword) {
        setPasswordError("Please fill in both password fields.");
        return;
    }
    if (newPassword.length < 8) {
        setPasswordError("Password must be at least 8 characters long.");
        return;
    }
    if (newPassword !== confirmPassword) {
        setPasswordError("New passwords do not match.");
        return;
    }

    // In a real app, this would be an API call.
    // For this demo, we just show a success message.
    setPasswordSuccess("Password updated successfully!");
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(null), 3000);
  };


  const handleCancel = () => {
    window.location.hash = '/profile';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-background">
      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={handleCancel} 
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-surface-alt transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <h1 className="font-sans text-3xl font-bold text-text-rich dark:text-dark-text-rich">
            Edit Profile
          </h1>
        </div>

        <div className="bg-white dark:bg-dark-surface p-8 rounded-2xl border dark:border-dark-border">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex items-center gap-6">
              <img src={avatarUrl || `https://i.pravatar.cc/150?u=${user.email}`} alt="Avatar preview" className="w-24 h-24 rounded-full object-cover" />
              <div className="flex-1">
                <label htmlFor="avatarUrl" className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">
                  Avatar URL
                </label>
                <input
                  type="url"
                  id="avatarUrl"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.png"
                  className="w-full h-11 px-4 rounded-xl font-sans text-base border-gray-300 shadow-sm focus:ring-accent focus:border-accent transition-all duration-300 dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich"
                />
              </div>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">
                Display Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your display name"
                className="w-full h-11 px-4 rounded-xl font-sans text-base border-gray-300 shadow-sm focus:ring-accent focus:border-accent transition-all duration-300 dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich"
                required
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={user.email}
                disabled
                className="w-full h-11 px-4 rounded-xl font-sans text-base border-gray-300 shadow-sm bg-gray-100 dark:bg-dark-surface-alt/50 dark:border-dark-border dark:text-dark-text-body cursor-not-allowed"
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <button 
                type="button" 
                onClick={handleCancel}
                className="bg-gray-200 dark:bg-dark-surface-alt dark:text-dark-text-body font-sans font-semibold px-6 py-2.5 rounded-xl hover:bg-gray-300 dark:hover:bg-dark-border transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-accent text-white font-sans font-semibold px-6 py-2.5 rounded-xl hover:bg-primary transition-colors"
              >
                Save Changes
              </button>
            </div>
          </form>

          <div className="my-8 border-t border-gray-200 dark:border-dark-border"></div>

          <form onSubmit={handlePasswordChange} className="space-y-6">
            <h2 className="font-sans text-xl font-bold text-text-rich dark:text-dark-text-rich">Change Password</h2>
             <div>
              <label htmlFor="newPassword" className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full h-11 px-4 rounded-xl font-sans text-base border-gray-300 shadow-sm focus:ring-accent focus:border-accent transition-all duration-300 dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich"
              />
            </div>
             <div>
              <label htmlFor="confirmPassword" className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full h-11 px-4 rounded-xl font-sans text-base border-gray-300 shadow-sm focus:ring-accent focus:border-accent transition-all duration-300 dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich"
              />
            </div>

            {passwordError && <p className="text-sm text-danger font-sans">{passwordError}</p>}
            {passwordSuccess && <p className="text-sm text-success font-sans">{passwordSuccess}</p>}

            <div className="flex justify-end">
                 <button 
                    type="submit" 
                    className="bg-accent text-white font-sans font-semibold px-6 py-2.5 rounded-xl hover:bg-primary transition-colors"
                >
                    Update Password
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
