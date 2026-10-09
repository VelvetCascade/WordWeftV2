import React from 'react';

export const PlanningLoadState: React.FC<{ loading: boolean; error: string; label: string; retry: () => void }> = ({ loading, error, label, retry }) => <>
    {loading && <p role="status" className="ww-planning-load">Loading {label}…</p>}
    {error && <div role="alert" className="ww-studio-alert ww-planning-load"><p>{error}</p><button type="button" onClick={retry}>Try again</button></div>}
</>;
