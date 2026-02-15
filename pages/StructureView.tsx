import React from 'react';
import type { User } from '../types';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as api from '../api/client';

const Card: React.FC<{ chapter: any }> = ({ chapter }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: chapter.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} {...listeners} className="bg-white rounded-xl border p-4 shadow-sm">
      <p className="text-xs text-gray-500">{chapter.wordCount} words</p>
      <h4 className="font-bold">{chapter.title}</h4>
      <p className="text-sm">POV: {chapter.povCharacter || '—'}</p>
      <span className="text-xs px-2 py-0.5 rounded bg-indigo-100">{chapter.workflowStatus || 'Draft'}</span>
    </div>
  );
};

export const StructureView: React.FC<{ currentUser: User; bookId: string; onUserUpdate: (u: User) => void }> = ({ currentUser, bookId, onUserUpdate }) => {
  const book = currentUser.writtenBooks?.find(b => b.id === bookId);
  const [chapters, setChapters] = React.useState(book?.chapters || []);

  const onDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = chapters.findIndex(c => c.id === active.id);
    const newIndex = chapters.findIndex(c => c.id === over.id);
    const reordered = arrayMove(chapters, oldIndex, newIndex);
    setChapters(reordered);
    const updated = await api.reorderChapters(bookId, reordered.map(c => c.id));
    onUserUpdate(updated);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Structural Deck</h1>
      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={chapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chapters.map(ch => <Card key={ch.id} chapter={ch} />)}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
