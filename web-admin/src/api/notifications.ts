import { api } from './client';

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    channel: string;
    entity_type?: string;
    entity_id?: string;
    is_read: boolean;
    read_at?: string;
    created_at: string;
}

export interface UnreadCount {
    count: number;
}

export const notificationsApi = {
    list: async (userId: string, page = 1, perPage = 10) => {
        const res = await api.get<Notification[]>(`/users/${userId}/notifications`, {
            params: { page, per_page: perPage }
        });
        return res.data;
    },

    listUnread: async (userId: string) => {
        const res = await api.get<Notification[]>(`/users/${userId}/notifications/unread`);
        return res.data;
    },

    countUnread: async (userId: string) => {
        const res = await api.get<UnreadCount>(`/users/${userId}/notifications/unread/count`);
        return res.data;
    },

    markAsRead: async (id: string) => {
        const res = await api.post(`/notifications/${id}/read`);
        return res.data;
    },

    markAllAsRead: async (userId: string) => {
        const res = await api.post(`/users/${userId}/notifications/read-all`);
        return res.data;
    },
};
