// RecentActivity - Pure Tailwind
import { Plus, Edit, Trash, ArrowLeftRight, Check, Wrench } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Card, Timeline, TimelineItem } from '../ui';

dayjs.extend(relativeTime);

export interface ActivityItem {
    entity_type: string;
    entity_id: string;
    action: string;
    description: string;
    user_name?: string;
    created_at: string;
}

interface RecentActivityProps {
    activities: ActivityItem[];
}

function getIconForAction(action: string) {
    switch (action.toLowerCase()) {
        case 'created':
        case 'create':
            return <Plus size={16} />;
        case 'updated':
        case 'update':
            return <Edit size={16} />;
        case 'deleted':
        case 'delete':
            return <Trash size={16} />;
        case 'transferred':
            return <ArrowLeftRight size={16} />;
        case 'completed':
            return <Check size={16} />;
        case 'maintenance':
            return <Wrench size={16} />;
        default:
            return <Check size={16} />;
    }
}

// Map to className colors instead of Mantine props
function getColorClass(action: string) {
    switch (action.toLowerCase()) {
        case 'created':
        case 'create':
            return 'text-emerald-400 border-emerald-500/50 bg-emerald-500/20';
        case 'updated':
        case 'update':
            return 'text-blue-400 border-blue-500/50 bg-blue-500/20';
        case 'deleted':
        case 'delete':
            return 'text-red-400 border-red-500/50 bg-red-500/20';
        case 'transferred':
            return 'text-violet-400 border-violet-500/50 bg-violet-500/20';
        case 'completed':
            return 'text-teal-400 border-teal-500/50 bg-teal-500/20';
        case 'maintenance':
            return 'text-orange-400 border-orange-500/50 bg-orange-500/20';
        default:
            return 'text-slate-400 border-slate-700 bg-slate-800';
    }
}

export function RecentActivity({ activities }: RecentActivityProps) {
    if (!activities || activities.length === 0) {
        return (
            <Card padding="md">
                <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
                <p className="text-slate-500 italic">No recent activity found.</p>
            </Card>
        );
    }

    return (
        <Card padding="md" className="h-full">
            <h3 className="text-lg font-bold text-white mb-6">Recent Activity</h3>
            <div className="max-h-[400px] overflow-y-auto pr-2">
                <Timeline>
                    {activities.map((item, index) => {
                        const iconColorClass = getColorClass(item.action);
                        return (
                            <TimelineItem
                                key={`${item.entity_id}-${index}`}
                                isLast={index === activities.length - 1}
                                bullet={
                                    <div className={`flex items-center justify-center w-full h-full rounded-full ${iconColorClass}`}>
                                        {getIconForAction(item.action)}
                                    </div>
                                }
                                title={item.description}
                                className={index === activities.length - 1 ? 'pb-0' : ''}
                            >
                                <span className="text-xs text-slate-500">
                                    {item.action} by {item.user_name || 'System'} - {dayjs(item.created_at).fromNow()}
                                </span>
                            </TimelineItem>
                        );
                    })}
                </Timeline>
            </div>
        </Card>
    );
}
