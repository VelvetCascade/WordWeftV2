import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpenText, CloudCheck, Info, NotebookPen, PanelLeft, Search, Send, Smartphone, Type, UsersRound, X } from 'lucide-react';
import { useDialog } from '../hooks/useDialog';
import '../styles/writing-tour.css';

export type WritingTourTool = 'details' | 'guide' | 'scanner' | 'preview';

export interface WritingDemoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStartWriting?: () => void;
    onOpenTool?: (tool: WritingTourTool) => void;
}

const topics = [
    { label: 'Draft & autosave', title: 'Draft with confidence', icon: CloudCheck },
    { label: 'Formatting', title: 'Make the page your own', icon: Type },
    { label: 'Characters & story guide', title: 'Keep your cast close', icon: UsersRound },
    { label: 'Notes & details', title: 'Keep notes private, give readers context', icon: NotebookPen },
    { label: 'Preview & publish', title: 'Review before you release', icon: Send },
];

/** The tour describes the live studio instead of maintaining a second, simulated editor. */
export const WritingDemoModal: React.FC<WritingDemoModalProps> = ({ isOpen, onClose, onStartWriting, onOpenTool }) => {
    const [step, setStep] = useState(0);
    const contentRef = useRef<HTMLDivElement>(null);
    const dialogRef = useDialog(isOpen, onClose);

    useEffect(() => { if (isOpen) setStep(0); }, [isOpen]);
    useEffect(() => { contentRef.current?.scrollTo({ top: 0 }); }, [step]);

    if (!isOpen) return null;
    const current = topics[step];
    const TopicIcon = current.icon;
    const openTool = (tool: WritingTourTool) => { onClose(); onOpenTool?.(tool); };

    return (
        <div className="ww-writing-tour-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
            <div className="ww-writing-tour" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="writing-tour-title" tabIndex={-1}>
                <header className="ww-writing-tour-header">
                    <div><span>YOUR WRITING STUDIO</span><h2 id="writing-tour-title">Writing tools tour</h2></div>
                    <button type="button" onClick={onClose} aria-label="Close writing tools tour" data-dialog-focus><X size={21} aria-hidden="true" /></button>
                </header>
                <div className="ww-writing-tour-body">
                    <nav className="ww-writing-tour-topics" aria-label="Tour topics">
                        {topics.map((topic, index) => <button type="button" key={topic.label} aria-current={step === index ? 'step' : undefined} onClick={() => setStep(index)}><topic.icon size={18} aria-hidden="true" /><span>{topic.label}</span></button>)}
                    </nav>
                    <div className="ww-writing-tour-content" ref={contentRef} tabIndex={0} role="region" aria-label={`${current.label} guidance`}>
                        <span className="ww-writing-tour-topic-icon"><TopicIcon size={24} aria-hidden="true" /></span>
                        <h3 aria-live="polite">{current.title}</h3>
                        {step === 0 && <>
                            <p>Write in the manuscript. Your chapter saves automatically after a short pause, including its title and reader notes.</p>
                            <Location desktop="Save status in the top bar" phone="Save status below the chapter number" />
                            <ol><li>Wait for <strong>All changes saved</strong> before closing the tab.</li><li>Offline? <strong>Saved on this device</strong> confirms a local copy. Keep using this browser and reconnect to save online.</li><li>If a recovery copy is offered after a reload, choose <strong>Recover draft</strong> to bring it back into the manuscript.</li></ol>
                            <div className="ww-writing-tour-tip"><Info size={18} aria-hidden="true" /><span>Drafts stay private. Editing a published chapter keeps its existing published version live until you publish updates.</span></div>
                        </>}
                        {step === 1 && <>
                            <p>The formatting toolbar sits above your chapter. Choose a paragraph or heading style, then format text or insert a scene break, image, table, or footnote.</p>
                            <Location desktop="Toolbar above the manuscript" phone="Swipe the toolbar sideways for more tools" />
                            <ol><li>Select text, then choose a format. The floating menu offers quick text options.</li><li>Use <strong>Text style</strong> for headings and <strong>Scene break</strong> between scenes.</li><li><strong>Undo</strong> and <strong>Redo</strong> are at the far end of the toolbar. Open <strong>Shortcuts</strong> there for a reminder.</li></ol>
                            <div className="ww-writing-tour-keys"><span><kbd>Ctrl / ⌘</kbd> + <kbd>B</kbd> Bold</span><span><kbd>Ctrl / ⌘</kbd> + <kbd>I</kbd> Italic</span><span><kbd>Ctrl / ⌘</kbd> + <kbd>Z</kbd> Undo</span></div>
                        </>}
                        {step === 2 && <>
                            <p>Keep characters, scenes, and private notes beside your draft. Character mentions let readers open the profiles you’ve created.</p>
                            <Location desktop="Tools below the chapter list on the left" phone="Chapters in the bottom bar → writing tools" />
                            <ol><li><strong>Story guide</strong> opens your cast, scenes, and notes. Use <strong>Manage your story guide</strong> to edit them in the studio.</li><li>Type <strong>@</strong> and a character’s name in the manuscript. Select a suggestion with a tap, or use arrow keys and Enter.</li><li><strong>Scan for characters</strong> suggests repeated names. Review the names to add, then choose whether to link them in this chapter.</li></ol>
                            {onOpenTool && <div className="ww-writing-tour-tool-actions"><button type="button" onClick={() => openTool('guide')}><BookOpenText size={18} aria-hidden="true" />Open story guide</button><button type="button" onClick={() => openTool('scanner')}><Search size={18} aria-hidden="true" />Scan this chapter</button></div>}
                        </>}
                        {step === 3 && <>
                            <p>Your planning notes and your reader disclosures have separate homes in the studio.</p>
                            <Location desktop="Details and Notes tabs on the right" phone="Notes and Details in the bottom bar" />
                            <ol><li><strong>Notes</strong> holds private ideas. These never appear in the reader preview.</li><li><strong>Details → Author note</strong> adds context that readers can see.</li><li><strong>Details → Content warnings</strong> tells readers what to expect before they open the chapter. Selected warnings can raise its age rating.</li></ol>
                            <div className="ww-writing-tour-tip"><Info size={18} aria-hidden="true" /><span>Details also contains manual save, scheduling, and revision history. Scheduling becomes available after the story is published.</span></div>
                            {onOpenTool && <div className="ww-writing-tour-tool-actions"><button type="button" onClick={() => openTool('details')}><NotebookPen size={18} aria-hidden="true" />Open chapter details</button></div>}
                        </>}
                        {step === 4 && <>
                            <p>Use the reader preview to check your chapter, then review its title, rating, and content warnings before publication.</p>
                            <Location desktop="Preview and Publish in the top bar" phone="Preview and Publish in the top bar" />
                            <ol><li><strong>Preview</strong> opens your current manuscript without publishing it. Check character mentions, spoilers, and footnotes there.</li><li><strong>Publish</strong> opens a review. Confirm permission for the story’s artwork, then choose <strong>Publish chapter</strong>.</li><li>To release later, close the review and use <strong>Schedule chapter</strong> in Details. To recover an earlier draft, use <strong>View revisions</strong>.</li></ol>
                            <div className="ww-writing-tour-tip"><Info size={18} aria-hidden="true" /><span>Published chapters open to readers immediately. Followers receive a chapter notification; sharing a community release is a separate action.</span></div>
                            {onOpenTool && <div className="ww-writing-tour-tool-actions"><button type="button" onClick={() => openTool('preview')}><BookOpenText size={18} aria-hidden="true" />Open reader preview</button></div>}
                        </>}
                    </div>
                </div>
                <footer className="ww-writing-tour-footer">
                    <span>{step + 1} of {topics.length}</span>
                    <div><button type="button" className="ww-writing-tour-back" disabled={step === 0} onClick={() => setStep(value => Math.max(0, value - 1))}><ArrowLeft size={17} aria-hidden="true" />Back</button><button type="button" className="ww-writing-tour-next" onClick={() => step < topics.length - 1 ? setStep(step + 1) : (onStartWriting || onClose)()}>{step === topics.length - 1 ? 'Start writing' : 'Next'}<ArrowRight size={17} aria-hidden="true" /></button></div>
                </footer>
            </div>
        </div>
    );
};

const Location: React.FC<{ desktop: string; phone: string }> = ({ desktop, phone }) => <div className="ww-writing-tour-locations"><span><PanelLeft size={17} aria-hidden="true" /><span><strong>Desktop</strong>{desktop}</span></span><span><Smartphone size={17} aria-hidden="true" /><span><strong>Phone</strong>{phone}</span></span></div>;
