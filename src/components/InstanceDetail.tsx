import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
    Play,
    Pause,
    XCircle,
    Calendar,
    User,
    Package,
    Clock,
    GitBranch,
    Activity,
    FileText
} from 'lucide-react';
import { format } from 'date-fns';
import {
    usePauseMaestroInstance,
    useResumeMaestroInstance,
    useCancelMaestroInstance,
    useUiPathMaestroInstanceById,
    useUiPathMaestroBpmnDiagram,
    useUiPathMaestroExecutionHistory,
} from '@/hooks/useUiPathMaestro';
import { BpmnDiagramViewer } from '@/components/BpmnViewer';
import type { ProcessInstanceGetResponse } from '@uipath/uipath-typescript/maestro-processes';

interface InstanceDetailProps {
    instance: ProcessInstanceGetResponse;
    processKey: string;
    folderKey: string;
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

export function InstanceDetail({ instance, processKey, folderKey }: InstanceDetailProps) {
    const { mutate: pauseInstance, isPending: isPausing } = usePauseMaestroInstance();
    const { mutate: resumeInstance, isPending: isResuming } = useResumeMaestroInstance();
    const { mutate: cancelInstance, isPending: isCanceling } = useCancelMaestroInstance();

    // Fetch live instance data by ID for real-time updates
    const { data: liveInstance, isLoading: isInstanceLoading } = useUiPathMaestroInstanceById(
        instance.instanceId,
        folderKey
    );

    const { data: bpmnDiagram, isLoading: isBpmnLoading, error: bpmnError } = useUiPathMaestroBpmnDiagram(
        instance.instanceId,
        folderKey
    );

    const { data: executionHistory, isLoading: isHistoryLoading, error: historyError } = useUiPathMaestroExecutionHistory(
        instance.instanceId
    );

    // Use live instance data if available, otherwise fall back to prop
    const currentInstance = liveInstance || instance;

    const canPause = currentInstance.latestRunStatus.toLowerCase().includes('running');
    const canResume = currentInstance.latestRunStatus.toLowerCase().includes('pause');
    const canCancel = !currentInstance.latestRunStatus.toLowerCase().includes('complete')
        && !currentInstance.latestRunStatus.toLowerCase().includes('cancel');

    const handlePause = () => {
        pauseInstance({
            instanceId: currentInstance.instanceId,
            folderKey: folderKey,
            comment: 'Paused from Maestro Portal'
        });
    };

    const handleResume = () => {
        resumeInstance({
            instanceId: currentInstance.instanceId,
            folderKey: folderKey,
            comment: 'Resumed from Maestro Portal'
        });
    };

    const handleCancel = () => {
        if (confirm('Are you sure you want to cancel this instance?')) {
            cancelInstance({
                instanceId: currentInstance.instanceId,
                folderKey: folderKey,
                comment: 'Cancelled from Maestro Portal'
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Action Bar */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                                <Activity className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{currentInstance.instanceDisplayName}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge className={`${getStatusColor(currentInstance.latestRunStatus)} text-white`}>
                                        {currentInstance.latestRunStatus}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                        {currentInstance.startedTime && !isNaN(new Date(currentInstance.startedTime).getTime())
                                            ? `Started ${format(new Date(currentInstance.startedTime), 'PPp')}`
                                            : 'Start time unknown'
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {canPause && (
                                <Button onClick={handlePause} disabled={isPausing} variant="outline">
                                    <Pause className="w-4 h-4 mr-2" />
                                    {isPausing ? 'Pausing...' : 'Pause'}
                                </Button>
                            )}
                            {canResume && (
                                <Button onClick={handleResume} disabled={isResuming}>
                                    <Play className="w-4 h-4 mr-2" />
                                    {isResuming ? 'Resuming...' : 'Resume'}
                                </Button>
                            )}
                            {canCancel && (
                                <Button onClick={handleCancel} disabled={isCanceling} variant="destructive">
                                    <XCircle className="w-4 h-4 mr-2" />
                                    {isCanceling ? 'Cancelling...' : 'Cancel'}
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Information */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="bpmn">BPMN Diagram</TabsTrigger>
                    <TabsTrigger value="execution">Execution History</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    Instance Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Instance ID:</span>
                                    <span className="font-mono text-xs">{currentInstance.instanceId}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Package Key:</span>
                                    <span className="font-mono text-xs">{currentInstance.packageKey}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Package Version:</span>
                                    <span className="font-mono text-xs">{currentInstance.packageVersion}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Process Key:</span>
                                    <span className="font-mono text-xs">{currentInstance.processKey}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Execution Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Started By:</span>
                                    <span className="font-medium">{currentInstance.startedByUser}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Source:</span>
                                    <span className="font-medium">{currentInstance.source}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Folder:</span>
                                    <span className="font-medium">{currentInstance.folderKey}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">User ID:</span>
                                    <span className="font-mono text-xs">{currentInstance.userId}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Timestamps
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Started:</span>
                                    <span>
                                        {currentInstance.startedTime && !isNaN(new Date(currentInstance.startedTime).getTime())
                                            ? format(new Date(currentInstance.startedTime), 'PPp')
                                            : 'N/A'
                                        }
                                    </span>
                                </div>
                                <Separator />
                                {currentInstance.completedTime && !isNaN(new Date(currentInstance.completedTime).getTime()) ? (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Completed:</span>
                                        <span>{format(new Date(currentInstance.completedTime), 'PPp')}</span>
                                    </div>
                                ) : (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Status:</span>
                                        <Badge variant="secondary">In Progress</Badge>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <GitBranch className="h-4 w-4" />
                                    Latest Run
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Run ID:</span>
                                    <span className="font-mono text-xs">{currentInstance.latestRunId}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status:</span>
                                    <Badge className={`${getStatusColor(currentInstance.latestRunStatus)} text-white`}>
                                        {currentInstance.latestRunStatus}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="bpmn" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                BPMN Process Diagram
                            </CardTitle>
                            <CardDescription>
                                Visual representation of the process flow
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isBpmnLoading ? (
                                <div className="border-2 border-dashed border-muted rounded-lg p-12 text-center">
                                    <div className="animate-spin h-16 w-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                                    <p className="text-sm text-muted-foreground">Loading BPMN diagram...</p>
                                </div>
                            ) : bpmnError ? (
                                <div className="border-2 border-dashed border-destructive/30 rounded-lg p-12 text-center">
                                    <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                                    <p className="text-lg font-semibold mb-2 text-destructive">Failed to load diagram</p>
                                    <p className="text-sm text-muted-foreground">
                                        {bpmnError.message || 'Could not fetch BPMN diagram data'}
                                    </p>
                                </div>
                            ) : bpmnDiagram ? (
                                <div className="space-y-4">
                                    <BpmnDiagramViewer xml={bpmnDiagram} />
                                    <div className="flex items-center justify-between text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
                                        <div className="space-y-1">
                                            <p>Process: {currentInstance.processKey}</p>
                                            <p>Package: {currentInstance.packageId} v{currentInstance.packageVersion}</p>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p>Instance: {currentInstance.instanceId}</p>
                                            <p>Status: {currentInstance.latestRunStatus}</p>
                                        </div>
                                    </div>
                                    <details className="mt-2">
                                        <summary className="text-xs font-medium cursor-pointer hover:text-primary p-2 border rounded-lg hover:bg-muted/50 transition-colors">
                                            View BPMN XML Source (click to expand)
                                        </summary>
                                        <pre className="mt-2 p-3 bg-background rounded text-xs overflow-auto max-h-96 border">
                                            {bpmnDiagram}
                                        </pre>
                                    </details>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-muted rounded-lg p-12 text-center">
                                    <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-lg font-semibold mb-2">No BPMN Diagram Available</p>
                                    <p className="text-sm text-muted-foreground">
                                        BPMN diagram data is not available for this instance.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="execution" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Execution History
                            </CardTitle>
                            <CardDescription>
                                All runs for this process instance ({currentInstance.instanceRuns?.length || 0} total)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isHistoryLoading ? (
                                <div className="flex items-center justify-center p-8">
                                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                                    <span className="ml-3 text-muted-foreground">Loading execution history...</span>
                                </div>
                            ) : historyError ? (
                                <div className="text-center p-8 text-muted-foreground">
                                    <p className="text-sm">Could not load detailed execution history.</p>
                                    <p className="text-xs mt-2">Showing basic instance runs below.</p>
                                </div>
                            ) : executionHistory ? (
                                <div className="space-y-4">
                                    <div className="border rounded-lg p-4 bg-muted/30">
                                        <p className="text-sm font-medium mb-2">Detailed Execution History</p>
                                        <pre className="text-xs overflow-auto max-h-64 bg-background p-3 rounded border">
                                            {JSON.stringify(executionHistory, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            ) : null}

                            {currentInstance.instanceRuns && currentInstance.instanceRuns.length > 0 ? (
                                <div className="space-y-3 mt-4">
                                    <p className="text-sm font-medium">Instance Runs ({currentInstance.instanceRuns.length})</p>
                                    {currentInstance.instanceRuns.map((run, index) => (
                                        <div
                                            key={run.runId}
                                            className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className="font-mono">
                                                        Run #{currentInstance.instanceRuns.length - index}
                                                    </Badge>
                                                    <Badge className={`${getStatusColor(run.status)} text-white`}>
                                                        {run.status}
                                                    </Badge>
                                                </div>
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    {run.runId}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-muted-foreground">Started:</span>
                                                    <p className="font-medium">
                                                        {run.startedTime && !isNaN(new Date(run.startedTime).getTime())
                                                            ? format(new Date(run.startedTime), 'PPp')
                                                            : 'N/A'
                                                        }
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Completed:</span>
                                                    <p className="font-medium">
                                                        {run.completedTime && !isNaN(new Date(run.completedTime).getTime())
                                                            ? format(new Date(run.completedTime), 'PPp')
                                                            : 'In progress'
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No execution history available
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

