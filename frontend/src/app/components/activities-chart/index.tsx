import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Activity {
  name: string;
  points: string;
  date: string;
}

interface ActivitiesChartProps {
  activities: Activity[];
}

const ActivitiesChart: React.FC<ActivitiesChartProps> = ({ activities }) => {
  // Process activities data for the chart
  const processChartData = () => {
    // Get the date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Create a map to store daily totals
    const dailyTotals = new Map<string, number>();

    // Initialize the map with the last 30 days, setting points to 0
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      dailyTotals.set(dateStr, 0);
    }

    // Aggregate points by day
    activities.forEach((activity) => {
      const activityDate = new Date(activity.date);
      if (activityDate >= thirtyDaysAgo) {
        const dateStr = activityDate.toISOString().split("T")[0];
        const currentTotal = dailyTotals.get(dateStr) || 0;
        dailyTotals.set(dateStr, currentTotal + parseInt(activity.points));
      }
    });

    // Convert map to array and sort by date
    return Array.from(dailyTotals.entries())
      .map(([date, points]) => ({
        date: new Date(date).toLocaleDateString(),
        points,
        rawDate: date, // Keep the raw date for sorting
      }))
      .sort(
        (a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime()
      );
  };

  const chartData = processChartData();

  if (!activities || activities.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400">
        No activities available
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">
        Activity Points (Last 30 Days)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            stroke="#666"
            padding={{ left: 20, right: 20 }}
            tick={{ fontSize: 12 }}
            interval={6} // Show every 7th label to avoid overcrowding
          />
          <YAxis
            stroke="#666"
            padding={{ top: 20, bottom: 20 }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
            formatter={(value) => [`${value} points`, "Points"]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="points"
            stroke="#8B5CF6"
            strokeWidth={2}
            fill="url(#activityGradient)"
            isAnimationActive={true}
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ActivitiesChart;
