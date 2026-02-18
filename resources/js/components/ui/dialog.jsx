import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

function Dialog({ open, onClose, children }) {
    const overlayRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        function handleKey(e) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        >
            <div className="fixed inset-0 bg-black/50 animate-in fade-in-0" />
            <div className="relative z-50 w-full max-w-lg mx-4 bg-background border rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95">
                {children}
            </div>
        </div>
    );
}

function DialogHeader({ className, ...props }) {
    return <div className={cn('flex flex-col space-y-1.5 p-6 pb-4', className)} {...props} />;
}

function DialogTitle({ className, ...props }) {
    return <h3 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />;
}

function DialogDescription({ className, ...props }) {
    return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

function DialogContent({ className, ...props }) {
    return <div className={cn('px-6 pb-4', className)} {...props} />;
}

function DialogFooter({ className, ...props }) {
    return <div className={cn('flex justify-end gap-2 p-6 pt-4', className)} {...props} />;
}

export { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter };
