
import React, { useState } from 'react';
import { Footer } from '../components/Footer';
import { WordWeftLogo } from '../components/icons/WordWeftLogo';

const ContactChannelCard: React.FC<{
    icon: string;
    title: string;
    email: string;
    description: string;
}> = ({ icon, title, email, description }) => (
    <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-surface-alt transition-colors">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-lg flex-shrink-0">
            {icon}
        </div>
        <div>
            <h4 className="font-sans font-semibold text-sm text-text-rich dark:text-dark-text-rich">{title}</h4>
            <p className="text-xs text-text-body dark:text-dark-text-body mt-0.5 mb-1.5">{description}</p>
            <a href={`mailto:${email}`} className="text-accent text-xs font-semibold hover:underline">{email}</a>
        </div>
    </div>
);

export const ContactPage: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        category: '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate form submission
        await new Promise(resolve => setTimeout(resolve, 1500));

        setIsSubmitting(false);
        setSubmitted(true);
        setFormData({ name: '', email: '', category: '', subject: '', message: '' });
    };

    return (
        <div>
            {/* Hero Header */}
            <div className="bg-white dark:bg-dark-surface border-b border-gray-200/80 dark:border-dark-border relative overflow-hidden">
                <div className="absolute top-0 left-1/2 w-[500px] h-[500px] bg-accent/5 rounded-full -translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl"></div>
                <div className="container mx-auto px-6 py-16 relative z-10 text-center">
                    <h1 className="font-sans text-4xl md:text-5xl font-extrabold text-text-rich dark:text-dark-text-rich mb-4 tracking-tight">
                        Contact Us
                    </h1>
                    <p className="text-text-body dark:text-dark-text-body text-lg max-w-2xl mx-auto leading-relaxed">
                        We're here to help — whether it's support, reporting an issue, or a legal request.
                        Use the form or reach out directly through the right channel.
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-6 py-16 max-w-6xl">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

                    {/* Contact Form - Left Side (3 cols) */}
                    <div className="lg:col-span-3">
                        <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl p-8 shadow-sm">
                            <h2 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich mb-1">
                                Send us a message
                            </h2>
                            <p className="text-sm text-text-body dark:text-dark-text-body mb-8">
                                Fill out the form below and we'll get back to you within 24–72 hours.
                            </p>

                            {submitted ? (
                                <div className="text-center py-12">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                                        <span className="text-3xl">✅</span>
                                    </div>
                                    <h3 className="font-sans text-xl font-bold text-text-rich dark:text-dark-text-rich mb-2">
                                        Message Sent!
                                    </h3>
                                    <p className="text-text-body dark:text-dark-text-body mb-6">
                                        Thank you for reaching out. We'll respond to your inquiry as soon as possible.
                                    </p>
                                    <button
                                        onClick={() => setSubmitted(false)}
                                        className="text-accent font-semibold hover:underline text-sm"
                                    >
                                        Send another message
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label htmlFor="contact-name" className="block text-sm font-medium text-text-body dark:text-dark-text-body mb-1.5">
                                                Full Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="contact-name"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required
                                                placeholder="Your name"
                                                className="w-full h-11 px-4 rounded-xl text-sm border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface-alt text-text-rich dark:text-dark-text-rich focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="contact-email" className="block text-sm font-medium text-text-body dark:text-dark-text-body mb-1.5">
                                                Email Address <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                id="contact-email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                required
                                                placeholder="you@example.com"
                                                className="w-full h-11 px-4 rounded-xl text-sm border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface-alt text-text-rich dark:text-dark-text-rich focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label htmlFor="contact-category" className="block text-sm font-medium text-text-body dark:text-dark-text-body mb-1.5">
                                                Category <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                id="contact-category"
                                                name="category"
                                                value={formData.category}
                                                onChange={handleChange}
                                                required
                                                className="w-full h-11 px-4 rounded-xl text-sm border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface-alt text-text-rich dark:text-dark-text-rich focus:ring-2 focus:ring-accent focus:border-accent transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="" disabled>Select a category</option>
                                                <option value="general">General Support</option>
                                                <option value="safety">Safety & Abuse Report</option>
                                                <option value="copyright">Copyright / IP Complaint</option>
                                                <option value="privacy">Privacy Request</option>
                                                <option value="appeal">Appeal</option>
                                                <option value="business">Business & Partnerships</option>
                                                <option value="legal">Legal Request</option>
                                                <option value="feedback">Feedback & Suggestions</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="contact-subject" className="block text-sm font-medium text-text-body dark:text-dark-text-body mb-1.5">
                                                Subject <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="contact-subject"
                                                name="subject"
                                                value={formData.subject}
                                                onChange={handleChange}
                                                required
                                                placeholder="Brief subject line"
                                                className="w-full h-11 px-4 rounded-xl text-sm border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface-alt text-text-rich dark:text-dark-text-rich focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="contact-message" className="block text-sm font-medium text-text-body dark:text-dark-text-body mb-1.5">
                                            Message <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            id="contact-message"
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            required
                                            rows={6}
                                            placeholder="Describe your issue or inquiry in detail. Include your username, links, or screenshots if relevant."
                                            className="w-full px-4 py-3 rounded-xl text-sm border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface-alt text-text-rich dark:text-dark-text-rich focus:ring-2 focus:ring-accent focus:border-accent transition-all resize-none"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            All fields marked with <span className="text-red-500">*</span> are required
                                        </p>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="bg-accent text-white font-sans font-semibold px-8 py-3 rounded-xl hover:bg-primary transition-all hover:scale-105 duration-300 shadow-lg disabled:bg-gray-400 disabled:scale-100 disabled:shadow-none text-sm"
                                        >
                                            {isSubmitting ? (
                                                <span className="flex items-center gap-2">
                                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                                    Sending...
                                                </span>
                                            ) : 'Send Message'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Contact Channels - Right Side (2 cols) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Direct Email Channels */}
                        <div>
                            <h3 className="font-sans font-bold text-lg text-text-rich dark:text-dark-text-rich mb-1">
                                Direct Channels
                            </h3>
                            <p className="text-xs text-text-body dark:text-dark-text-body mb-4">
                                Prefer email? Reach the right team directly.
                            </p>
                            <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-dark-border">
                                <ContactChannelCard
                                    icon="🛟"
                                    title="General Support"
                                    email="support@wordweft.com"
                                    description="Account help, login issues, bugs"
                                />
                                <ContactChannelCard
                                    icon="🛡️"
                                    title="Safety & Abuse"
                                    email="safety@wordweft.com"
                                    description="Harassment, spam, illegal content"
                                />
                                <ContactChannelCard
                                    icon="©️"
                                    title="Copyright / IP"
                                    email="copyright@wordweft.com"
                                    description="Stolen or plagiarized work"
                                />
                                <ContactChannelCard
                                    icon="🔐"
                                    title="Privacy Requests"
                                    email="privacy@wordweft.com"
                                    description="Data access, correction, deletion"
                                />
                                <ContactChannelCard
                                    icon="📩"
                                    title="Appeals"
                                    email="appeals@wordweft.com"
                                    description="Moderation disputes"
                                />
                                <ContactChannelCard
                                    icon="🤝"
                                    title="Business"
                                    email="business@wordweft.com"
                                    description="Partnerships & collaborations"
                                />
                                <ContactChannelCard
                                    icon="⚖️"
                                    title="Legal"
                                    email="legal@wordweft.com"
                                    description="Law enforcement & legal notices"
                                />
                            </div>
                        </div>

                        {/* Response Info */}
                        <div className="bg-accent/5 border border-accent/15 rounded-2xl p-5">
                            <h4 className="font-sans font-semibold text-sm text-text-rich dark:text-dark-text-rich mb-2">⏱️ Response Times</h4>
                            <ul className="space-y-1.5 text-xs text-text-body dark:text-dark-text-body">
                                <li className="flex justify-between"><span>General Support</span><span className="font-medium text-text-rich dark:text-dark-text-rich">24–72 hours</span></li>
                                <li className="flex justify-between"><span>Safety Reports</span><span className="font-medium text-text-rich dark:text-dark-text-rich">Under 24 hours</span></li>
                                <li className="flex justify-between"><span>Copyright Claims</span><span className="font-medium text-text-rich dark:text-dark-text-rich">3–5 business days</span></li>
                                <li className="flex justify-between"><span>Privacy Requests</span><span className="font-medium text-text-rich dark:text-dark-text-rich">5–10 business days</span></li>
                                <li className="flex justify-between"><span>Appeals</span><span className="font-medium text-text-rich dark:text-dark-text-rich">3–7 business days</span></li>
                            </ul>
                        </div>

                        {/* Important Notes */}
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-5">
                            <h4 className="font-sans font-semibold text-sm text-amber-900 dark:text-amber-200 mb-2">⚠️ Important Notes</h4>
                            <ul className="space-y-1.5 text-xs text-amber-800 dark:text-amber-300">
                                <li>• We do not provide support through social media DMs</li>
                                <li>• Sending multiple emails may delay your response</li>
                                <li>• Harassment toward staff may result in account restrictions</li>
                                <li>• Include your username in all communications</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Closing */}
                <div className="mt-16 text-center border-t border-gray-200 dark:border-dark-border pt-10">
                    <div className="flex justify-center mb-2"><WordWeftLogo className="w-14 h-14 md:w-16 md:h-16" /></div>
                    <p className="text-text-body dark:text-dark-text-body mt-1">Building a safer space for writers and readers.</p>
                </div>
            </div>

            <Footer />
        </div>
    );
};
