import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton, TableSkeleton } from '../Skeleton';

describe('Skeleton Components', () => {
    describe('Skeleton', () => {
        it('renders with default classes', () => {
            const { container } = render(<Skeleton />);
            expect(container.firstChild).toHaveClass('animate-pulse', 'rounded-md');
        });

        it('merges custom classes', () => {
            const { container } = render(<Skeleton className="h-4 w-[250px]" />);
            expect(container.firstChild).toHaveClass('h-4', 'w-[250px]', 'animate-pulse');
        });
    });

    describe('TableSkeleton', () => {
        it('renders the correct number of rows and columns', () => {
            const rows = 3;
            const cols = 2;
            const { container } = render(<TableSkeleton rows={rows} cols={cols} />);
            
            // Should render header columns + row items
            const skeletonItems = container.querySelectorAll('.animate-pulse');
            expect(skeletonItems.length).toBe(cols + (rows * cols));
        });
    });
});
