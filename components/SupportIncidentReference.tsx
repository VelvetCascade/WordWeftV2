import React from 'react';
export const SupportIncidentReference: React.FC<{incidentId: string | null; selected: boolean; onChange: (value: boolean) => void}> = ({incidentId, selected, onChange}) => <div className="ww-support-incident">
    <p className="wv-hint">Describe the page, action, browser and device. Keep passwords, sign-in links and private manuscript text out of your report.</p>
    {incidentId ? <label className="flex items-start gap-3"><input type="checkbox" checked={selected} onChange={event => onChange(event.target.checked)} /><span>Include recent incident reference <strong>{incidentId}</strong><small className="block">Only this reference is added. Error details and interaction records are not sent with this form.</small></span></label> : <p className="wv-hint">If an error screen provides an incident reference, include it in your message. No automatic diagnostic report is sent.</p>}
</div>;
