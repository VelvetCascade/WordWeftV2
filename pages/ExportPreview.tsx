import React from 'react';
import type { User } from '../types';

export const ExportPreview: React.FC<{ currentUser: User; bookId: string }> = ({ currentUser, bookId }) => {
  const book = currentUser.writtenBooks?.find(b => b.id === bookId);
  const [font, setFont] = React.useState('Garamond');
  const [fontSize, setFontSize] = React.useState(18);
  const [lineHeight, setLineHeight] = React.useState(1.6);
  const text = (book?.chapters || []).map(c => c.content).join('\n\n');
  const widowLines = text.split('\n').filter(p => p.trim().split(/\s+/).length < 3);

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Publisher Settings</h2>
        <label className="block">Font
          <select value={font} onChange={e => setFont(e.target.value)} className="block border rounded p-2 mt-1">
            <option>Garamond</option><option>Merriweather</option>
          </select>
        </label>
        <label className="block">Font Size {fontSize}px
          <input type="range" min={14} max={24} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-full"/>
        </label>
        <label className="block">Line Height {lineHeight}
          <input type="range" min={1.2} max={2} step={0.05} value={lineHeight} onChange={e => setLineHeight(Number(e.target.value))} className="w-full"/>
        </label>
      </div>
      <div>
        <div className="mx-auto bg-white shadow-xl border" style={{ width: 540, minHeight: 810, padding: 48, fontFamily: font, fontSize, lineHeight, textAlign: 'justify', hyphens: 'auto' as any }}>
          {text.split('\n').map((p, i) => {
            const isWidow = p.trim().split(/\s+/).length < 3;
            return <p key={i} className={isWidow ? 'bg-yellow-100' : ''}>{p}</p>;
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2">Highlighted potential widow/orphan paragraphs: {widowLines.length}</p>
      </div>
    </div>
  );
};
