import { useState } from 'react';

function ShareCalendarForm({ onSubmit, onCancel }) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('viewer');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ email, role });
    };

    return (
        <div>
            <h4>Share calendar</h4>

            <form onSubmit={handleSubmit}>
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />

                <select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                </select>

                <button type="submit">Send</button>
                <button type="button" onClick={onCancel}>Cancel</button>
            </form>
        </div>
    );
}

export default ShareCalendarForm;