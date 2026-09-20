import React, { useEffect, useRef, useState } from 'react';
import Image from '@tiptap/extension-image';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import {
    imageOffsetForAlignment,
    imageLayoutStyle,
    normalizeImageOffset,
    normalizeImageWidth,
    resizeImageLayout,
    type EditorImageAlignment,
    type ImageResizeDirection,
} from '../../utils/editorImageLayout';

const alignmentLabel: Record<EditorImageAlignment, string> = {
    left: 'Align left',
    center: 'Align center',
    right: 'Align right',
};

const resizeHandles: Array<{ direction: ImageResizeDirection; label: string }> = [
    { direction: 'nw', label: 'Resize from top left' },
    { direction: 'n', label: 'Resize from top' },
    { direction: 'ne', label: 'Resize from top right' },
    { direction: 'e', label: 'Resize from right' },
    { direction: 'se', label: 'Resize from bottom right' },
    { direction: 's', label: 'Resize from bottom' },
    { direction: 'sw', label: 'Resize from bottom left' },
    { direction: 'w', label: 'Resize from left' },
];

const ResizableImageView: React.FC<NodeViewProps> = ({ node, updateAttributes, selected, editor }) => {
    const wrapperRef = useRef<HTMLElement | null>(null);
    const initialWidth = normalizeImageWidth(node.attrs.width);
    const initialAlignment = (['left', 'center', 'right'].includes(node.attrs.alignment)
        ? node.attrs.alignment
        : 'center') as EditorImageAlignment;
    const initialOffset = normalizeImageOffset(
        node.attrs.offset,
        initialWidth,
        imageOffsetForAlignment(initialWidth, initialAlignment),
    );
    const [previewWidth, setPreviewWidth] = useState(initialWidth);
    const [previewOffset, setPreviewOffset] = useState(initialOffset);
    const previewWidthRef = useRef(initialWidth);
    const previewOffsetRef = useRef(initialOffset);
    const resizeCleanupRef = useRef<() => void>(() => undefined);

    const alignment = (['left', 'center', 'right'].includes(node.attrs.alignment)
        ? node.attrs.alignment
        : 'center') as EditorImageAlignment;

    useEffect(() => {
        const width = normalizeImageWidth(node.attrs.width);
        const offset = normalizeImageOffset(
            node.attrs.offset,
            width,
            imageOffsetForAlignment(width, alignment),
        );
        previewWidthRef.current = width;
        previewOffsetRef.current = offset;
        setPreviewWidth(width);
        setPreviewOffset(offset);
    }, [alignment, node.attrs.offset, node.attrs.width]);
    useEffect(() => () => resizeCleanupRef.current(), []);

    const applyLayout = (width: number, offset: number, nextAlignment = alignment) => {
        const normalizedWidth = normalizeImageWidth(width);
        const normalizedOffset = normalizeImageOffset(offset, normalizedWidth);
        previewWidthRef.current = normalizedWidth;
        previewOffsetRef.current = normalizedOffset;
        setPreviewWidth(normalizedWidth);
        setPreviewOffset(normalizedOffset);
        updateAttributes({ width: normalizedWidth, offset: normalizedOffset, alignment: nextAlignment });
    };

    const startResize = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (!event.isPrimary) return;
        const direction = event.currentTarget.dataset.direction as ImageResizeDirection | undefined;
        if (!direction || !resizeHandles.some(handle => handle.direction === direction)) return;
        event.preventDefault();
        event.stopPropagation();
        resizeCleanupRef.current();
        const startX = event.clientX;
        const startY = event.clientY;
        const startWidth = previewWidthRef.current;
        const editorElement = wrapperRef.current?.closest('.rte-content') as HTMLElement | null;
        const editorRect = editorElement?.getBoundingClientRect();
        const editorStyles = editorElement ? window.getComputedStyle(editorElement) : null;
        const horizontalPadding = editorStyles
            ? (Number.parseFloat(editorStyles.paddingLeft) || 0) + (Number.parseFloat(editorStyles.paddingRight) || 0)
            : 0;
        const editorWidth = Math.max(1, (editorElement?.clientWidth || editorRect?.width || 1) - horizontalPadding);
        const editorLeft = (editorRect?.left || 0) + (Number.parseFloat(editorStyles?.paddingLeft || '0') || 0);
        const wrapperRect = wrapperRef.current?.getBoundingClientRect();
        const measuredOffset = wrapperRect
            ? ((wrapperRect.left - editorLeft) / editorWidth) * 100
            : previewOffsetRef.current;
        const startOffset = normalizeImageOffset(measuredOffset, startWidth, previewOffsetRef.current);
        const imageRect = wrapperRef.current?.querySelector('img')?.getBoundingClientRect();
        const imageAspectRatio = imageRect?.height ? imageRect.width / imageRect.height : 1;

        const move = (pointerEvent: PointerEvent) => {
            const layout = resizeImageLayout({
                direction,
                startWidth,
                startOffset,
                startX,
                startY,
                currentX: pointerEvent.clientX,
                currentY: pointerEvent.clientY,
                editorWidth,
                imageAspectRatio,
            });
            previewWidthRef.current = layout.width;
            previewOffsetRef.current = layout.offset;
            setPreviewWidth(layout.width);
            setPreviewOffset(layout.offset);
        };
        const stop = () => {
            resizeCleanupRef.current();
            updateAttributes({
                width: previewWidthRef.current,
                offset: previewOffsetRef.current,
            });
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

    return (
        <NodeViewWrapper
            as="figure"
            ref={wrapperRef as React.Ref<HTMLElement>}
            className={`rte-resizable-image ${selected ? 'is-selected' : ''}`}
            data-alignment={alignment}
            style={imageLayoutStyle(previewWidth, alignment, previewOffset)}
        >
            {editor.isEditable && (
                <div className="rte-image-controls" contentEditable={false}>
                    <button
                        type="button"
                        className="rte-image-drag-handle"
                        data-drag-handle
                        title="Drag image between paragraphs"
                        aria-label="Move image between paragraphs"
                    >
                        <span aria-hidden="true">⠿</span>
                    </button>
                    {(['left', 'center', 'right'] as EditorImageAlignment[]).map(item => (
                        <button
                            type="button"
                            key={item}
                            className={Math.abs(previewOffset - imageOffsetForAlignment(previewWidth, item)) < 0.5 ? 'active' : ''}
                            onClick={() => applyLayout(previewWidth, imageOffsetForAlignment(previewWidth, item), item)}
                            title={alignmentLabel[item]}
                            aria-label={alignmentLabel[item]}
                        >
                            {item === 'left' ? '⇤' : item === 'right' ? '⇥' : '↔'}
                        </button>
                    ))}
                    {[50, 75, 100].map(size => (
                        <button
                            type="button"
                            key={size}
                            className={previewWidth === size ? 'active' : ''}
                            onClick={() => applyLayout(size, imageOffsetForAlignment(size, alignment))}
                        >
                            {size}%
                        </button>
                    ))}
                </div>
            )}
            <div className="rte-image-frame" contentEditable={false}>
                <img src={node.attrs.src} alt={node.attrs.alt || ''} title={node.attrs.title || undefined} draggable={false} />
                {editor.isEditable && resizeHandles.map(handle => (
                    <button
                        type="button"
                        key={handle.direction}
                        className={`rte-image-resize-handle rte-image-resize-${handle.direction}`}
                        data-direction={handle.direction}
                        onPointerDown={startResize}
                        aria-label={handle.label}
                        title={handle.label}
                    />
                ))}
            </div>
            {editor.isEditable && <figcaption contentEditable={false}>Drag the grip to move between paragraphs · drag any handle to resize</figcaption>}
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
            offset: {
                default: null,
                parseHTML: element => element.getAttribute('data-offset'),
                renderHTML: attributes => attributes.offset === null || attributes.offset === undefined
                    ? {}
                    : { 'data-offset': attributes.offset },
            },
        };
    },
    renderHTML({ HTMLAttributes }) {
        const alignment = (['left', 'center', 'right'].includes(HTMLAttributes['data-align']) ? HTMLAttributes['data-align'] : 'center') as EditorImageAlignment;
        const layout = imageLayoutStyle(HTMLAttributes['data-width'], alignment, HTMLAttributes['data-offset']);
        const style = `width:${layout.width};margin-left:${layout.marginLeft};margin-right:${layout.marginRight}`;
        return ['img', { ...HTMLAttributes, style }];
    },
    addNodeView() {
        return ReactNodeViewRenderer(ResizableImageView);
    },
});
