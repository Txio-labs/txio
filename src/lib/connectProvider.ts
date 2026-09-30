import { apiService } from '@/services/api';
import { appStore } from '@/lib/store';

/**
 * "Connect" for an already signed-in user. The backend returns the provider
 * URL with the account to link inside its signed state, so no credential is
 * ever put in a URL.
 */
export async function connectProvider(provider: 'google' | 'github' | 'x'): Promise<void> {
    try {
        window.location.href = await apiService.startOAuthLink(provider);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not start the connection.';
        appStore.showToast(message, 'error');
    }
}
