
import { CollectionNode, RequestItem, UserProfile } from '../types';

const API_BASE = 'http://127.0.0.1:3000/api/v1';

class ApiService {
    private token: string | null = typeof window !== 'undefined' ? localStorage.getItem('txio_token') : null;

    setToken(token: string | null) {
        this.token = token;
        if (typeof window !== 'undefined') {
            if (token) {
                localStorage.setItem('txio_token', token);
            } else {
                localStorage.removeItem('txio_token');
            }
        }
    }

    private async request(path: string, options: RequestInit = {}) {
        const headers = new Headers(options.headers || {});
        if (this.token) {
            headers.set('Authorization', `Bearer ${this.token}`);
        }
        if (options.body && !headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }

        const response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'An error occurred' }));
            throw new Error(error.message || 'API request failed');
        }

        return response.json();
    }

    // Auth
    async login(email: string, password: string): Promise<{ token: string; user: UserProfile }> {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        this.setToken(data.token);
        return data;
    }

    async register(email: string, password: string): Promise<{ token: string; user: UserProfile }> {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        this.setToken(data.token);
        return data;
    }

    async getProfile(): Promise<UserProfile> {
        return this.request('/auth/profile');
    }

    // Collections
    async getCollections(): Promise<CollectionNode[]> {
        return this.request('/collections');
    }

    async createCollection(name: string, description?: string): Promise<CollectionNode> {
        return this.request('/collections', {
            method: 'POST',
            body: JSON.stringify({ name, description })
        });
    }

    async deleteCollection(id: string): Promise<void> {
        return this.request(`/collections/${id}`, {
            method: 'DELETE'
        });
    }

    // Requests
    async addRequest(collectionId: string, request: Partial<RequestItem>): Promise<CollectionNode> {
        return this.request(`/collections/${collectionId}/requests`, {
            method: 'POST',
            body: JSON.stringify({
                name: request.name,
                method: request.rpcParams?.method,
                params: request.rpcParams?.params,
                network: request.isLoading ? 'testnet' : 'mainnet' // Mocking logic for now
            })
        });
    }
    // Terminal
    async executeCommand(command: string): Promise<{ output: string; status: 'success' | 'error' }> {
        return this.request('/terminal/execute', {
            method: 'POST',
            body: JSON.stringify({ command })
        });
    }
}

export const apiService = new ApiService();
