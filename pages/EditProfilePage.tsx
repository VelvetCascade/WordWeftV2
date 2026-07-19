
import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import { ArrowLeftIcon, CheckCircleIcon, TwitterIcon, InstagramIcon, ThreadsIcon, XMarkIcon, PlusIcon } from '../components/icons/Icons';
import * as api from '../api/client';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { ImageUpload } from '../components/ImageUpload';

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
    const { trackEvent } = useAnalytics();
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [avatarFileId, setAvatarFileId] = useState<string | null>(user.avatarFileId || null);
  const [bio, setBio] = useState(user.bio || '');
  const [location, setLocation] = useState(user.location || '');
  const [website, setWebsite] = useState(user.website || '');

  // Socials
  const [twitter, setTwitter] = useState(user.socials?.twitter || '');
  const [instagram, setInstagram] = useState(user.socials?.instagram || '');
  const [threads, setThreads] = useState(user.socials?.threads || '');
  const [socialErrors, setSocialErrors] = useState<{ twitter?: string, instagram?: string, threads?: string }>({});
  
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Genres
  const [selectedGenres, setSelectedGenres] = useState<string[]>(user.favoriteGenres || []);
  const [allGenres, setAllGenres] = useState<string[]>([]);
  const [genreSearch, setGenreSearch] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isNewPasswordFocused, setIsNewPasswordFocused] = useState(false);

  useEffect(() => {
    api.getGenres().then(setAllGenres);
  }, []);

  const validateUrl = (url: string, type: 'twitter' | 'instagram' | 'threads') => {
    if (!url) return '';
    const patterns = {
      twitter: /^https?:\/\/(www\.)?(twitter|x)\.com\/[a-zA-Z0-9_]{1,15}\/?$/,
      instagram: /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/,
      threads: /^https?:\/\/(www\.)?threads\.net\/@[a-zA-Z0-9_.]+\/?$/
    };

    return patterns[type].test(url) ? '' : `Invalid ${type} URL format`;
  };

  const handleSocialChange = (val: string, type: 'twitter' | 'instagram' | 'threads') => {
    if (type === 'twitter') setTwitter(val);
    if (type === 'instagram') setInstagram(val);
    if (type === 'threads') setThreads(val);

    setSocialErrors(prev => ({
      ...prev,
      [type]: validateUrl(val, type)
    }));
  };

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(prev => prev.filter(g => g !== genre));
    } else {
      if (selectedGenres.length >= 5) {
        alert("You can only select up to 5 favorite genres.");
        return;
      }
      setSelectedGenres(prev => [...prev, genre]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check validation before submitting
    const twErr = validateUrl(twitter, 'twitter');
    const igErr = validateUrl(instagram, 'instagram');
    const thErr = validateUrl(threads, 'threads');

    setSaveError(null);
    setSaveSuccess(null);

    if (twErr || igErr || thErr) {
      setSocialErrors({ twitter: twErr, instagram: igErr, threads: thErr });
      return;
    }

    try {
      await onUpdateProfile({
        name,
        avatarUrl,
        avatarFileId,
        bio,
        location,
        website,
        socials: { twitter, instagram, threads },
        favoriteGenres: selectedGenres
      });
      setSaveSuccess("Profile updated successfully!");
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update profile.");
    }
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

  const filteredGenres = allGenres.filter(g => g.toLowerCase().includes(genreSearch.toLowerCase()));

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
            <ImageUpload 
              value={avatarUrl}
              onChange={(url, fileId) => {
                  setAvatarUrl(url);
                  setAvatarFileId(fileId);
              }}
              fallbackUrl={`https://i.pravatar.cc/150?u=${user.email}`}
              label="Profile Avatar"
              aspectRatio={1}
              cropShape="circle"
            />

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
            </div>

            {/* Socials Section */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 mt-4">Social Media Links</h3>
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <TwitterIcon className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="url"
                    value={twitter}
                    onChange={(e) => handleSocialChange(e.target.value, 'twitter')}
                    placeholder="https://x.com/username"
                    className={`w-full h-11 pl-10 pr-4 rounded-xl font-sans text-base shadow-sm focus:ring-accent focus:border-accent transition-all duration-300 dark:bg-dark-surface-alt dark:text-dark-text-rich ${socialErrors.twitter ? 'border-danger' : 'border-gray-300 dark:border-dark-border'}`}
                  />
                  {socialErrors.twitter && <p className="text-xs text-danger mt-1">{socialErrors.twitter}</p>}
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <InstagramIcon className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="url"
                    value={instagram}
                    onChange={(e) => handleSocialChange(e.target.value, 'instagram')}
                    placeholder="https://instagram.com/username"
                    className={`w-full h-11 pl-10 pr-4 rounded-xl font-sans text-base shadow-sm focus:ring-accent focus:border-accent transition-all duration-300 dark:bg-dark-surface-alt dark:text-dark-text-rich ${socialErrors.instagram ? 'border-danger' : 'border-gray-300 dark:border-dark-border'}`}
                  />
                  {socialErrors.instagram && <p className="text-xs text-danger mt-1">{socialErrors.instagram}</p>}
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ThreadsIcon className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="url"
                    value={threads}
                    onChange={(e) => handleSocialChange(e.target.value, 'threads')}
                    placeholder="https://threads.net/@username"
                    className={`w-full h-11 pl-10 pr-4 rounded-xl font-sans text-base shadow-sm focus:ring-accent focus:border-accent transition-all duration-300 dark:bg-dark-surface-alt dark:text-dark-text-rich ${socialErrors.threads ? 'border-danger' : 'border-gray-300 dark:border-dark-border'}`}
                  />
                  {socialErrors.threads && <p className="text-xs text-danger mt-1">{socialErrors.threads}</p>}
                </div>
              </div>
            </div>

            {/* Favorite Genres */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 mt-4">Favorite Genres (Max 5)</h3>
              {selectedGenres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {selectedGenres.map(genre => (
                    <span key={genre} onClick={() => toggleGenre(genre)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-sans font-medium bg-primary text-white cursor-pointer hover:bg-primary/80 transition-colors shadow-sm">
                      {genre} <span className="text-white/70">×</span>
                    </span>
                  ))}
                </div>
              )}
              <input
                type="text"
                placeholder="Search genres..."
                value={genreSearch}
                onChange={e => setGenreSearch(e.target.value)}
                className="w-full h-10 px-4 mb-2 rounded-xl text-sm font-sans border-gray-300 shadow-sm focus:ring-accent focus:border-accent dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich"
              />
              <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pr-1">
                {filteredGenres.map(genre => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`px-3 py-1.5 rounded-full text-sm font-sans font-medium transition-all ${selectedGenres.includes(genre)
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-gray-100 dark:bg-dark-surface-alt text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-border'
                      }`}
                  >
                    {genre}
                  </button>
                ))}
                {filteredGenres.length === 0 && <p className="text-xs text-gray-400 py-2">No genres match your search.</p>}
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

            <div className="flex justify-between items-center pt-4 w-full">
              <div>
                {saveError && <p className="text-sm text-danger font-sans">{saveError}</p>}
                {saveSuccess && <p className="text-sm text-success font-sans">{saveSuccess}</p>}
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-200 dark:bg-dark-surface-alt dark:text-dark-text-body font-sans font-semibold px-6 py-2.5 rounded-xl hover:bg-gray-300 dark:hover:bg-dark-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!!(socialErrors.twitter || socialErrors.instagram || socialErrors.threads)}
                  className="bg-accent text-white font-sans font-semibold px-6 py-2.5 rounded-xl hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>

          <div className="my-8 border-t border-gray-200 dark:border-dark-border"></div>

          <form onSubmit={handlePasswordChange} className="space-y-6">
            <h2 className="font-sans text-xl font-bold text-text-rich dark:text-dark-text-rich">Change Password</h2>
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">
                Current Password (use "password")
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full h-11 px-4 rounded-xl font-sans text-base border-gray-300 shadow-sm focus:ring-accent focus:border-accent transition-all duration-300 dark:bg-dark-surface-alt dark:border-dark-border dark:text-dark-text-rich"
              />
            </div>
            <div className="relative">
              <label htmlFor="newPassword" className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body mb-1">
                New Password
              </label>
              <PasswordRequirements password={newPassword} isVisible={isNewPasswordFocused} />
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onFocus={() => setIsNewPasswordFocused(true)}
                onBlur={() => setIsNewPasswordFocused(false)}
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
