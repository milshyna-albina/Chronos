import { useState, useEffect, useCallback } from 'react';
import { getTags, createTag, updateTag } from '../../services/tagService.js';
import {TAG_COLOR} from "../../utils/colors.js";

function TagForm({ onClose }) {
    const [tags, setTags] = useState([]);
    const [name, setName] = useState('');
    const [color, setColor] = useState(TAG_COLOR);
    const [editingTag, setEditingTag] = useState(null);
    const [error, setError] = useState('');

    const fetchTags = useCallback(() => {
        return getTags().then(data => {
                setTags(data.tags || []);
            }).catch(err => {
                console.error(err);
                setError('Failed to load tags');
            });
    }, []);

    useEffect(() => {
        fetchTags().catch(console.error);
    }, [fetchTags]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (editingTag) {
                await updateTag(editingTag.id, { name, color });
                setEditingTag(null);
            } else {
                await createTag({ name, color });
            }
            setName('');
            setColor(TAG_COLOR);
            await fetchTags();
        } catch (err) {
            setError(err.response?.data?.message || 'Server error');
        }
    };

    const startEditing = (tag) => {
        setEditingTag(tag);
        setName(tag.name);
        setColor(tag.color);
    };

    return (
        <div>
            <h3>Manage tags</h3>

            <form onSubmit={handleSubmit}>
                <input type="text" placeholder="Tag name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} required />
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
                <button type="submit">{editingTag ? 'Save' : 'Create'}</button>
                {editingTag && (<button type="button" onClick={() => { setEditingTag(null); setName(''); }}>Cancel</button>)}
            </form>

            <div>
                {tags.map(tag => (
                    <div key={tag.id}>
                        <span style={{ backgroundColor: tag.color }}>{tag.name}</span>
                        <button type="button" onClick={() => startEditing(tag)}>Edit</button>
                    </div>
                ))}
            </div>

            {error && <p>{error}</p>}

            <button onClick={onClose}>Close</button>
        </div>
    );
}

export default TagForm;