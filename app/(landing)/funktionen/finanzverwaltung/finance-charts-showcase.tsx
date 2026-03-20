'use client';

import { motion } from 'framer-motion';
import { BarChart3, Home, PieChart, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart as RechartsPieChart,
  PieLabelRenderProps,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const incomeByApartmentData = [
  { name: 'Wohnung A', value: 1250 },
  { name: 'Wohnung B', value: 980 },
  { name: 'Wohnung C', value: 1100 },
];

const monthlyIncomeData = [
  { month: 'Jan', einnahmen: 3330 },
  { month: 'Feb', einnahmen: 3330 },
  { month: 'Mär', einnahmen: 3580 },
  { month: 'Apr', einnahmen: 3580 },
  { month: 'Mai', einnahmen: 3580 },
  { month: 'Jun', einnahmen: 3720 },
];

const incomeExpenseData = [
  { name: 'Einnahmen', value: 3580, fill: '#10b981' },
  { name: 'Ausgaben', value: 1240, fill: '#ef4444' },
];

const expenseCategoriesData = [
  { name: 'Instandhaltung', value: 520 },
  { name: 'Versicherungen', value: 380 },
  { name: 'Steuern', value: 340 },
];

const COLORS = ['#2c3e50', '#34495e', '#16a34a', '#ca8a04', '#dc2626', '#2563eb'];

function renderCustomLabel(props: PieLabelRenderProps) {
  const cx = props.cx || 0;
  const cy = props.cy || 0;
  const midAngle = props.midAngle || 0;
  const outerRadius = props.outerRadius || 0;
  const percent = props.percent || 0;
  const name = props.name || '';
  const index = props.index || 0;
  const radius = outerRadius + 25;
  const radian = Math.PI / 180;
  const x = cx + radius * Math.cos(-midAngle * radian);
  const y = cy + radius * Math.sin(-midAngle * radian);

  return (
    <text
      x={x}
      y={y}
      fill={COLORS[index % COLORS.length]}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-sm font-semibold"
      style={{ fontSize: '12px' }}
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function FinanceChartsShowcase() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
            Intelligente Finanzvisualisierung
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Erhalten Sie wertvolle Einblicke durch interaktive Diagramme und detaillierte Analysen Ihrer finanziellen Daten.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="group"
          >
            <Card className="h-full bg-gradient-to-br from-card to-card/80 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Home className="w-5 h-5 text-primary" />
                  </div>
                  <Badge variant="secondary" className="text-xs">Kreisdiagramm</Badge>
                </div>
                <CardTitle className="text-lg">Einnahmen nach Wohnung</CardTitle>
                <CardDescription className="text-sm">
                  Verteilung der Mieteinnahmen nach Wohnungen
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="hidden lg:block">
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={incomeByApartmentData}
                          cx="50%"
                          cy="50%"
                          labelLine
                          label={renderCustomLabel}
                          outerRadius={60}
                          dataKey="value"
                          nameKey="name"
                        >
                          {incomeByApartmentData.map((entry, index) => (
                            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toLocaleString('de-DE')} €`} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:hidden space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Wohnung A</span>
                    <span className="font-medium">€1.250</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Wohnung B</span>
                    <span className="font-medium">€980</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Wohnung C</span>
                    <span className="font-medium">€1.100</span>
                  </div>
                  <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full" style={{ width: '75%' }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="group"
          >
            <Card className="h-full bg-gradient-to-br from-card to-card/80 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <Badge variant="secondary" className="text-xs">Liniendiagramm</Badge>
                </div>
                <CardTitle className="text-lg">Monatliche Einnahmen</CardTitle>
                <CardDescription className="text-sm">
                  Zeitlicher Verlauf Ihrer Mieteinnahmen
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="hidden lg:block">
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyIncomeData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip formatter={(value: number) => `${value.toLocaleString('de-DE')} €`} />
                        <Line
                          type="monotone"
                          dataKey="einnahmen"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ fill: '#10b981', r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:hidden space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Jan</span>
                    <span className="font-medium text-green-600">€3.330</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Feb</span>
                    <span className="font-medium text-green-600">€3.330</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Mär</span>
                    <span className="font-medium text-green-600">€3.580</span>
                  </div>
                  <div className="mt-4 flex items-center gap-1">
                    <div className="h-8 w-1 bg-green-500/20 rounded" />
                    <div className="h-8 w-1 bg-green-500/40 rounded" />
                    <div className="h-8 w-1 bg-green-500/60 rounded" />
                    <div className="h-8 w-1 bg-green-500/80 rounded" />
                    <div className="h-8 w-1 bg-green-500 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="group"
          >
            <Card className="h-full bg-gradient-to-br from-card to-card/80 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                  </div>
                  <Badge variant="secondary" className="text-xs">Balkendiagramm</Badge>
                </div>
                <CardTitle className="text-lg">Einnahmen vs Ausgaben</CardTitle>
                <CardDescription className="text-sm">
                  Vergleich von Einnahmen und Ausgaben
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="hidden lg:block">
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={incomeExpenseData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip formatter={(value: number) => `${value.toLocaleString('de-DE')} €`} />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:hidden space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Einnahmen</span>
                    <span className="font-medium text-green-500">€3.580</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Ausgaben</span>
                    <span className="font-medium text-red-500">€1.240</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>Cashflow</span>
                    <span className="text-green-500">+€2.340</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <div className="h-4 bg-green-500/20 rounded flex-1" />
                    <div className="h-4 bg-red-500/20 rounded w-1/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="group"
          >
            <Card className="h-full bg-gradient-to-br from-card to-card/80 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <PieChart className="w-5 h-5 text-orange-500" />
                  </div>
                  <Badge variant="secondary" className="text-xs">Kreisdiagramm</Badge>
                </div>
                <CardTitle className="text-lg">Ausgabenkategorien</CardTitle>
                <CardDescription className="text-sm">
                  Verteilung der Ausgaben nach Kategorien
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="hidden lg:block">
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={expenseCategoriesData}
                          cx="50%"
                          cy="50%"
                          labelLine
                          label={renderCustomLabel}
                          outerRadius={60}
                          dataKey="value"
                          nameKey="name"
                        >
                          {expenseCategoriesData.map((entry, index) => (
                            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toLocaleString('de-DE')} €`} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:hidden space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Instandhaltung</span>
                    <span className="font-medium">€520</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Versicherungen</span>
                    <span className="font-medium">€380</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Steuern</span>
                    <span className="font-medium">€340</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-1">
                    <div className="h-2 bg-orange-500/60 rounded" />
                    <div className="h-2 bg-blue-500/60 rounded" />
                    <div className="h-2 bg-purple-500/60 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
