function EventDetails({ event, onClose }) {
    return (
        <div>
            <h3>Event details</h3>
            <p>Name: {event.name}</p>
            {event.calendarName && <p>Calendar: {event.calendarName}</p>}
            {event.eventCreator && <p>Creator: {event.eventCreator}</p>}
            <p>Type: {event.type}</p>
            {event.description && <p>Description: {event.description}</p>}
            <p>Start: {new Date(event.startDate).toLocaleString()}</p>
            <p>End: {new Date(event.endDate).toLocaleString()}</p>
            {event.location && <p>Location: {event.location}</p>}
            {event.tags && event.tags.length > 0 && (
                <div>
                    <p>Tags:</p>
                    <div>
                        {event.tags.map(tag => (
                            <div key={tag.id} style={{ backgroundColor: tag.color }}>
                                {tag.name}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <button onClick={onClose}>Close</button>
        </div>
    );
}

export default EventDetails;