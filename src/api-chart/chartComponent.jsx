import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const NODE_RED_API_URL = 'http://192.168.1.247:1880/api/chart-data';

function ChartComponent() {
    const [data, setData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(NODE_RED_API_URL);
                const rawData = await response.json();

                setData(rawData);
            } catch (err) {
                console.error("Failed to fetch data from Node-RED", err);
            }
        };
        fetchData();
    }, []);

    const chartData = {
        labels: data.map(item => new Date(item.timestamp).toLocaleString()),
        datasets: [
            {
                label: 'Sensor bladeless-turbine',
                data: data.map(item => item.sensor),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            },
        ],
    };

    if(data.length === 0) {
        return <div>wait data</div>
    }

    return (
        <div style={{ padding: '20px' }}>
            <h1>Sensor</h1>
            <div style={{ width: '110%', height: '300px'}}>
                <Bar data={chartData} options={{ responsive: true }} />
            </div>
        </div>
    )
}

export default ChartComponent;