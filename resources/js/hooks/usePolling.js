import { useState, useEffect, useCallback, useRef } from 'react';

export function usePolling(fetchFn, interval = 2000) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchRef = useRef(fetchFn);

    useEffect(() => {
        fetchRef.current = fetchFn;
    }, [fetchFn]);

    const fetch = useCallback(async () => {
        try {
            const result = await fetchRef.current();
            setData(result);
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetch();
        const timer = setInterval(fetch, interval);
        return () => clearInterval(timer);
    }, [fetch, interval]);

    return { data, loading, error, refetch: fetch };
}
