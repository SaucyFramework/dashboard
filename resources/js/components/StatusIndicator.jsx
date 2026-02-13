const colors = {
    green: 'bg-green-400/10 text-green-400',
    orange: 'bg-orange-400/10 text-orange-400',
    blue: 'bg-blue-400/10 text-blue-400',
};

export default function StatusIndicator({ color, label }) {
    const colorClass = colors[color] || colors.blue;

    return (
        <div className="flex items-center justify-end gap-x-2 sm:justify-start">
            <div className={`flex-none rounded-full p-1 ${colorClass}`}>
                <div className="h-1.5 w-1.5 rounded-full bg-current"></div>
            </div>
            <div className="hidden text-black sm:block">{label}</div>
        </div>
    );
}
