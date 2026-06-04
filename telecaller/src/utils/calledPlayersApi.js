import { API_BASE_URL, fetchWithAuth } from './api';

export async function fetchCallProgress() {
    const res = await fetchWithAuth(`${API_BASE_URL}/telecaller/called-players`);
    const json = await res.json();
    if (!json.success) {
        throw new Error(json.message || 'Failed to load call progress');
    }
    return {
        playerIds: json.data?.playerIds || [],
        summaries: json.data?.summaries || {},
    };
}

export async function saveCallProgress(playerIds, summaries) {
    const res = await fetchWithAuth(`${API_BASE_URL}/telecaller/called-players`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            playerIds: [...playerIds],
            summaries,
        }),
    });
    const json = await res.json();
    if (!json.success) {
        throw new Error(json.message || 'Failed to save call progress');
    }
    return json.data;
}
