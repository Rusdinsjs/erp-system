// NotificationBell - Pure Tailwind
import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Info, Wrench, Box, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../api/notifications';
import { useAuthStore } from '../../store/useAuthStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export function NotificationBell() {
    const user = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch unread count
    const { data: unreadCount } = useQuery({
        queryKey: ['notifications', 'unread-count', user?.id],
        queryFn: () => notificationsApi.countUnread(user!.id),
        enabled: !!user,
        refetchInterval: 30000,
    });

    // Fetch unread notifications for the list
    const { data: notifications, isLoading } = useQuery({
        queryKey: ['notifications', 'unread', user?.id],
        queryFn: () => notificationsApi.listUnread(user!.id),
        enabled: !!user && isOpen, // Only fetch when open? Or always? Better only when needed or cache.
    });

    // Mark as read mutation
    const markAsRead = useMutation({
        mutationFn: (id: string) => notificationsApi.markAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    // Mark all as read mutation
    const markAllAsRead = useMutation({
        mutationFn: () => notificationsApi.markAllAsRead(user!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const getIcon = (type?: string) => {
        switch (type) {
            case 'loan': return <Box size={16} />;
            case 'work_order': return <Wrench size={16} />;
            default: return <Info size={16} />;
        }
    };

    const getColorClass = (type?: string) => {
        switch (type) {
            case 'loan': return 'bg-blue-500/20 text-blue-400';
            case 'work_order': return 'bg-orange-500/20 text-orange-400';
            default: return 'bg-slate-700 text-slate-400';
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800"
            >
                <Bell size={20} />
                {unreadCount?.count ? (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-slate-900">
                        {unreadCount.count > 99 ? '99+' : unreadCount.count}
                    </span>
                ) : null}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-800/50">
                        <h3 className="font-semibold text-sm text-white">Notifications</h3>
                        {unreadCount?.count ? (
                            <button
                                onClick={() => markAllAsRead.mutate()}
                                disabled={markAllAsRead.isPending}
                                className="text-xs text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                            >
                                Mark all as read
                            </button>
                        ) : null}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {isLoading && isOpen ? (
                            <div className="flex justify-center p-6 text-slate-500">
                                <Loader2 size={24} className="animate-spin" />
                            </div>
                        ) : notifications?.length === 0 ? (
                            <div className="p-6 text-center text-sm text-slate-500">
                                No new notifications
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800">
                                {notifications?.map((n) => (
                                    <div
                                        key={n.id}
                                        onClick={() => markAsRead.mutate(n.id)}
                                        className="p-3 hover:bg-slate-800 transition-colors cursor-pointer flex gap-3 group"
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${getColorClass(n.entity_type)}`}>
                                            {getIcon(n.entity_type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-200 truncate">{n.title}</p>
                                            <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{n.message}</p>
                                            <p className="text-[10px] text-slate-500 mt-1">{dayjs(n.created_at).fromNow()}</p>
                                        </div>
                                        {!n.is_read && (
                                            <div className="flex items-center justify-center">
                                                <div className="peer group-hover:hidden w-2 h-2 rounded-full bg-cyan-500" />
                                                <Check size={14} className="hidden group-hover:block text-slate-500" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
