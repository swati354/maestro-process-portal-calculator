import { useState, useMemo } from 'react';
import { useUiPathMaestroProcesses, useUiPathMaestroInstances } from '@/hooks/useUiPathMaestro';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Calculator, RefreshCw, TrendingUp, Clock, CheckCircle, XCircle, PauseCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ProcessInstanceGetResponse } from '@uipath/uipath-typescript/maestro-processes';

type MetricKey =
    | 'total'
    | 'completed'
    | 'running'
    | 'faulted'
    | 'paused'
    | 'cancelled'
    | 'successRate'
    | 'avgDurationMin'
    | 'totalRuns';

interface Metric {
    key: MetricKey;
    label: string;
    description: string;
}

const METRICS: Metric[] = [
    { key: 'total', label: 'Total Instances', description: 'Count of all instances' },
    { key: 'completed', label: 'Completed', description: 'Instances that completed successfully' },
    { key: 'running', label: 'Running', description: 'Currently active instances' },
    { key: 'faulted', label: 'Faulted', description: 'Instances that encountered errors' },
    { key: 'paused', label: 'Paused', description: 'Instances currently paused' },
    { key: 'cancelled', label: 'Cancelled', description: 'Instances that were cancelled' },
    { key: 'successRate', label: 'Success Rate (%)', description: 'Completed / (Completed + Faulted) × 100' },
    { key: 'avgDurationMin', label: 'Avg Duration (min)', description: 'Average run duration of completed instances' },
    { key: 'totalRuns', label: 'Total Runs', description: 'Sum of all runs across instances' },
];

type Op = '+' | '-' | '×' | '÷' | null;

function computeMetric(key: MetricKey, instances: ProcessInstanceGetResponse[]): number {
    switch (key) {
        case 'total':
            return instances.length;
        case 'completed':
            return instances.filter(i => i.latestRunStatus?.toLowerCase().includes('complete') || i.latestRunStatus?.toLowerCase().includes('success')).length;
        case 'running':
            return instances.filter(i => i.latestRunStatus?.toLowerCase().includes('running') || i.latestRunStatus?.toLowerCase().includes('active')).length;
        case 'faulted':
            return instances.filter(i => i.latestRunStatus?.toLowerCase().includes('fault') || i.latestRunStatus?.toLowerCase().includes('error') || i.latestRunStatus?.toLowerCase().includes('failed')).length;
        case 'paused':
            return instances.filter(i => i.latestRunStatus?.toLowerCase().includes('pause')).length;
        case 'cancelled':
            return instances.filter(i => i.latestRunStatus?.toLowerCase().includes('cancel')).length;
        case 'successRate': {
            const completed = instances.filter(i => i.latestRunStatus?.toLowerCase().includes('complete') || i.latestRunStatus?.toLowerCase().includes('success')).length;
            const faulted = instances.filter(i => i.latestRunStatus?.toLowerCase().includes('fault') || i.latestRunStatus?.toLowerCase().includes('error') || i.latestRunStatus?.toLowerCase().includes('failed')).length;
            const denom = completed + faulted;
            return denom === 0 ? 0 : Math.round((completed / denom) * 10000) / 100;
        }
        case 'avgDurationMin': {
            const durations: number[] = instances
                .filter(i => i.startedTime && i.completedTime)
                .map(i => {
                    const start = new Date(i.startedTime!).getTime();
                    const end = new Date(i.completedTime!).getTime();
                    return (end - start) / 60000;
                })
                .filter(d => d > 0);
            if (durations.length === 0) return 0;
            const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
            return Math.round(avg * 100) / 100;
        }
        case 'totalRuns':
            return instances.reduce((sum, i) => sum + (i.instanceRuns?.length || 0), 0);
        default:
            return 0;
    }
}

function applyOp(a: number, op: Op, b: number): number {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '×') return a * b;
    if (op === '÷') return b === 0 ? NaN : a / b;
    return b;
}

function formatResult(val: number): string {
    if (isNaN(val)) return 'Error (÷0)';
    if (!isFinite(val)) return 'Infinity';
    return Number.isInteger(val) ? String(val) : String(Math.round(val * 10000) / 10000);
}

function getStatusColor(status: string): string {
    const s = status.toLowerCase();
    if (s.includes('complete') || s.includes('success')) return 'bg-green-500';
    if (s.includes('running') || s.includes('active')) return 'bg-blue-500';
    if (s.includes('fault') || s.includes('error') || s.includes('failed')) return 'bg-red-500';
    if (s.includes('pause')) return 'bg-yellow-500';
    if (s.includes('cancel')) return 'bg-gray-500';
    return 'bg-gray-400';
}

