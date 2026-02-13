export default function ActivityExtra({ type, data }) {
    if (type === 'store_checkpoint') {
        return (
            <>
                new position: {data.position ?? 'na'}
                <br />
                {Object.entries(data.messages_processed || {}).map(([key, d]) => (
                    <span key={key}>
                        {key}: count: {d.count}, max time:{d.max_time}, total_time:{d.total_time}
                        <br />
                    </span>
                ))}
            </>
        );
    }

    if (type === 'loading_events') {
        return <>from: {data.fromPosition ?? 'na'}</>;
    }

    if (type === 'handled_message') {
        return (
            <>
                id: {data.message_id ?? 'na'}
                <br />
                type: {data.type ?? 'na'}
                <br />
                duration: {data.time_to_handle ?? 'na'}ms
                <br />
            </>
        );
    }

    return null;
}
