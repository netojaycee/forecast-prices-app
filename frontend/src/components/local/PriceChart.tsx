"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PriceChartProps {
  data: { location: string; price: number }[];
}

export default function PriceChart({ data }: PriceChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Predicted Wheat Prices by Location</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width='100%' height={400}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey='location' />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey='price' fill='#8884d8' />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
