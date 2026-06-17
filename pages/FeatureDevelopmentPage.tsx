import React from 'react';

interface FeatureDevelopmentPageProps {
  featureName: string;
  description: string;
}

export const FeatureDevelopmentPage: React.FC<FeatureDevelopmentPageProps> = ({ featureName, description }) => {
  return (
    <div className="min-h-screen bg-background dark:bg-dark-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-dark-surface p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-accent/10 dark:bg-accent/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.748-.14a4.5 4.5 0 004.473-4.473 8.966 8.966 0 00-2.905-5.494l-.222-.168c-.906-.682-2.146-.42-2.731.527l-.145.233M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75" />
          </svg>
        </div>
        <h2 className="font-sans text-2xl font-bold text-text-rich dark:text-dark-text-rich mb-3">
          {featureName}
        </h2>
        <p className="text-text-body dark:text-dark-text-body mb-8 leading-relaxed">
          {description}
        </p>
        <button
          onClick={() => { window.location.hash = '/write'; }}
          className="inline-flex items-center gap-2 bg-primary text-white font-sans font-semibold px-8 py-3 rounded-xl hover:bg-accent transition-colors shadow-sm"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};
