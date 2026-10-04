import React from 'react';
import { useRecoverableForm } from '../hooks/useRecoverableForm';
import { isCompatibleForm } from '../utils/formDrafts';
import { copyPlanningDraft } from '../utils/planningTools';
import { FormDraftNotice } from './FormDraftNotice';
import '../styles/planning.css';

export function PlanningDraftForm<T extends object>({ ownerId, journey, initial, children, disabled = false }: {
    ownerId: string; journey: string; initial: T; disabled?: boolean;
    children: (draft: T, update: (next: T) => void, clear: () => void) => React.ReactNode;
}) {
    const recovery = useRecoverableForm(ownerId, journey, copyPlanningDraft(initial), (value): value is T => isCompatibleForm(initial, value));
    return <div className="ww-story-tool-form ww-planning-form"><fieldset className="ww-planning-edit-fields" disabled={disabled} aria-busy={disabled}>{children(recovery.value, recovery.setValue, recovery.clear)}<FormDraftNotice {...recovery} onDiscard={recovery.discard} /></fieldset></div>;
}
