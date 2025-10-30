import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { VoiceNote, EmotionData } from '@/types/voice-note';

interface EmotionChartProps {
  notes: VoiceNote[];
}

export const EmotionChart = ({ notes }: EmotionChartProps) => {
  const chartData = useMemo(() => {
    // Group notes by date
    const groupedByDate = notes.reduce((acc, note) => {
      const date = note.createdAt.toDateString();
      if (!acc[date]) {
        acc[date] = { happy: 0, neutral: 0, sad: 0 };
      }
      acc[date][note.emotion]++;
      return acc;
    }, {} as Record<string, { happy: number; neutral: number; sad: number }>);

    // Convert to array and sort by date
    const sortedData = Object.entries(groupedByDate)
      .map(([date, emotions]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ...emotions,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7); // Last 7 days

    return sortedData;
  }, [notes]);

  const pieData = useMemo(() => {
    const totals = notes.reduce(
      (acc, note) => {
        acc[note.emotion]++;
        return acc;
      },
      { happy: 0, neutral: 0, sad: 0 }
    );

    return [
      { name: 'Happy', value: totals.happy, color: '#22c55e' },
      { name: 'Neutral', value: totals.neutral, color: '#3b82f6' },
      { name: 'Sad', value: totals.sad, color: '#f97316' },
    ].filter(item => item.value > 0);
  }, [notes]);

  const totalNotes = notes.length;

  if (totalNotes === 0) {
    return (
      <Card className="p-8 text-center bg-card border-0 shadow-soft">
        <p className="text-muted-foreground">
          Start recording voice notes to see your emotion trends!
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Trend Chart */}
      <Card className="p-6 bg-card border-0 shadow-soft">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Emotion Trends</h3>
            <p className="text-sm text-muted-foreground">Daily emotion patterns over the past week</p>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Area
                  type="monotone"
                  dataKey="happy"
                  stackId="1"
                  stroke="hsl(var(--happy))"
                  fill="hsl(var(--happy))"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="neutral"
                  stackId="1"
                  stroke="hsl(var(--neutral))"
                  fill="hsl(var(--neutral))"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="sad"
                  stackId="1"
                  stroke="hsl(var(--sad))"
                  fill="hsl(var(--sad))"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* Distribution Chart */}
      <Card className="p-6 bg-card border-0 shadow-soft">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Emotion Distribution</h3>
            <p className="text-sm text-muted-foreground">Overall breakdown of {totalNotes} notes</p>
          </div>
          
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  startAngle={90}
                  endAngle={450}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="flex justify-center space-x-6">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-foreground">
                  {entry.name} ({entry.value})
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};