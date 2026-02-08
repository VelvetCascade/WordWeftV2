
import React, { useState, useEffect } from 'react';
import type { Author } from '../types';
import { XMarkIcon, UserCircleIcon } from './icons/Icons';
import * as api from '../api/client';

interface ConnectionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    userId: string;
    type: 'followers' | 'following';
}

export const ConnectionsModal: React.FC<ConnectionsModalProps> = ({ isOpen, onClose, title, userId, type }) => {
    const [users, setUsers] = useState<Author[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            const fetchFn = type === 'followers' ? api.getUserFollowers : api.getUserFollowing;
            fetchFn(userId).then(data => {
                setUsers(data);
                setIsLoading(false);
            });
        }
    }, [isOpen, userId, type]);

    const handleFollowToggle = async (user: Author) => {
        if (user.isFollowing) {
            await api.unfollowUser(user.id);
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isFollowing: false } : u));
        } else {
            await api.followUser(user.id);
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isFollowing: true } : u));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-dark-surface w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-gray-100 dark:border-dark-border flex justify-between items-center">
                    <h3 className="font-sans font-bold text-lg text-text-rich dark:text-dark-text-rich">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-alt transition-colors">
                        <XMarkIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500">Loading...</div>
                    ) : users.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No users found.</div>
                    ) : (
                        <div className="space-y-1">
                            {users.map(user => (
                                <div key={user.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-dark-surface-alt rounded-xl transition-colors group">
                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => { onClose(); window.location.hash = `/author/${user.id}`; }}>
                                        <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                                        <div>
                                            <h4 className="font-sans font-bold text-sm text-text-rich dark:text-dark-text-rich">{user.name}</h4>
                                            {user.bio && <p className="text-xs text-gray-500 truncate max-w-[150px]">{user.bio}</p>}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleFollowToggle(user)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                            user.isFollowing 
                                            ? 'bg-gray-100 dark:bg-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-surface'
                                            : 'bg-accent text-white hover:bg-primary'
                                        }`}
                                    >
                                        {user.isFollowing ? 'Unfollow' : 'Follow'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
