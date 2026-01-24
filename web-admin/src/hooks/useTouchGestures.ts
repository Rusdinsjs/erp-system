import { useState } from 'react';

interface TouchGestureHandlers {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
}

interface UseTouchGesturesOptions {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    minSwipeDistance?: number;
}

export const useTouchGestures = ({
    onSwipeLeft,
    onSwipeRight,
    minSwipeDistance = 50,
}: UseTouchGesturesOptions): TouchGestureHandlers => {
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(0);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && onSwipeLeft) {
            onSwipeLeft();
        }
        if (isRightSwipe && onSwipeRight) {
            onSwipeRight();
        }
    };

    return { onTouchStart, onTouchMove, onTouchEnd };
};
