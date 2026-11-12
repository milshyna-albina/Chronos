import { useState } from 'react';

function CalendarForm({ calendar, onSubmit, onCancel }) {
    const [name, setName] = useState(calendar?.name || '');
    const [description, setDescription] = useState(calendar?.description || '');
    const [color, setColor] = useState(calendar?.color || '#dfc1cc');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ name, description, color });
    };

    return (
        <div>
            <h4>{calendar ? 'Edit calendar' : 'Create new calendar'}</h4>
            <form onSubmit={handleSubmit}>
                <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
                <input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
                <button type="submit">{calendar ? 'Save' : 'Create'}</button>
                <button type="button" onClick={onCancel}>Cancel</button>
            </form>
        </div>
    );
}

export default CalendarForm;