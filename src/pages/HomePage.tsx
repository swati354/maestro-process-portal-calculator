import { useState } from 'react';
import { ProcessList } from '@/components/ProcessList';
import { InstanceList } from '@/components/InstanceList';
import { InstanceDetail } from '@/components/InstanceDetail';
import { useUiPathMaestroProcesses, useUiPathMaestroInstances } from '@/hooks/useUiPathMaestro';
import { AlertCircle, Workflow, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import type { MaestroProcessGetAllResponse, ProcessInstanceGetResponse } from '@uipath/uipath-typescript/maestro-processes';

type ViewState =
    | { level: 'processes' }
    | { level: 'instances'; process: MaestroProcessGetAllResponse }
    | { level: 'detail'; process: MaestroProcessGetAllResponse; instance: ProcessInstanceGetResponse };

export function HomePage() {
    const [viewState, setViewState] = useState<ViewState>({ level: 'processes' });
    const { data: processes, isLoading: loadingProcesses, error: processError, refetch: refetchProcesses } = useUiPathMaestroProcesses();
    const { data: allInstances, isLoading: loadingInstances, error: instanceError, refetch: refetchInstances } = useUiPathMaestroInstances();

    const handleProcessSelect = (process: MaestroProcessGetAllResponse) => {
        setViewState({ level: 'instances', process });
    };

    const handleInstanceSelect = (instance: ProcessInstanceGetResponse) => {
        if (viewState.level === 'instances') {
            setViewState({ level: 'detail', process: viewState.process, instance });
        }
    };

    const handleBackToProcesses = () => {
        setViewState({ level: 'processes' });
    };

    const handleBackToInstances = () => {
        if (viewState.level === 'detail') {
            setViewState({ level: 'instances', process: viewState.process });
        }
    };

    // Filter instances for selected process
    const processInstances = viewState.level !== 'processes' && allInstances
        ? allInstances.filter(inst => inst.processKey === viewState.process.processKey)
        : [];

    const error = processError || instanceError;

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                    {/* Header */}
                    <header className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {viewState.level !== 'processes' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={viewState.level === 'instances' ? handleBackToProcesses : handleBackToInstances}
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>
                                )}
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                                    <Workflow className="h-7 w-7 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold">
                                        {viewState.level === 'processes' && 'Maestro Process Portal'}
                                        {viewState.level === 'instances' && viewState.process.name}
                                        {viewState.level === 'detail' && viewState.instance.instanceDisplayName}
                                    </h1>
                                    <p className="text-muted-foreground">
                                        {viewState.level === 'processes' && 'Browse and monitor your Maestro process orchestrations'}
                                        {viewState.level === 'instances' && 'View all instances for this process'}
                                        {viewState.level === 'detail' && 'Detailed execution information and BPMN diagram'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Error Alert */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>
                                Failed to load data: {(error as Error).message}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Content */}
                    {viewState.level === 'processes' && (
                        <ProcessList
                            processes={processes || []}
                            isLoading={loadingProcesses}
                            onProcessSelect={handleProcessSelect}
                            onRefresh={refetchProcesses}
                        />
                    )}

                    {viewState.level === 'instances' && (
                        <InstanceList
                            instances={processInstances}
                            isLoading={loadingInstances}
                            onInstanceSelect={handleInstanceSelect}
                            onRefresh={refetchInstances}
                        />
                    )}

                    {viewState.level === 'detail' && (
                        <InstanceDetail
                            instance={viewState.instance}
                            processKey={viewState.process.processKey}
                            folderKey={viewState.process.folderKey}
                        />
                    )}
            </div>
            <Toaster richColors closeButton />
        </div>
    );
}

