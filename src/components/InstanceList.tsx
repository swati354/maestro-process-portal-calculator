import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ChevronRight, Clock, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import type { ProcessInstanceGetResponse } from '@uipath/uipath-typescript/maestro-processes';

interface InstanceListProps {
    instances: ProcessInstanceGetResponse[];
    isLoading: boolean;
    onInstanceSelect: (instance: ProcessInstanceGetResponse) => void;
    onRefresh: () => void;
}

function getStatusColor(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('complete') || statusLower.includes('success')) return 'bg-green-500';
    if (statusLower.includes('running') || statusLower.includes('active')) return 'bg-blue-500';
    if (statusLower.includes('fault') || statusLower.includes('error') || statusLower.includes('failed')) return 'bg-red-500';
    if (statusLower.includes('pause')) return 'bg-yellow-500';
    if (statusLower.includes('cancel')) return 'bg-gray-500';
    return 'bg-gray-400';
}

export function InstanceList({ instances, isLoading, onInstanceSelect, onRefresh }: InstanceListProps) {
    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                    {instances.length} {instances.length === 1 ? 'instance' : 'instances'} found
                </p>
                <Button onClick={onRefresh} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {instances.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-semibold mb-2">No instances found</p>
                        <p className="text-sm text-muted-foreground">
                            Start this process to create instances.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {instances.map((instance) => (
                        <Card
                            key={instance.instanceId}
                            className="hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => onInstanceSelect(instance)}
                        >
                            <CardHeader className="pb-3 min-w-0">
                                <div className="flex items-start justify-between gap-2 min-w-0">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle
                                            className="text-lg font-semibold flex items-center gap-2 min-w-0"
                                            title={instance.instanceDisplayName}
                                        >
                                            <span className="truncate min-w-0">{instance.instanceDisplayName}</span>
                                            <Badge className={`${getStatusColor(instance.latestRunStatus)} text-white flex-shrink-0`}>
                                                {instance.latestRunStatus}
                                            </Badge>
                                        </CardTitle>
                                        <div className="mt-2 space-y-1">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <User className="h-3 w-3" />
                                                <span>Started by {instance.startedByUser}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                <span>
                                                    {instance.startedTime && !isNaN(new Date(instance.startedTime).getTime())
                                                        ? format(new Date(instance.startedTime), 'PPp')
                                                        : 'N/A'
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground ml-2" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                    <div>
                                        <span className="font-medium">Version:</span>{' '}
                                        <span className="font-mono">{instance.packageVersion}</span>
                                    </div>
                                    <div>
                                        <span className="font-medium">Runs:</span>{' '}
                                        <span>{instance.instanceRuns?.length || 0}</span>
                                    </div>
                                    {instance.completedTime && !isNaN(new Date(instance.completedTime).getTime()) && (
                                        <div>
                                            <span className="font-medium">Completed:</span>{' '}
                                            <span>{format(new Date(instance.completedTime), 'PP')}</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