export function CalculatorPage() {
    const { data: processes, isLoading: loadingProcesses } = useUiPathMaestroProcesses();
    const { data: allInstances, isLoading: loadingInstances, error, refetch } = useUiPathMaestroInstances();

    const [selectedProcessKey, setSelectedProcessKey] = useState<string>('__all__');

    // Calculator state
    const [displayValue, setDisplayValue] = useState<string>('0');
    const [pendingOp, setPendingOp] = useState<Op>(null);
    const [pendingValue, setPendingValue] = useState<number | null>(null);
    const [justInserted, setJustInserted] = useState(false);
    const [expression, setExpression] = useState<string>('');

    const filteredInstances = useMemo(() => {
        if (!allInstances) return [];
        if (selectedProcessKey === '__all__') return allInstances;
        return allInstances.filter(i => i.processKey === selectedProcessKey);
    }, [allInstances, selectedProcessKey]);

    const metrics = useMemo(() => {
        return METRICS.map(m => ({
            ...m,
            value: computeMetric(m.key, filteredInstances),
        }));
    }, [filteredInstances]);

    const isLoading = loadingProcesses || loadingInstances;

    // Calculator logic
    function inputMetric(value: number, label: string) {
        const display = formatResult(value);
        if (pendingOp !== null && pendingValue !== null && !justInserted) {
            // Second operand already set via digit entry — treat metric as new input
        }
        if (pendingOp !== null && pendingValue !== null && justInserted) {
            // waiting for second operand; inserting metric as second operand
            setDisplayValue(display);
            setExpression(prev => prev + display);
            setJustInserted(false);
            return;
        }
        // Replace current display
        setDisplayValue(display);
        setExpression(display);
        setPendingOp(null);
        setPendingValue(value);
        setJustInserted(false);
    }

    function pressOp(op: Op) {
        const current = parseFloat(displayValue);
        if (pendingValue !== null && pendingOp !== null && !justInserted) {
            const result = applyOp(pendingValue, pendingOp, current);
            const resultStr = formatResult(result);
            setDisplayValue(resultStr);
            setPendingValue(result);
            setExpression(resultStr + ' ' + op + ' ');
        } else {
            setPendingValue(current);
            setExpression(displayValue + ' ' + op + ' ');
        }
        setPendingOp(op);
        setJustInserted(true);
    }

    function pressEquals() {
        const current = parseFloat(displayValue);
        if (pendingValue !== null && pendingOp !== null) {
            const result = applyOp(pendingValue, pendingOp, current);
            const resultStr = formatResult(result);
            setExpression(expression + ' = ' + resultStr);
            setDisplayValue(resultStr);
            setPendingValue(result);
            setPendingOp(null);
            setJustInserted(false);
        }
    }

    function pressClear() {
        setDisplayValue('0');
        setPendingOp(null);
        setPendingValue(null);
        setJustInserted(false);
        setExpression('');
    }

    function pressDigit(d: string) {
        if (justInserted) {
            setDisplayValue(d === '.' ? '0.' : d);
            setExpression(prev => prev + (d === '.' ? '0.' : d));
            setJustInserted(false);
        } else {
            if (d === '.' && displayValue.includes('.')) return;
            const next = displayValue === '0' && d !== '.' ? d : displayValue + d;
            setDisplayValue(next);
            setExpression(prev => {
                // replace last token
                const parts = prev.split(' ');
                parts[parts.length - 1] = next;
                return parts.join(' ');
            });
        }
    }

    function pressBackspace() {
        if (displayValue.length <= 1 || displayValue === '0') {
            setDisplayValue('0');
        } else {
            const next = displayValue.slice(0, -1);
            setDisplayValue(next);
        }
    }

    function pressToggleSign() {
        const val = parseFloat(displayValue) * -1;
        setDisplayValue(formatResult(val));
    }

    function pressPercent() {
        const val = parseFloat(displayValue) / 100;
        setDisplayValue(formatResult(val));
    }

    const metricIcons: Partial<Record<MetricKey, React.ReactNode>> = {
        completed: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
        running: <TrendingUp className="h-3.5 w-3.5 text-blue-500" />,
        faulted: <XCircle className="h-3.5 w-3.5 text-red-500" />,
        paused: <PauseCircle className="h-3.5 w-3.5 text-yellow-500" />,
        cancelled: <XCircle className="h-3.5 w-3.5 text-gray-400" />,
        avgDurationMin: <Clock className="h-3.5 w-3.5 text-purple-500" />,
    };

    return (
        <div className="space-y-6">
            {/* Process selector */}
            <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground">Filter by process:</span>
                <div className="flex gap-2 flex-wrap">
                    <Button
                        variant={selectedProcessKey === '__all__' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedProcessKey('__all__')}
                    >
                        All Processes
                    </Button>
                    {(processes || []).map(p => (
                        <Button
                            key={p.processKey}
                            variant={selectedProcessKey === p.processKey ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedProcessKey(p.processKey)}
                        >
                            {p.name}
                        </Button>
                    ))}
                </div>
                <Button variant="ghost" size="sm" onClick={() => refetch()} className="ml-auto">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Failed to load instances: {(error as Error).message}</AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Metrics panel */}
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Tap a metric to use it in the calculator
                    </h2>
                    {isLoading ? (
                        <div className="grid grid-cols-2 gap-2">
                            {METRICS.map(m => (
                                <div key={m.key} className="h-16 bg-muted animate-pulse rounded-lg" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {metrics.map(m => (
                                <button
                                    key={m.key}
                                    title={m.description}
                                    onClick={() => inputMetric(m.value, m.label)}
                                    className="group text-left p-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary transition-all cursor-pointer"
                                >
                                    <div className="flex items-center gap-1.5 mb-1">
                                        {metricIcons[m.key]}
                                        <span className="text-xs text-muted-foreground truncate">{m.label}</span>
                                    </div>
                                    <div className="text-xl font-bold tabular-nums text-foreground group-hover:text-primary">
                                        {formatResult(m.value)}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Instance status summary */}
                    {!isLoading && filteredInstances.length > 0 && (
                        <Card>
                            <CardHeader className="pb-2 pt-4">
                                <CardTitle className="text-sm font-medium">Instance Status Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent className="pb-4">
                                <div className="flex flex-wrap gap-2">
                                    {Array.from(new Set(filteredInstances.map(i => i.latestRunStatus))).map(status => {
                                        const count = filteredInstances.filter(i => i.latestRunStatus === status).length;
                                        return (
                                            <Badge
                                                key={status}
                                                className={`${getStatusColor(status)} text-white cursor-pointer`}
                                                onClick={() => inputMetric(count, status)}
                                                title={`Click to use ${count} in calculator`}
                                            >
                                                {status}: {count}
                                            </Badge>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Calculator */}
                <Card className="self-start">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Calculator className="h-5 w-5" />
                            Calculator
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {/* Display */}
                        <div className="bg-muted rounded-lg p-4 text-right space-y-1 min-h-[80px] flex flex-col justify-end">
                            <div className="text-xs text-muted-foreground font-mono truncate h-4">
                                {expression || '\u00A0'}
                            </div>
                            <div className="text-3xl font-bold font-mono tabular-nums truncate">
                                {displayValue}
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="grid grid-cols-4 gap-1.5">
                            {/* Row 1 */}
                            <CalcBtn label="AC" variant="secondary" onClick={pressClear} />
                            <CalcBtn label="+/-" variant="secondary" onClick={pressToggleSign} />
                            <CalcBtn label="%" variant="secondary" onClick={pressPercent} />
                            <CalcBtn label="÷" variant="operator" onClick={() => pressOp('÷')} active={pendingOp === '÷'} />

                            {/* Row 2 */}
                            <CalcBtn label="7" onClick={() => pressDigit('7')} />
                            <CalcBtn label="8" onClick={() => pressDigit('8')} />
                            <CalcBtn label="9" onClick={() => pressDigit('9')} />
                            <CalcBtn label="×" variant="operator" onClick={() => pressOp('×')} active={pendingOp === '×'} />

                            {/* Row 3 */}
                            <CalcBtn label="4" onClick={() => pressDigit('4')} />
                            <CalcBtn label="5" onClick={() => pressDigit('5')} />
                            <CalcBtn label="6" onClick={() => pressDigit('6')} />
                            <CalcBtn label="-" variant="operator" onClick={() => pressOp('-')} active={pendingOp === '-'} />

                            {/* Row 4 */}
                            <CalcBtn label="1" onClick={() => pressDigit('1')} />
                            <CalcBtn label="2" onClick={() => pressDigit('2')} />
                            <CalcBtn label="3" onClick={() => pressDigit('3')} />
                            <CalcBtn label="+" variant="operator" onClick={() => pressOp('+')} active={pendingOp === '+'} />

                            {/* Row 5 */}
                            <CalcBtn label="⌫" variant="secondary" onClick={pressBackspace} />
                            <CalcBtn label="0" onClick={() => pressDigit('0')} />
                            <CalcBtn label="." onClick={() => pressDigit('.')} />
                            <CalcBtn label="=" variant="equals" onClick={pressEquals} />
                        </div>

                        <p className="text-xs text-center text-muted-foreground pt-1">
                            Tap any metric card on the left to insert its value
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

interface CalcBtnProps {
    label: string;
    variant?: 'default' | 'secondary' | 'operator' | 'equals';
    active?: boolean;
    onClick: () => void;
}

function CalcBtn({ label, variant = 'default', active = false, onClick }: CalcBtnProps) {
    const base = 'h-12 rounded-lg font-semibold text-base transition-all active:scale-95 cursor-pointer select-none w-full';
    const styles: Record<string, string> = {
        default: 'bg-background border border-border hover:bg-accent text-foreground',
        secondary: 'bg-muted hover:bg-muted/70 text-foreground',
        operator: active
            ? 'bg-primary text-primary-foreground'
            : 'bg-orange-500 hover:bg-orange-400 text-white',
        equals: 'bg-orange-500 hover:bg-orange-400 text-white',
    };
    return (
        <button className={`${base} ${styles[variant]}`} onClick={onClick}>
            {label}
        </button>
    );
}