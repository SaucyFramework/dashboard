import { Badge } from './ui/badge';

const variantMap = {
    green: 'success',
    orange: 'warning',
    blue: 'info',
};

export default function StatusIndicator({ color, label }) {
    const variant = variantMap[color] || 'info';
    return <Badge variant={variant}>{label || 'unknown'}</Badge>;
}
