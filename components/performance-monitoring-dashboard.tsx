/**
 * Performance Monitoring Dashboard Component
 * 
 * Provides real-time monitoring of database function performance
 * for the betriebskosten optimization system.
 * 
 * @see .kiro/specs/betriebskosten-performance-optimization/tasks.md - Task 9
 */

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import {
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Database,
    RefreshCw
} from 'lucide-react';

// Import performance monitoring utilities
import { PerformanceMonitor, PerformanceMetrics } from '@/lib/error-handling';

interface PerformanceStats {
    functionName: string;
    averageExecutionTime: number;
    successRate: number;
    totalCalls: number;
    slowCalls: number;
    errorCount: number;
}

interface PerformanceDashboardProps {
    className?: string;
    refreshInterval?: number; // in milliseconds
}

const PERFORMANCE_THRESHOLDS = {
    FAST: 1000,      // < 1s is fast (green)
    ACCEPTABLE: 3000, // < 3s is acceptable (yellow)
    SLOW: 5000,      // < 5s is slow (orange)
    TIMEOUT: 10000   // > 10s should timeout (red)
};

const COLORS = {
    fast: '#22c55e',      // green
    acceptable: '#eab308', // yellow
    slow: '#f97316',      // orange
    timeout: '#ef4444'    // red
};

