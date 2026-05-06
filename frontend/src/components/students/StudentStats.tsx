import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

interface StatProps {
  name: string;
  value: string;
  icon: React.ElementType;
  color: string;
  trend?: string;
  trendDirection?: string;
}

interface StudentStatsProps {
  stats: StatProps[];
}

const StudentStats: React.FC<StudentStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.name} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <div className={`${stat.color} p-2 rounded-full`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.trend ? (
                <div className="flex items-center pt-1 text-xs">
                  <span
                    className={`${
                      stat.trendDirection === "up"
                        ? stat.name === "At-Risk Students"
                          ? "text-red-500"
                          : "text-green-500"
                        : stat.name === "At-Risk Students"
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {stat.trend}
                  </span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default StudentStats;
