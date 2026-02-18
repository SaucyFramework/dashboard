import { useState, useRef } from 'react';
import { cn } from '../../lib/utils';

function Tooltip({ children, content, side = 'right' }) {
    const [show, setShow] = useState(false);
    const timeout = useRef(null);

    function handleEnter() {
        timeout.current = setTimeout(() => setShow(true), 300);
    }

    function handleLeave() {
        clearTimeout(timeout.current);
        setShow(false);
    }

    const positionClasses = {
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    };

    return (
        <div
            className="relative inline-flex"
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
        >
            {children}
            {show && (
                <div className={cn(
                    'absolute z-50 rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md whitespace-nowrap animate-in fade-in-0 zoom-in-95',
                    positionClasses[side],
                )}>
                    {content}
                </div>
            )}
        </div>
    );
}

export { Tooltip };
