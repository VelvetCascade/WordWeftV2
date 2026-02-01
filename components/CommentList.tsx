import React, { useState } from 'react';
import type { Comment, User } from '../types';
import * as api from '../api/client';

interface CommentListProps {
    bookId: string;
    chapterId: string;
    comments: Comment[];
    currentUser: User | null;
    onCommentAdded: (c: Comment) => void;
}

export const CommentList: React.FC<CommentListProps> = ({ bookId, chapterId, comments, currentUser, onCommentAdded }) => {
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const addedComment = await api.addComment(bookId, chapterId, newComment);
            onCommentAdded(addedComment);
            setNewComment('');
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="max-w-prose mx-auto px-4 py-8 border-t border-gray-200 dark:border-gray-800 mt-16">
            <h3 className="text-2xl font-bold mb-6 dark:text-white">Chapter Comments ({comments.length})</h3>

            <div className="space-y-6 mb-8">
                {comments.length === 0 ? (
                    <p className="text-gray-500 italic">No comments yet.</p>
                ) : (
                    comments.map(comment => (
                        <div key={comment.id} className="flex gap-4">
                            {comment.userAvatar ? (
                                <img src={comment.userAvatar} alt={comment.userName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center font-bold text-gray-500">
                                    {comment.userName ? comment.userName[0].toUpperCase() : '?'}
                                </div>
                            )}
                            <div>
                                <div className="bg-gray-100 dark:bg-[#2C2C2C] px-4 py-3 rounded-2xl rounded-tl-none">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-sm dark:text-white">{comment.userName || 'Unknown User'}</span>
                                    </div>
                                    <p className="text-sm dark:text-gray-200">{comment.content}</p>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 ml-2">{new Date(comment.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {currentUser ? (
                <form onSubmit={handleSubmit} className="relative">
                    <textarea
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Join the discussion..."
                        className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1E1E1E] dark:text-white focus:outline-none focus:ring-2 focus:ring-accent min-h-[100px]"
                    />
                    <div className="flex justify-end mt-2">
                        <button
                            type="submit"
                            disabled={!newComment.trim() || isSubmitting}
                            className="px-6 py-2 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                        >
                            Post Comment
                        </button>
                    </div>
                </form>
            ) : (
                <div className="bg-gray-50 dark:bg-[#1E1E1E] p-6 rounded-xl text-center">
                    <p className="text-gray-600 dark:text-gray-400">Please <button onClick={() => window.location.hash = '/auth'} className="text-accent font-semibold hover:underline">log in</button> to leave a comment.</p>
                </div>
            )}
        </section>
    );
};
