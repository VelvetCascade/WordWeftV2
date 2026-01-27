
import React, { useState } from 'react';
import type { User } from '../types';
import { ArrowLeftIcon, CheckCircleIcon, TwitterIcon, InstagramIcon, FacebookIcon, ThreadsIcon } from '../components/icons/Icons';
import { InputField } from './AuthPage';

interface EditProfilePageProps {
  user: User;
  onUpdateProfile: (updatedData: Partial<User>) => Promise<void>;
  onChangePassword: (oldPassword_unused: string, newPassword_unused: string) => Promise<void>;
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


export const EditProfilePage: React.FC<EditProfilePageProps> = ({ user, onUpdateProfile, onChangePassword }) => {
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [bio, setBio] = useState(user.bio || '');
  const [location, setLocation] = useState(user.location || '');
  const [website, setWebsite] = useState(user.website || '');
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(user.socialLinks || {});
  const [socialErrors, setSocialErrors] = useState<Record<string, string>>({});

  const SOCIAL_PLATFORMS = [
    { id: 'twitter', label: 'Twitter', icon: TwitterIcon, placeholder: 'https://twitter.com/username', pattern: /twitter\.com|x\.com/ },
    { id: 'instagram', label: 'Instagram', icon: InstagramIcon, placeholder: 'https://instagram.com/username', pattern: /instagram\.com/ },
    { id: 'facebook', label: 'Facebook', icon: FacebookIcon, placeholder: 'https://facebook.com/username', pattern: /facebook\.com/ },
    { id: 'threads', label: 'Threads', icon: ThreadsIcon, placeholder: 'https://threads.net/@username', pattern: /threads\.net/ },
  ];

  const validateSocialLink = (platformId: string, url: string) => {
    if (!url) return true;
    const platform = SOCIAL_PLATFORMS.find(p => p.id === platformId);
    return platform ? platform.pattern.test(url) : true;
  };

  const handleSocialChange = (platformId: string, url: string) => {
    setSocialLinks(prev => ({ ...prev, [platformId]: url }));

    if (url && !validateSocialLink(platformId, url)) {
      setSocialErrors(prev => ({ ...prev, [platformId]: `Invalid ${platformId.charAt(0).toUpperCase() + platformId.slice(1)} URL` }));
    } else {
      setSocialErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[platformId];
        return newErrors;
      });
    }
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isNewPasswordFocused, setIsNewPasswordFocused] = useState(false);


  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(socialErrors).length > 0) return;
    onUpdateProfile({ name, avatarUrl, bio, location, website, socialLinks });
  };

  const validatePassword = (pw: string) => {
    const hasLength = pw.length >= 8 && pw.length <= 10;
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasNumber = /\d/.test(pw);
    const hasSpecial = /[@$!%*?&]/.test(pw);
    return hasLength && hasUpper && hasLower && hasNumber && hasSpecial;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all password fields.");
      return;
    }

    if (!validatePassword(newPassword)) {
      setPasswordError("Password does not meet the requirements.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    try {
      await onChangePassword(currentPassword, newPassword);
      setPasswordSuccess("Password updated successfully!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 3000);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password.");
    }
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
              <label htmlFor="bio" className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us a bit about yourself..."
                rows={3}
                className="w-full p-4 rounded-xl font-sans text-base border-gray-300 shadow-sm focus:ring-accent focus:border-accent transition-all duration-300 dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="location" className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. New York, USA"
                  className="w-full h-11 px-4 rounded-xl font-sans text-base border-gray-300 shadow-sm focus:ring-accent focus:border-accent transition-all duration-300 dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich"
                />
              </div>
              <div>
                <label htmlFor="website" className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">
                  Website
                </label>
                <input
                  type="url"
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yoursite.com"
                  className="w-full h-11 px-4 rounded-xl font-sans text-base border-gray-300 shadow-sm focus:ring-accent focus:border-accent transition-all duration-300 dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich"
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-sans font-bold text-lg text-text-rich dark:text-dark-text-rich">Social Profiles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SOCIAL_PLATFORMS.map(platform => (
                    <div key={platform.id}>
                      <label htmlFor={platform.id} className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1 flex items-center gap-2">
                        <platform.icon className="w-4 h-4" /> {platform.label}
                      </label>
                      <input
                        type="text"
                        id={platform.id}
                        value={socialLinks[platform.id] || ''}
                        onChange={(e) => handleSocialChange(platform.id, e.target.value)}
                        placeholder={platform.placeholder}
                        className={`w-full h-11 px-4 rounded-xl font-sans text-base border shadow-sm focus:ring-accent focus:border-accent transition-all duration-300 dark:bg-dark-surface-alt dark:text-dark-text-rich ${socialErrors[platform.id]
                          ? 'border-danger focus:ring-danger focus:border-danger'
                          : 'border-gray-300 dark:border-dark-border'
                          }`}
                      />
                      {socialErrors[platform.id] && (
                        <p className="text-xs text-danger mt-1">{socialErrors[platform.id]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
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
              <InputField
                id="currentPassword"
                label="Current Password (use &quot;password&quot;)"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="relative">
              <InputField
                id="newPassword"
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onFocus={() => setIsNewPasswordFocused(true)}
                onBlur={() => setIsNewPasswordFocused(false)}
                placeholder="Enter new password"
              >
                <PasswordRequirements password={newPassword} isVisible={isNewPasswordFocused} />
              </InputField>
            </div>
            <div>
              <InputField
                id="confirmPassword"
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
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
