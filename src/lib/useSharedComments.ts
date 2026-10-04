import { useCallback, useEffect, useState } from 'react';
import { apiService } from '@/services/api';
import type { Comment, SharedComment } from '@/types';

const POLL_MS = 20_000;

const toComment = (c: SharedComment): Comment => ({
    id: c.id,
    userName: c.authorEmail,
    content: c.body,
    timestamp: new Date(c.createdAt).getTime()
});

/**
 * Comments on one request, stored on the server and visible to every member
 * of the workspace. Refreshes every 20 seconds while mounted. Nothing here is
 * kept in the browser, so a comment cannot be seen by someone who is not a
 * member, and cannot be lost with local storage.
 */
export function useSharedComments(workspaceId: string | undefined, targetId: string | null) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!workspaceId || !targetId) return;
        try {
            setComments((await apiService.getSharedComments(workspaceId, targetId)).map(toComment));
            setError(null);
        } catch {
            setError('Could not load comments.');
        }
    }, [workspaceId, targetId]);

    useEffect(() => {
        if (!workspaceId || !targetId) return;
        let cancelled = false;
        const run = () => {
            if (!cancelled) void load();
        };
        run();
        const timer = setInterval(run, POLL_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [workspaceId, targetId, load]);

    const post = useCallback(
        async (body: string) => {
            if (!workspaceId || !targetId) return;
            try {
                const created = await apiService.addSharedComment(workspaceId, targetId, body);
                setComments((prev) => [...prev, toComment(created)]);
                setError(null);
            } catch {
                setError('Could not post the comment.');
            }
        },
        [workspaceId, targetId]
    );

    return { comments: workspaceId && targetId ? comments : [], error, post };
}
