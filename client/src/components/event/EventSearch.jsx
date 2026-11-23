import { useState, useEffect, useRef } from 'react';
import { searchEvents } from '../../services/eventService.js';

function EventSearch({ onSelectEvent }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState('');
    const containerRef = useRef(null);

    useEffect(() => {
        const trimmed = query.trim();
        if (!trimmed) {
            setResults([]);
            setIsOpen(false);
            setError('');
            return;
        }

        const searchTimeout = setTimeout(async () => {
            setError('');
            try {
                const data = await searchEvents(trimmed, 30);
                setResults(data.events || []);
                setIsOpen(true);
            } catch (err) {
                setError(err.response?.data?.message || 'Search failed');
                setResults([]);
                setIsOpen(true);
            }
        }, 300);

        return () => clearTimeout(searchTimeout);
    }, [query]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setQuery('');
                setResults([]);
                setIsOpen(false);
                setError('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelect = (event) => {
        setQuery('');
        setResults([]);
        setIsOpen(false);
        setError('');
        onSelectEvent(event);
    };

    return (
        <div ref={containerRef}>
            <input type="text" placeholder="Search events" value={query} onChange={(e) => setQuery(e.target.value)}
                onFocus={() => { if (query.trim()) setIsOpen(true); }} />

            {query && (
                <button onClick={() => { setQuery(''); setResults([]); setIsOpen(false); setError(''); }}>Clear</button>
            )}

            {isOpen && (
                <div>
                    {error && <p>{error}</p>}
                    {!error && results.length === 0 && <p>No events found</p>}
                    {!error && results.map((ev) => (
                        <div key={`${ev.id}_${ev.startDate}`} onClick={() => handleSelect(ev)}>
                            <div>Name: {ev.name}</div>
                            {ev.description && (
                                <div>
                                    Description: {ev.description.length > 80 ? `${ev.description.slice(0, 80)}...` : ev.description}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default EventSearch;