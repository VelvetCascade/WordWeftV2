import React, { useEffect, useState } from 'react';

type ResilientImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
    src?: string | null;
    fallbackLabel?: string;
    variant?: 'avatar' | 'cover';
};

const fallbackInitial = (value: string) => value.trim().charAt(0).toUpperCase() || 'W';

/**
 * Keeps remote media failures from becoming broken-image icons. ImageKit URLs can
 * legitimately outlive a deleted asset, so every public image surface needs a
 * deterministic local fallback instead of another remote placeholder service.
 */
export const ResilientImage: React.FC<ResilientImageProps> = ({
    src,
    alt = '',
    className = '',
    fallbackLabel,
    variant = 'avatar',
    onError,
    ...props
}) => {
    const [failed, setFailed] = useState(!src);

    useEffect(() => setFailed(!src), [src]);

    if (failed) {
        const label = fallbackLabel || alt || 'WordWeft';
        return (
            <span
                className={`${className} resilient-image-fallback resilient-image-fallback-${variant}`}
                role="img"
                aria-label={alt || label}
            >
                <span aria-hidden="true">{fallbackInitial(label)}</span>
            </span>
        );
    }

    return (
        <img
            {...props}
            src={src!}
            alt={alt}
            className={className}
            onError={(event) => {
                onError?.(event);
                setFailed(true);
            }}
        />
    );
};
