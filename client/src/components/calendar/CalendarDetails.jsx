function CalendarDetails({ calendar, onClose }) {
    const formatDate = (date) => {
        if (!date) return 'Not available';
        return new Date(date).toLocaleDateString();
    };

    const getMemberName = (member) => {
        const memberObj = member.userId;
        return memberObj?.login || memberObj?.email || memberObj?._id || memberObj;
    };

    return (
        <div>
            <h3>Calendar details</h3>
            <p>Name: {calendar.name}</p>
            <p>Description: {calendar.description || 'No description'}</p>
            <p>Color: {calendar.color}</p>
            <p>Created: {formatDate(calendar.createdAt)}</p>
            <p>Owner: {calendar.owner?.login}</p>

            {calendar.sharedWith?.length > 0 && (
                <div>
                    <p>Shared with</p>
                    <ul>
                        {calendar.sharedWith.map(member => (
                            <li key={member.userId?._id || member.userId}>
                                {getMemberName(member)} ({member.role})
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <button type="button" onClick={onClose}>Close</button>
        </div>
    );
}

export default CalendarDetails;