import React, { useState, useEffect } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

import './VillageDashboard.css'; 

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ------------------------------------------------------------------
// *** ค่าคงที่สำหรับระบบ (ปรับปรุงตามขนาดหมู่บ้าน 40-120 หลัง) ***
// ------------------------------------------------------------------
const NODE_RED_API_BASE_URL = `http://${import.meta.env.VITE_MQTT_HOST}:1880/api`;

// 1. กำลังผลิตสูงสุดของเครื่องผลิตไฟฟ้า 1 Unit (5,000W = 5kW)
const SINGLE_UNIT_MAX_POWER = 7000; 
// 2. กำลังผลิตสูงสุดของระบบทั้งหมด (สมมติ 10 units x 5,000W = 50,000W)
const SYSTEM_MAX_CAPACITY = 50000; 
const MAX_RPM = 4000;         
// ------------------------------------------------------------------

// *** ฟังก์ชันสำหรับ Post Power Log (ใช้ POST API) ***
const sendPowerLog = async (unitId, power, demand) => {
    try {
      const payload = {
        unitId: unitId,
        currentPower: power,
        cityDemand: demand,
      };

      await fetch(`${NODE_RED_API_BASE_URL}/log-power`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

    } catch (error) {
      console.error("Failed to send power log:", error);
    }
};


function VillageDashboard({ villageId }) { 
  const [tempHistory, setTempHistory] = useState([]);
  const [rpmHistory, setRpmHistory] = useState([]);
  const [levelHistory, setLevelHistory] = useState([]);
  const [vibrationHistory, setVibrationHistory] = useState([]);
  const [currentPower, setCurrentPower] = useState(0); 
  const [cityDemand, setCityDemand] = useState(0); 
  const [systemStatus, setSystemStatus] = useState("Initializing...");
  const [statusColor, setStatusColor] = useState("#FFD700");

  // *** Dynamic Max Capacity ***
  const maxCapacity = SINGLE_UNIT_MAX_POWER;
  const powerDiffThreshold = maxCapacity * 0.1; // กำหนด Threshold 10% ของ Max Capacity

  useEffect(() => {
    const idToFetch = villageId; 

    const fetchData = async (sensorType, endpoint) => {
      try {
        const url = `${NODE_RED_API_BASE_URL}/${endpoint}?unit=${idToFetch}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${sensorType} data`);
        return await res.json(); 
      } catch (error) {
        console.error(`Failed to fetch ${sensorType} from Node-RED`, error);
        return [];
      }
    };

    const fetchAllData = async () => {
      const [temp, rpm, level, vibration] = await Promise.all([
        fetchData('temperature', 'temperature-history'),
        fetchData('rpm', 'rpm-history'),
        fetchData('water_level', 'level-history'),
        fetchData('vibration', 'vibration-history'),
      ]);

      setTempHistory(temp);
      setRpmHistory(rpm);
      setLevelHistory(level);
      setVibrationHistory(vibration);

      // ------------------------------------
      // *** การคำนวณกำลังไฟฟ้า (Power) ***
      // ------------------------------------
      let calculatedPower = 0;
      if (rpm.length > 0) {
        // ใช้ค่า RPM ล่าสุด หรือ RPM เฉลี่ย (ในโหมด All Units)
        const latestRpm = rpm[rpm.length - 1].value; 
        
        // Power = (RPM / MAX_RPM) * MAX_CAPACITY (W)
        calculatedPower = (latestRpm / MAX_RPM) * maxCapacity;
        console.log("lastestRPM : ", latestRpm);
        console.log("MAX_RPM : ", MAX_RPM);
        console.log("maxCapacity : ", maxCapacity);
        setCurrentPower(calculatedPower);
      }
      
      // ------------------------------------
      // *** การจำลอง City Demand ให้สมจริง ***
      // ------------------------------------
      const baseDemand = maxCapacity * 0.6; // 60% ของ Max Capacity เป็น Demand พื้นฐาน
      const demandRange = maxCapacity * 0.2; // Demand แกว่ง +/- 20%
      const simulatedDemand = baseDemand + (Math.random() - 0.5) * demandRange;
      setCityDemand(simulatedDemand);

      if (idToFetch !== calculatedPower > 0) {
        if (simulatedDemand > 0) {
            sendPowerLog(idToFetch, calculatedPower, simulatedDemand); 
        }
      }

      // ------------------------------------
      // *** Post Power Log และ Status Logic ***
      // ------------------------------------
      
      // ส่งข้อมูลกลับไปบันทึก (เฉพาะเมื่อดูราย Unit และ Power ถูกคำนวณแล้ว)
      if (idToFetch !== 'all' && calculatedPower > 0) {
        sendPowerLog(idToFetch, calculatedPower, simulatedDemand); 
      }

      // กำหนดสถานะระบบ
      if (calculatedPower === 0) {
        setSystemStatus("OFFLINE");
        setStatusColor("#4a4a4a");
      } else {
        const powerDifference = calculatedPower - simulatedDemand;
        if (powerDifference > powerDiffThreshold) { // ถ้า Surplus มากกว่า 10%
          setSystemStatus("SURPLUS");
          setStatusColor("#34d399"); 
        } else if (powerDifference < -powerDiffThreshold) { // ถ้า Demand มากกว่า 10%
          setSystemStatus("HIGH DEMAND");
          setStatusColor("#f87171");
        } else {
          setSystemStatus("NORMAL");
          setStatusColor("#FFD700");
        }
      }

    };

    fetchAllData();
    const intervalId = setInterval(fetchAllData, 60000); // 1 นาที
    return () => clearInterval(intervalId);

  }, [villageId, maxCapacity]); // Dependency array

  const createChartData = (history, label, color) => ({
    labels: history.map(d => new Date(d.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: label,
        data: history.map(d => d.value),
        borderColor: color,
        backgroundColor: color,
        fill: false,
        tension: 0.1,
        pointRadius: 2,
      },
    ],
  });
  
  const tempChartData = createChartData(tempHistory, 'Temperature (°C)', '#f87171');
  const rpmBarData = createChartData(rpmHistory, 'RPM', '#FFD700'); // เปลี่ยนเป็นสีเหลืองทอง
  const levelData = createChartData(levelHistory, 'Water Level (m)', '#60a5fa');
  const vibrationData = createChartData(vibrationHistory, 'Vibration (mm/s)', '#34d399');


  // Options (ใช้โค้ดเดิม)
  const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#e0e0e0' } },
      title: { display: false }
    },
    scales: {
      x: { ticks: { color: '#e0e0e0' }, grid: { color: 'rgba(224, 224, 224, 0.1)' } },
      y: { ticks: { color: '#e0e0e0' }, grid: { color: 'rgba(224, 224, 224, 0.1)' } }
    }
  };
  const gaugeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    rotation: -90,
    circumference: 180,
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    }
  };
  const powerGaugeData = {
    datasets: [ 
      { 
        data: [currentPower, maxCapacity - currentPower], 
        backgroundColor: ['#FFD700', '#3a3a3a'], 
        borderWidth: 0, 
      } 
    ],
  };


  return (
    <> 
      <h1>
        Village Dashboard: {villageId} 
      </h1>

      <div className="dashboard-layout">
        {/* Temperature */}
        <div className="chart-card chart-temp">
          <h3>Temperature</h3>
          {tempHistory.length === 0 ? (<div className="loading-text">Waiting for Temperature data...</div>) : (
            <div className="chart-wrapper"><Line data={tempChartData} options={commonChartOptions} /></div>
          )}
        </div>

        {/* System Status Gauge */}
        <div className="chart-card chart-rpm">
          <h3>System Status</h3>
          {currentPower === 0 ? (<div className="loading-text">Waiting for Data...</div>) : (
            <> 
              <div className="gauge-value">{currentPower.toFixed(0) / 1000} kW</div> 
              <div className="chart-wrapper"><Doughnut data={powerGaugeData} options={gaugeOptions} /></div>
              <div className="power-stats">
                <div><span>City Demand:</span><strong>{cityDemand.toFixed(0) / 1000} kW</strong></div>
                <div><span>Max Capacity:</span><strong>{maxCapacity / 1000} kW</strong></div>
                <div className="stat-status" style={{ color: statusColor }}>{systemStatus}</div>
              </div>
            </>
          )}
        </div>

        {/* Water Level */}
        <div className="chart-card chart-level">
          <h3>Water Level</h3>
          {levelHistory.length === 0 ? (<div className="loading-text">Waiting for Level data...</div>) : (
            <div className="chart-wrapper"><Line data={levelData} options={commonChartOptions} /></div>
          )}
        </div>

        {/* Water Flow (RPM) */}
        <div className="chart-card chart-flow">
          <h3>Water Flow (RPM)</h3>
          {rpmHistory.length === 0 ? (<div className="loading-text">Waiting for Flow data...</div>) : (
            <div className="chart-wrapper"><Bar data={rpmBarData} options={commonChartOptions} /></div>
          )}
        </div>

        {/* Vibration */}
        <div className="chart-card chart-vibration">
          <h3>Vibration</h3>
          {vibrationHistory.length === 0 ? (<div className="loading-text">Waiting for Vibration data...</div>) : (
            <div className="chart-wrapper"><Line data={vibrationData} options={commonChartOptions} /></div>
          )}
        </div>
        
      </div>
    </>
  );
}

export default VillageDashboard;