import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChapterVersionHistoryDialog } from '../components/ChapterVersionHistoryDialog';
import { useDialog } from '../hooks/useDialog';
import '../index.css';
import '../styles/design-system.css';
import '../styles/interaction-polish.css';
import '../styles/publishing-editor.css';
function Harness() {
    const [history, setHistory] = useState(false);
    const [open, setOpen] = useState(false);
    const [child, setChild] = useState(false);
    const ref = useDialog(open, () => setOpen(false));
    const childRef = useDialog(child, () => setChild(false));
    return <main className="ww-app"><button onClick={() => setHistory(true)}>View revisions</button><button onClick={() => setOpen(true)}>Open controls</button>
        <ChapterVersionHistoryDialog isOpen={history} bookId="fixture" chapterId="chapter" onClose={() => setHistory(false)} onRestored={() => { throw Error('This regression must never restore a chapter'); }} currentTitle="An opening" currentContent="<p>A changed opening.</p>" />
        {open && <div ref={ref} role="dialog" aria-label="Native controls" tabIndex={-1}>
            <button onClick={() => setOpen(false)}>Close controls</button><input type="hidden" /><button disabled>Disabled button</button><fieldset disabled><button>Disabled by fieldset</button></fieldset><button tabIndex={-1}>Programmatic only</button><div inert><button>Inert button</button></div><div style={{ visibility: 'hidden' }}><button>Invisible button</button></div>
            <details><summary>Native disclosure</summary><button>Closed child</button></details><div tabIndex={2}>Positive tab index</div><button onClick={() => setChild(true)}>Open nested</button>
        </div>}{child && <div ref={childRef} role="dialog" aria-label="Nested" tabIndex={-1}><button onClick={() => setChild(false)}>Close nested</button><button>Last nested</button></div>}
    </main>;
}
createRoot(document.getElementById('root')!).render(<Harness />);
