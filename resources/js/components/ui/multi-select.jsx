import { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '../../lib/utils';
import { Check, ChevronsUpDown, X } from 'lucide-react';

export function MultiSelect({
    options = [],
    selected = [],
    onChange,
    placeholder = 'Select...',
    searchPlaceholder = 'Search...',
    formatLabel,
    formatSubLabel,
    className,
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef(null);
    const inputRef = useRef(null);

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

    useEffect(() => {
        if (open && inputRef.current) {
            inputRef.current.focus();
        }
    }, [open]);

    const filtered = useMemo(() => {
        if (!search) return options;
        const lower = search.toLowerCase();
        return options.filter(opt => {
            const label = formatLabel ? formatLabel(opt) : opt;
            const subLabel = formatSubLabel ? formatSubLabel(opt) : '';
            return opt.toLowerCase().includes(lower) || label.toLowerCase().includes(lower) || subLabel.toLowerCase().includes(lower);
        });
    }, [options, search, formatLabel, formatSubLabel]);

    function toggle(value) {
        if (selected.includes(value)) {
            onChange(selected.filter(v => v !== value));
        } else {
            onChange([...selected, value]);
        }
    }

    function removeItem(e, value) {
        e.stopPropagation();
        onChange(selected.filter(v => v !== value));
    }

    function clearAll(e) {
        e.stopPropagation();
        onChange([]);
    }

    const displayLabel = formatLabel || (v => v);

    return (
        <div ref={ref} className={cn('relative', className)}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    'flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                    'hover:bg-accent/50 transition-colors',
                    open && 'ring-2 ring-ring ring-offset-2',
                )}
            >
                <div className="flex flex-1 flex-wrap gap-1 items-center min-w-0">
                    {selected.length === 0 ? (
                        <span className="text-muted-foreground">{placeholder}</span>
                    ) : selected.length <= 2 ? (
                        selected.map(value => (
                            <span
                                key={value}
                                className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground"
                            >
                                <span className="max-w-[120px] truncate">{displayLabel(value)}</span>
                                <span
                                    role="button"
                                    tabIndex={-1}
                                    onMouseDown={(e) => removeItem(e, value)}
                                    className="hover:text-foreground cursor-pointer"
                                >
                                    <X className="h-3 w-3" />
                                </span>
                            </span>
                        ))
                    ) : (
                        <span className="text-sm">
                            {selected.length} selected
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                    {selected.length > 0 && (
                        <span
                            role="button"
                            tabIndex={-1}
                            onMouseDown={clearAll}
                            className="text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            <X className="h-3.5 w-3.5" />
                        </span>
                    )}
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                </div>
            </button>

            {open && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-md">
                    <div className="p-2 border-b">
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1">
                        {filtered.length === 0 ? (
                            <div className="py-4 text-center text-sm text-muted-foreground">
                                No results found
                            </div>
                        ) : (
                            filtered.map(opt => {
                                const isSelected = selected.includes(opt);
                                return (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => toggle(opt)}
                                        className={cn(
                                            'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
                                            'hover:bg-accent hover:text-accent-foreground',
                                            isSelected && 'bg-accent/50',
                                        )}
                                    >
                                        <span className={cn(
                                            'mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary',
                                            isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50',
                                        )}>
                                            {isSelected && <Check className="h-3 w-3" />}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate">{displayLabel(opt)}</span>
                                            {formatSubLabel && formatSubLabel(opt) && (
                                                <span className="block truncate text-xs text-muted-foreground">{formatSubLabel(opt)}</span>
                                            )}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
