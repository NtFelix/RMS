"use client"

import { useState, useEffect } from 'react';
import { useSearchAnalytics } from '@/hooks/use-search-analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Clock, Search, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';

interface SearchPerformanceDashboardProps {
  className?: string;
}

export function SearchPerformanceDashboard({ className }: SearchPerformanceDashboardProps) {
  const { getAnalytics, resetAnalytics } = useSearchAnalytics();
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAnalytics = () => {
    setIsLoading(true);
    try {
      const data = getAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleReset = () => {
    resetAnalytics();
    loadAnalytics();
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Lade Suchstatistiken...</span>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Keine Suchstatistiken verfügbar</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Such-Performance Dashboard</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Zurücksetzen
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Searches */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamte Suchen</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalSearches}</div>
            <p className="text-xs text-muted-foreground">
              Seit dem letzten Reset
            </p>
          </CardContent>
        </Card>

        {/* Average Response Time */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ø Antwortzeit</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.averageResponseTime.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Durchschnittliche Serverantwort
            </p>
          </CardContent>
        </Card>

        {/* Cache Hit Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache-Trefferrate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analytics.cacheHitRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Aus dem Cache geliefert
            </p>
          </CardContent>
        </Card>

        {/* Error Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fehlerrate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analytics.errorRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Fehlgeschlagene Suchen
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Popular Queries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Beliebte Suchanfragen
          </CardTitle>
          <CardDescription>
            Die häufigsten Suchbegriffe der letzten Zeit
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.popularQueries.length > 0 ? (
            <div className="space-y-2">
              {analytics.popularQueries.map(({ query, count }: any, index: number) => (
                <div key={query} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <span className="font-medium">{query}</span>
                  </div>
                  <Badge variant="secondary">
                    {count} mal
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Noch keine Suchanfragen aufgezeichnet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance-Einblicke</CardTitle>
          <CardDescription>
            Automatische Analyse der Suchleistung
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.averageResponseTime > 1000 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Langsame Antwortzeiten
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    Die durchschnittliche Antwortzeit liegt über 1 Sekunde. 
                    Überprüfen Sie die Datenbankperformance.
                  </p>
                </div>
              </div>
            )}

            {analytics.errorRate > 0.1 && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Hohe Fehlerrate
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Über 10% der Suchen schlagen fehl. 
                    Überprüfen Sie die Serververbindung und Datenbankstatus.
                  </p>
                </div>
              </div>
            )}

            {analytics.cacheHitRate > 0.7 && (
              <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Gute Cache-Performance
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Über 70% der Suchen werden aus dem Cache geliefert. 
                    Das reduziert die Serverlast erheblich.
                  </p>
                </div>
              </div>
            )}

            {analytics.totalSearches === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Noch keine Suchaktivität aufgezeichnet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}