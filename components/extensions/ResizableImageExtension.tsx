import React, { useEffect, useRef, useState } from 'react';
import Image from '@tiptap/extension-image';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { imageLayoutStyle, normalizeImageWidth, type EditorImageAlignment } from '../../utils/editorImageLayout';

const alignmentLabel: Record<EditorImageAlignment, string> = {
    left: 'Align left',
    center: 'Align center',
    right: 'Align right',
};

const ResizableImageView: React.FC<NodeViewProps> = ({ node, updateAttributes, selected, editor }) => {
    const wrapperRef = useRef<HTMLElement | null>(null);
    const initialWidth = normalizeImageWidth(node.attrs.width);
    const [previewWidth, setPreviewWidth] = useState(initialWidth);
    const previewWidthRef = useRef(initialWidth);
    const resizeCleanupRef = useRef<() => void>(() => undefined);

    useEffect(() => {
        const width = normalizeImageWidth(node.attrs.width);
        previewWidthRef.current = width;
        setPreviewWidth(width);
    }, [node.attrs.width]);
    useEffect(() => () => resizeCleanupRef.current(), []);

    const startResize = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (!event.isPrimary) return;
        event.preventDefault();
        event.stopPropagation();
        resizeCleanupRef.current();
        const startX = event.clientX;
        const startWidth = previewWidthRef.current;
        const editorWidth = wrapperRef.current?.closest('.rte-content')?.getBoundingClientRect().width || 1;

        const move = (pointerEvent: PointerEvent) => {
            const deltaPercent = ((pointerEvent.clientX - startX) / editorWidth) * 100;
            const width = normalizeImageWidth(startWidth + deltaPercent);
            previewWidthRef.current = width;
            setPreviewWidth(width);
        };
        const stop = () => {
            resizeCleanupRef.current();
            updateAttributes({ width: previewWidthRef.current });
        };
        resizeCleanupRef.current = () => {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', stop);
            document.removeEventListener('pointercancel', stop);
            resizeCleanupRef.current = () => undefined;
        };
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', stop);
        document.addEventListener('pointercancel', stop);
    };

    const alignment = (['left', 'center', 'right'].includes(node.attrs.alignment)
        ? node.attrs.alignment
        : 'center') as EditorImageAlignment;

    return (
        <NodeViewWrapper
            as="figure"
            ref={wrapperRef as React.Ref<HTMLElement>}
            className={`rte-resizable-image ${selected ? 'is-selected' : ''}`}
            data-alignment={alignment}
            style={imageLayoutStyle(previewWidth, alignment)}
        >
            {editor.isEditable && (
                <div className="rte-image-controls" contentEditable={false}>
                    <button type="button" data-drag-handle draggable="true" title="Drag image to another paragraph" aria-label="Move image">↕</button>
                    {(['left', 'center', 'right'] as EditorImageAlignment[]).map(item => (
                        <button
                            type="button"
                            key={item}
                            className={alignment === item ? 'active' : ''}
                            onClick={() => updateAttributes({ alignment: item })}
                            title={alignmentLabel[item]}
                            aria-label={alignmentLabel[item]}
                        >
                            {item === 'left' ? '⇤' : item === 'right' ? '⇥' : '↔'}
                        </button>
                    ))}
                    {[50, 75, 100].map(size => (
                        <button type="button" key={size} className={previewWidth === size ? 'active' : ''} onClick={() => updateAttributes({ width: size })}>
                            {size}%
                        </button>
                    ))}
                </div>
            )}
            <img src={node.attrs.src} alt={node.attrs.alt || ''} title={node.attrs.title || undefined} draggable={false} />
            {editor.isEditable && (
                <button
                    type="button"
                    className="rte-image-resize-handle"
                    contentEditable={false}
                    onPointerDown={startResize}
                    aria-label="Resize image"
                    title="Drag to resize"
                />
            )}
            {editor.isEditable && <figcaption contentEditable={false}>Drag the corner to resize · use ↕ to move</figcaption>}
        </NodeViewWrapper>
    );
};

export const ResizableImage = Image.extend({
    draggable: true,
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: 75,
                parseHTML: element => normalizeImageWidth(element.getAttribute('data-width') || element.style.width?.replace('%', '')),
                renderHTML: attributes => ({ 'data-width': normalizeImageWidth(attributes.width) }),
            },
            alignment: {
                default: 'center',
                parseHTML: element => element.getAttribute('data-align') || 'center',
                renderHTML: attributes => ({ 'data-align': attributes.alignment || 'center' }),
            },
        };
    },
    renderHTML({ HTMLAttributes }) {
        const alignment = (['left', 'center', 'right'].includes(HTMLAttributes['data-align']) ? HTMLAttributes['data-align'] : 'center') as EditorImageAlignment;
        const layout = imageLayoutStyle(HTMLAttributes['data-width'], alignment);
        const style = `width:${layout.width};margin-left:${layout.marginLeft};margin-right:${layout.marginRight}`;
        return ['img', { ...HTMLAttributes, style }];
    },
    addNodeView() {
        return ReactNodeViewRenderer(ResizableImageView);
    },
});
