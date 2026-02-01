import React, { useState } from 'react';
import type { Comment } from '../types';
import { XMarkIcon } from './icons/Icons';
import * as api from '../api/client';

interface CommentModalProps {
    bookId: string;
    chapterId: string;
    paragraphIndex: number;
    comments: Comment[];
    onClose: () => void;
    onCommentAdded: (newComment: Comment) => void;
    currentUser: any; // Type as User if possible, using any for ease now
}

export const CommentModal: React.FC<CommentModalProps> = ({ bookId, chapterId, paragraphIndex, comments, onClose, onCommentAdded, currentUser }) => {
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const addedComment = await api.addComment(bookId, chapterId, newComment, paragraphIndex);
            onCommentAdded(addedComment);
            setNewComment('');
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                    <h3 className="font-bold text-lg dark:text-white">Comments</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <XMarkIcon className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {comments.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Be the first to comment on this line!</p>
                    ) : (
                        comments.map(comment => (
                            <div key={comment.id} className="bg-gray-50 dark:bg-[#2C2C2C] p-3 rounded-lg flex gap-3">
                                {comment.userAvatar ? (
                                    <img src={comment.userAvatar} alt={comment.userName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center font-bold text-xs text-gray-500">
                                        {comment.userName ? comment.userName[0].toUpperCase() : '?'}
                                    </div>
                                )}
                                <div>
                                    <span className="font-semibold text-xs dark:text-white block mb-1">{comment.userName || 'Unknown User'}</span>
                                    <p className="text-sm dark:text-gray-200">{comment.content}</p>
                                    <p className="text-xs text-gray-500 mt-2">{new Date(comment.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#252525]">
                    {currentUser ? (
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1E1E1E] dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                            <button
                                type="submit"
                                disabled={!newComment.trim() || isSubmitting}
                                className="px-4 py-2 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Post
                            </button>
                        </form>
                    ) : (
                        <p className="text-center text-sm text-gray-500"><button onClick={() => window.location.hash = '/auth'} className="text-accent hover:underline">Log in</button> to comment</p>
                    )}
                </div>
            </div>
        </div>
    );
};
