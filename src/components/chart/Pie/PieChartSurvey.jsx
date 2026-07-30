// src/components/chart/pie/PieChartSurvey
import "chart.js/auto";
import { Pie } from "react-chartjs-2";

const PieChartSurvey = ({
  data = {
    1: { count: 1, totalBonus: 0 },
    2: { count: 1, totalBonus: 0 },
    3: { count: 1, totalBonus: 0 },
  },
}) => {
  const pieOptions = {
    data: {
      datasets: [
        {
          data: [
            data?.[1]?.count ?? 0,
            data?.[2]?.count ?? 0,
            data?.[3]?.count ?? 0,
          ],
          backgroundColor: ["#22c55e", "#ef4444", "#eab308"],
          label: "כמות",
        },
      ],
      labels: ["מרוצה (1)", "לא מרוצה (2)", "מרוצה אך היו טעויות / חוסרים (3)"],
    },
    options: {
      responsive: true,
      cutoutPercentage: 80,
    },
    legend: {
      display: false,
    },
  };

  return (
    <div>
      <Pie {...pieOptions} className="chart" />
    </div>
  );
};

export default PieChartSurvey;
