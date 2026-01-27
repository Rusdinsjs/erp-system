import React, { useRef, useEffect, useState } from 'react';
import { Button } from '../ui';
import { RotateCcw, Check } from 'lucide-react';

interface SignaturePadProps {
    onSave: (signatureDataUrl: string) => void;
    onCancel?: () => void;
    label?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onCancel, label }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set high DPI support
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const getPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        } else {
            return {
                x: (e as MouseEvent).clientX - rect.left,
                y: (e as MouseEvent).clientY - rect.top
            };
        }
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getPos(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
        setIsEmpty(false);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getPos(e);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Prevent scrolling when drawing on touch devices
        if (e.cancelable) e.preventDefault();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas || isEmpty) return;

        // Export as PNG (transparent) with whatever ink color was used (white)
        onSave(canvas.toDataURL('image/png'));
    };

    return (
        <div className="flex flex-col gap-4">
            {label && <p className="text-sm font-medium text-gray-400">{label}</p>}
            <div className="relative border-2 border-white/10 rounded-2xl overflow-hidden bg-gray-950">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-48 cursor-crosshair touch-none"
                    style={{ width: '100%', height: '192px' }}
                />
                {isEmpty && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-gray-600 text-sm">Sign here</p>
                    </div>
                )}
            </div>
            <div className="flex justify-between items-center">
                <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<RotateCcw size={16} />}
                    onClick={clear}
                    className="text-gray-500 hover:text-white"
                >
                    Clear
                </Button>
                <div className="flex gap-2">
                    {onCancel && (
                        <Button variant="outline" size="sm" onClick={onCancel}>
                            Cancel
                        </Button>
                    )}
                    <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Check size={16} />}
                        onClick={handleSave}
                        disabled={isEmpty}
                    >
                        Save Signature
                    </Button>
                </div>
            </div>
        </div>
    );
};
