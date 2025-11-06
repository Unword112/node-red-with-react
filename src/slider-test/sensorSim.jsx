import React, { useState, useEffect } from 'react';
import Paho from 'paho-mqtt';

import { useDebouncedCallback } from '../useDebouncedCallback';

// ----------------------------------------------------
// *** การตั้งค่า MQTT Broker (ดึงจาก .env) ***
// ต้องมีไฟล์ .env ใน Root และตัวแปรต้องขึ้นต้นด้วย VITE_
// ----------------------------------------------------
const MQTT_HOST = import.meta.env.VITE_MQTT_HOST; 
const MQTT_PORT = import.meta.env.VITE_MQTT_PORT; 
const MQTT_USER = import.meta.env.VITE_MQTT_USER;
const MQTT_PASS = import.meta.env.VITE_MQTT_PASSWD;

// Topic Base: gnt/unit01
const TOPIC_BASE = 'gnt/unit01';
const TURBINE_ID = 'unit01'; // ID ที่ใช้ใน Topic และ DB

// ----------------------------------------------------
// *** Component หลัก SensorSimulator ***
// ----------------------------------------------------

function SensorSimulator() {
  const [client, setClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [log, setLog] = useState([]);

  // State สำหรับเก็บค่า Slider ทั้ง 4 ตัว
  const [sensorValues, setSensorValues] = useState({
    'Temperature': 58,
    'Vibration': 7069,
    'RPM Sensor': 5479,
    'Water Level': 347.00,
  });

  // Mapping ชื่อเซนเซอร์ใน State ไปยัง Topic Suffix (/temp, /rpm, ฯลฯ)
  const topicMap = {
    'Temperature': '/temp',
    'Vibration': '/vibration',
    'RPM Sensor': '/rpm',
    'Water Level': '/level',
  };

  // --- 1. เชื่อมต่อ MQTT Broker ---
  useEffect(() => {
    // ต้องตรวจสอบว่าค่าจาก .env โหลดได้
    if (!MQTT_HOST || !MQTT_PORT) {
        addLog('❌ Error: VITE_MQTT_HOST or VITE_MQTT_PORT is missing in .env file.');
        return;
    }

    const clientId = 'react_sim_' + Math.random().toString(16).substr(2, 8);
    const mqttClient = new Paho.Client(MQTT_HOST, Number(MQTT_PORT), clientId);
    
    // ตั้งค่า Handler สำหรับ Event ต่างๆ
    mqttClient.onConnectionLost = (response) => { setIsConnected(false); addLog('⚠️ Lost connection'); };
    
    mqttClient.connect({
      onSuccess: () => { setIsConnected(true); addLog('✅ Connected!'); },
      onFailure: (r) => { setIsConnected(false); addLog(`❌ Failed: ${r.errorMessage}`); },
      userName: MQTT_USER,
      password: MQTT_PASS,
    });
    setClient(mqttClient);
    
    // Cleanup function
    return () => { if (mqttClient.isConnected()) mqttClient.disconnect(); };
  }, []);

  const addLog = (message) => {
    setLog(prevLog => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prevLog.slice(0, 9)]);
  };

  // --- 2. ฟังก์ชันสำหรับส่งข้อมูลไปยัง Broker ---
    const publishData = (latestSensorValues) => {
        if (!client || !client.isConnected()) {
        addLog('❌ Not connected to Broker.');
        return;
        }

        const turbineId = 'unit01'; 
        
        // สร้าง 4 Payload (1 Payload ต่อ 1 Topic)
        Object.entries(latestSensorValues).forEach(([sensorName, value]) => {
        // ... (โค้ดเดิมสำหรับการสร้าง Topic และ Payload) ...

        const topicSuffix = topicMap[sensorName];
        const fullTopic = TOPIC_BASE + topicSuffix;
        const fieldName = sensorName.split(' ')[0].toLowerCase().replace('sensor', 'rpm'); 

        const payloadObject = {};
        payloadObject[fieldName] = value;
        
        const payloadString = JSON.stringify(payloadObject);
        const message = new Paho.Message(payloadString);
        message.destinationName = fullTopic;
        
        client.send(message);
        });

        addLog(`➡️ Sent 4 Sensor Readings via Real-time update.`);
    };

    const debouncedPublish = useDebouncedCallback(publishData, 300);

    // --- 3. ฟังก์ชันจัดการการเปลี่ยนแปลง Slider ---
    const handleSliderChange = (sensorName, event) => {
        const value = parseFloat(event.target.value);
        
        // 1. อัปเดต State (จำเป็นเพื่อให้ UI อัปเดต)
        setSensorValues(prevValues => {
            const newValues = {
                ...prevValues,
                [sensorName]: value,
            };
            
            // 2. เรียก Debounced Function ด้วยค่าใหม่ทันที
            debouncedPublish(newValues);
            
            return newValues;
        });
    };

  // --- 4. ส่วนแสดงผล Slider ---
  const renderSlider = (name, min, max, step) => (
    <div key={name} style={{ margin: '20px 0', border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
      <label style={{ display: 'block', fontWeight: 'bold' }}>
        {name}: {sensorValues[name].toFixed(name === 'Water Level' ? 2 : 0)}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={sensorValues[name]}
        onChange={(e) => handleSliderChange(name, e)}
        style={{ width: '100%', marginTop: '5px' }}
      />
    </div>
  );

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto', fontFamily: 'Arial' }}>
      <h2>⚙️ Sensor Data Simulator (Unit ID: {TURBINE_ID})</h2>
      <div style={{ padding: '10px', backgroundColor: isConnected ? '#d4edda' : '#f8d7da', color: isConnected ? '#155724' : '#721c24', borderRadius: '5px', marginBottom: '20px' }}>
        สถานะ Broker: **{isConnected ? 'เชื่อมต่อแล้ว' : 'กำลังรอเชื่อมต่อ...'}**
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          {renderSlider('Temperature', 0, 100, 1)}
          {renderSlider('Vibration', 0, 10000, 10)}
          {renderSlider('RPM Sensor', 0, 8000, 10)}
          {renderSlider('Water Level', 0, 1000, 1)}
        </div>
        {/* Log Area */}
        <div style={{ border: '1px solid #eee', padding: '15px', height: '400px', overflowY: 'scroll', backgroundColor: '#f9f9f9' }}>
          <h4>Activity Log</h4>
          {log.map((entry, index) => (
            <div key={index} style={{ fontSize: '0.8em', marginBottom: '3px' }}>{entry}</div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default SensorSim;