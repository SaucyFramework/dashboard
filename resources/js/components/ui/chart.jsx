import { ResponsiveContainer } from 'recharts';

const CHART_COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--primary))',
    'hsl(var(--destructive))',
    'hsl(210, 70%, 55%)',
    'hsl(320, 60%, 50%)',
    'hsl(100, 50%, 45%)',
];

function ChartContainer({ children, className = '' }) {
    return (
        <div className={className} style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                {children}
            </ResponsiveContainer>
        </div>
    );
}

function ChartTooltipContent({ active, payload, label, labelFormatter, valueFormatter }) {
    if (!active || !payload?.length) return null;

    return (
        <div className="rounded-lg border bg-popover p-2 shadow-md text-popover-foreground">
            <div className="text-xs text-muted-foreground mb-1">
                {labelFormatter ? labelFormatter(label) : label}
            </div>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                    <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-muted-foreground">{entry.name}:</span>
                    <span className="font-medium">
                        {valueFormatter ? valueFormatter(entry.value) : entry.value?.toLocaleString()}
                    </span>
                </div>
            ))}
        </div>
    );
}

function getChartColor(index) {
    return CHART_COLORS[index % CHART_COLORS.length];
}

export { ChartContainer, ChartTooltipContent, getChartColor, CHART_COLORS };
