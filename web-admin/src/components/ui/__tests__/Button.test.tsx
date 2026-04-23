import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../Button';

describe('Button Component', () => {
    it('renders with children', () => {
        render(<Button>Click Me</Button>);
        expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('triggers onClick handler when clicked', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click Me</Button>);
        
        fireEvent.click(screen.getByRole('button', { name: /click me/i }));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('displays loading state and disables button', () => {
        render(<Button loading>Submit</Button>);
        
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
        // Check for the spinner existence inside the button
        expect(button.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('applies destructive variant styles', () => {
        render(<Button variant="danger">Delete</Button>);
        const button = screen.getByRole('button');
        expect(button.className).toMatch(/bg-red-600|text-white/);
    });
});
