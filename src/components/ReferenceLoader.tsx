
import React, { useRef, useState } from 'react';
import { ImageAnalyzer } from '../engine/ImageAnalyzer';
import type { GradingAction } from '../types';

interface ReferenceLoaderProps {
    dispatch: React.Dispatch<GradingAction>;
    onImageLoaded?: (url: string) => void;
}

export const ReferenceLoader: React.FC<ReferenceLoaderProps> = ({ dispatch, onImageLoaded }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [thumbnail, setThumbnail] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const url = event.target?.result as string;
            setThumbnail(url);
            if (onImageLoaded) onImageLoaded(url);

            // Analyze the image
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, img.width, img.height);

                    try {
                        const stats = ImageAnalyzer.analyze(imageData);

                        // Dispatch stats to params
                        dispatch({
                            type: 'MERGE_PARAMS',
                            params: {
                                adaptiveTargetMean: {
                                    L: stats.lab.meanL,
                                    a: stats.lab.meanA,
                                    b: stats.lab.meanB
                                },
                                adaptiveTargetStd: {
                                    L: stats.lab.stdL,
                                    a: stats.lab.stdA,
                                    b: stats.lab.stdB
                                }
                            }
                        });

                        // Auto-enable adaptive mode if not already on
                        dispatch({ type: 'SET_PARAM', param: 'useAdaptiveColor', value: true });

                    } catch (err) {
                        console.error("Failed to analyze reference image:", err);
                    }
                }
            };
            img.src = url;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div style={{ marginTop: '10px' }}>
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                    className="action-btn small"
                    onClick={() => fileInputRef.current?.click()}
                    title="Load Reference Image"
                    style={{ flexShrink: 0 }}
                >
                    Load Reference
                </button>
                {thumbnail && (
                    <div style={{
                        height: '32px',
                        width: '48px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        border: '1px solid #444',
                        flexShrink: 0
                    }}>
                        <img
                            src={thumbnail}
                            alt="Ref"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
