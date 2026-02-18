import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

function DropdownMenu({ children }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        }
        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [open]);

    return (
        <div ref={ref} className="relative">
            {typeof children === 'function'
                ? children({ open, setOpen })
                : children}
        </div>
    );
}

function DropdownMenuTrigger({ children, onClick, className }) {
    return (
        <button type="button" onClick={onClick} className={className}>
            {children}
        </button>
    );
}

function DropdownMenuContent({ children, open, align = 'end', className }) {
    if (!open) return null;

    return (
        <div className={cn(
            'absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
            'animate-in fade-in-0 zoom-in-95',
            align === 'end' ? 'right-0' : 'left-0',
            'mt-1',
            className,
        )}>
            {children}
        </div>
    );
}

function DropdownMenuItem({ children, onClick, className }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                className,
            )}
        >
            {children}
        </button>
    );
}

function DropdownMenuSeparator() {
    return <div className="-mx-1 my-1 h-px bg-muted" />;
}

function DropdownMenuLabel({ children, className }) {
    return (
        <div className={cn('px-2 py-1.5 text-sm font-semibold', className)}>
            {children}
        </div>
    );
}

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
};