export function PerformanceMonitoringDashboard({
    className = '',
    refreshInterval = 30000
}: PerformanceDashboardProps) {
    const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
    const [stats, setStats] = useState<PerformanceStats[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    // Function names we're monitoring - includes all critical betriebskosten operations
    const monitoredFunctions = [
        'get_nebenkosten_with_metrics',
        'get_wasserzaehler_modal_data', 
        'get_abrechnung_modal_data',
        'save_wasserzaehler_batch',
        'fetchNebenkostenListOptimized',
        'getWasserzaehlerModalDataAction',
        'getAbrechnungModalDataAction',
        'saveWasserzaehlerData'
    ];

    const refreshData = () => {
        setIsLoading(true);

        // Get metrics from the last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentMetrics = PerformanceMonitor.getMetrics(undefined, oneHourAgo);

        setMetrics(recentMetrics);

        // Calculate stats for each function
        const functionStats: PerformanceStats[] = monitoredFunctions.map(functionName => {
            const functionMetrics = PerformanceMonitor.getMetrics(functionName, oneHourAgo);
            const averageExecutionTime = PerformanceMonitor.getAverageExecutionTime(functionName, oneHourAgo);
            const successRate = PerformanceMonitor.getSuccessRate(functionName, oneHourAgo);
            const slowCalls = functionMetrics.filter(m => m.executionTime > PERFORMANCE_THRESHOLDS.ACCEPTABLE).length;
            const errorCount = functionMetrics.filter(m => !m.success).length;

            return {
                functionName,
                averageExecutionTime,
                successRate,
                totalCalls: functionMetrics.length,
                slowCalls,
                errorCount
            };
        });

        setStats(functionStats);
        setLastUpdate(new Date());
        setIsLoading(false);
    };

    useEffect(() => {
        refreshData();

        const interval = setInterval(refreshData, refreshInterval);
        return () => clearInterval(interval);
    }, [refreshInterval]);



    const getPerformanceBadge = (executionTime: number): React.ReactNode => {
        if (executionTime < PERFORMANCE_THRESHOLDS.FAST) {
            return <Badge variant="default" className="bg-green-500">Schnell</Badge>;
        }
        if (executionTime < PERFORMANCE_THRESHOLDS.ACCEPTABLE) {
            return <Badge variant="secondary">Akzeptabel</Badge>;
        }
        if (executionTime < PERFORMANCE_THRESHOLDS.SLOW) {
            return <Badge variant="destructive" className="bg-orange-500">Langsam</Badge>;
        }
        return <Badge variant="destructive">Sehr langsam</Badge>;
    };

    const chartData = stats.map(stat => ({
        name: stat.functionName.replace('get_', '').replace('_', ' '),
        executionTime: Math.round(stat.averageExecutionTime),
        successRate: Math.round(stat.successRate * 100),
        totalCalls: stat.totalCalls
    }));

    const pieData = [
        { name: 'Erfolgreich', value: metrics.filter(m => m.success).length, color: COLORS.fast },
        { name: 'Fehler', value: metrics.filter(m => !m.success).length, color: COLORS.timeout }
    ];

    const slowOperations = PerformanceMonitor.getSlowOperations(PERFORMANCE_THRESHOLDS.ACCEPTABLE);

    return (
        <div className={`space-y-6 ${className}`}>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Performance Monitoring</h2>
                    <p className="text-muted-foreground">
                        Überwachung der Datenbankfunktionen für Betriebskosten-Optimierung
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                        Letztes Update: {lastUpdate.toLocaleTimeString()}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshData}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gesamt Aufrufe</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.length}</div>
                        <p className="text-xs text-muted-foreground">Letzte Stunde</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Erfolgsrate</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {metrics.length > 0
                                ? Math.round((metrics.filter(m => m.success).length / metrics.length) * 100)
                                : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {metrics.filter(m => m.success).length} von {metrics.length}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Langsame Operationen</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{slowOperations.length}</div>
                        <p className="text-xs text-muted-foreground">
                            &gt; {PERFORMANCE_THRESHOLDS.ACCEPTABLE}ms
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Fehler</CardTitle>
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {metrics.filter(m => !m.success).length}
                        </div>
                        <p className="text-xs text-muted-foreground">Fehlgeschlagene Aufrufe</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Übersicht</TabsTrigger>
                    <TabsTrigger value="functions">Funktionen</TabsTrigger>
                    <TabsTrigger value="charts">Diagramme</TabsTrigger>
                    <TabsTrigger value="alerts">Warnungen</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Ausführungszeiten</CardTitle>
                                <CardDescription>Durchschnittliche Ausführungszeiten pro Funktion</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip formatter={(value) => [`${value}ms`, 'Ausführungszeit']} />
                                        <Bar
                                            dataKey="executionTime"
                                            fill="#8884d8"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Erfolg vs. Fehler</CardTitle>
                                <CardDescription>Verteilung der erfolgreichen und fehlgeschlagenen Aufrufe</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            dataKey="value"
                                            label={({ name, value }) => `${name}: ${value}`}
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="functions" className="space-y-4">
                    <div className="grid gap-4">
                        {stats.map((stat) => (
                            <Card key={stat.functionName}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">{stat.functionName}</CardTitle>
                                        {getPerformanceBadge(stat.averageExecutionTime)}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-sm font-medium">Durchschnittliche Zeit</p>
                                            <p className="text-2xl font-bold">
                                                {Math.round(stat.averageExecutionTime)}ms
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Erfolgsrate</p>
                                            <p className="text-2xl font-bold">
                                                {Math.round(stat.successRate * 100)}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Gesamt Aufrufe</p>
                                            <p className="text-2xl font-bold">{stat.totalCalls}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Langsame Aufrufe</p>
                                            <p className="text-2xl font-bold text-orange-600">{stat.slowCalls}</p>
                                        </div>
                                    </div>

                                    {stat.totalCalls > 0 && (
                                        <div className="mt-4">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>Performance</span>
                                                <span>{Math.round(stat.successRate * 100)}%</span>
                                            </div>
                                            <Progress value={stat.successRate * 100} className="h-2" />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="charts" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Performance Trend</CardTitle>
                            <CardDescription>Ausführungszeiten über Zeit</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={metrics.slice(-50).map((m, index) => ({
                                    index,
                                    time: m.executionTime,
                                    success: m.success ? 1 : 0
                                }))}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="index" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line
                                        type="monotone"
                                        dataKey="time"
                                        stroke="#8884d8"
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="alerts" className="space-y-4">
                    {slowOperations.length > 0 && (
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>{slowOperations.length} langsame Operationen</strong> in der letzten Stunde erkannt.
                                Überprüfen Sie die Datenbankperformance.
                            </AlertDescription>
                        </Alert>
                    )}

                    {metrics.filter(m => !m.success).length > 0 && (
                        <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>{metrics.filter(m => !m.success).length} Fehler</strong> in der letzten Stunde aufgetreten.
                                Überprüfen Sie die Logs für Details.
                            </AlertDescription>
                        </Alert>
                    )}

                    {slowOperations.length === 0 && metrics.filter(m => !m.success).length === 0 && (
                        <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                                Alle Systeme funktionieren normal. Keine Warnungen oder Fehler erkannt.
                            </AlertDescription>
                        </Alert>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Letzte langsame Operationen</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {slowOperations.slice(0, 10).map((operation, index) => (
                                <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                                    <div>
                                        <p className="font-medium">{operation.functionName}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {operation.timestamp.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold">{Math.round(operation.executionTime)}ms</p>
                                        {getPerformanceBadge(operation.executionTime)}
                                    </div>
                                </div>
                            ))}

                            {slowOperations.length === 0 && (
                                <p className="text-muted-foreground text-center py-4">
                                    Keine langsamen Operationen in der letzten Stunde
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}