import { useState, useEffect } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { Card, Timeline, TimelineItem } from '../ui';
import {
    Plus,
    Wrench,
    CheckCircle,
    Truck,
    RotateCcw,
    AlertCircle,
    Package,
    ArrowRight
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface RealTimeActivity {
    id: string;
    event_type: string;
    payload: any;
    timestamp: string;
}

export function LiveActivityFeed() {
    const { lastMessage } = useWebSocket();
    const [activities, setActivities] = useState<RealTimeActivity[]>([]);

    useEffect(() => {
        if (lastMessage) {
            const newActivity: RealTimeActivity = {
                id: Math.random().toString(36).substr(2, 9),
                event_type: lastMessage.event_type,
                payload: lastMessage.payload,
                timestamp: new Date().toISOString(),
            };

            setActivities((prev) => [newActivity, ...prev].slice(0, 10));
        }
    }, [lastMessage]);

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'WORK_ORDER_CREATED': return <Plus size={14} className="text-blue-400" />;
            case 'WORK_ORDER_STATUS_CHANGED': return <Wrench size={14} className="text-orange-400" />;
            case 'WORK_ORDER_COMPLETED': return <CheckCircle size={14} className="text-emerald-400" />;
            case 'ASSET_CREATED': return <Package size={14} className="text-cyan-400" />;
            case 'LOAN_CREATED': return <ArrowRight size={14} className="text-purple-400" />;
            case 'LOAN_CHECKOUT': return <Truck size={14} className="text-amber-400" />;
            case 'LOAN_RETURNED': return <RotateCcw size={14} className="text-emerald-400" />;
            default: return <AlertCircle size={14} className="text-slate-400" />;
        }
    };

    const getEventDescription = (activity: RealTimeActivity) => {
        const { event_type, payload } = activity;

        switch (event_type) {
            case 'WORK_ORDER_CREATED':
                return `New Work Order #${payload.wo_number || payload.id.slice(0, 8)}`;
            case 'WORK_ORDER_STATUS_CHANGED':
                return `Work Order #${payload.wo_number} is now ${payload.status}`;
            case 'WORK_ORDER_COMPLETED':
                return `Work Order #${payload.wo_number} completed`;
            case 'ASSET_CREATED':
                return `New Asset: ${payload.name} (${payload.asset_code})`;
            case 'LOAN_CREATED':
                return `Loan request for asset ID: ${payload.asset_id.slice(0, 8)}`;
            case 'LOAN_CHECKOUT':
                return `Asset checkout for loan ID: ${payload.id.slice(0, 8)}`;
            case 'LOAN_RETURNED':
                return `Asset returned for loan ID: ${payload.id.slice(0, 8)}`;
            default:
                return `System Event: ${event_type}`;
        }
    };

    const getEventColor = (type: string) => {
        switch (type) {
            case 'WORK_ORDER_CREATED': return 'border-blue-500/50 bg-blue-500/10';
            case 'WORK_ORDER_STATUS_CHANGED': return 'border-orange-500/50 bg-orange-500/10';
            case 'WORK_ORDER_COMPLETED': return 'border-emerald-500/50 bg-emerald-500/10';
            case 'ASSET_CREATED': return 'border-cyan-500/50 bg-cyan-500/10';
            case 'LOAN_CREATED': return 'border-purple-500/50 bg-purple-500/10';
            case 'LOAN_CHECKOUT': return 'border-amber-500/50 bg-amber-500/10';
            case 'LOAN_RETURNED': return 'border-emerald-500/50 bg-emerald-500/10';
            default: return 'border-slate-500/50 bg-slate-500/10';
        }
    };

    return (
        <Card padding="lg" className="border-cyan-500/20 shadow-lg shadow-cyan-500/5">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                    </span>
                    Live Activity Feed
                </h2>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">WebSocket Connected</span>
            </div>

            {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <Clock size={48} className="mb-3 opacity-20" />
                    <p className="text-sm">Waiting for live events...</p>
                </div>
            ) : (
                <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    <Timeline>
                        {activities.map((activity, index) => (
                            <TimelineItem
                                key={activity.id}
                                isLast={index === activities.length - 1}
                                bullet={
                                    <div className={`p-1.5 rounded-full border ${getEventColor(activity.event_type)}`}>
                                        {getEventIcon(activity.event_type)}
                                    </div>
                                }
                                title={getEventDescription(activity)}
                            >
                                <p className="text-[11px] text-slate-500 mt-1">
                                    {dayjs(activity.timestamp).fromNow()}
                                </p>
                            </TimelineItem>
                        ))}
                    </Timeline>
                </div>
            )}
        </Card>
    );
}

// Re-using simplified Clock icon for the empty state
function Clock({ size, className }: { size: number, className: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}
