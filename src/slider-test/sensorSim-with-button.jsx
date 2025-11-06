import React, { useState, useEffect, useCallback } from 'react';
import Paho from 'paho-mqtt';
// ถ้าคุณไม่ได้ใช้ useDebouncedCallback ให้ลบบรรทัดนี้ออก
// import { useDebouncedCallback } from '../useDebouncedCallback'; 

// ----------------------------------------------------
// *** การตั้งค่า MQTT Broker (ดึงจาก .env) ***
// ----------------------------------------------------
const MQTT_HOST = import.meta.env.VITE_MQTT_HOST; 
const MQTT_PORT = import.meta.env.VITE_MQTT_PORT; 
const MQTT_USER = import.meta.env.VITE_MQTT_USER;
const MQTT_PASS = import.meta.env.VITE_MQTT_PASSWD;

// ----------------------------------------------------
// *** Component หลัก SensorSimulator_with_button ***
// ----------------------------------------------------

function SensorSimulator_with_button() {
    const [client, setClient] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [log, setLog] = useState([]);
    const [availableUnits, setAvailableUnits] = useState([]); 
    const [selectedUnitId, setSelectedUnitId] = useState('unit01'); 
    const [selectedUnitName, setSelectedUnitName] = useState('Default Unit'); // เก็บชื่อ Unit ที่ถูกเลือก
    const NODE_RED_API_URL = "http://192.168.1.247:1880"; 

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
    
    // ใช้ useCallback เพื่อป้องกันการสร้างฟังก์ชันซ้ำในทุก render
    const addLog = useCallback((message) => {
        setLog(prevLog => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prevLog.slice(0, 9)]);
    }, []);

    // --- 1. เชื่อมต่อ MQTT Broker และดึงข้อมูล Unit ---
    useEffect(() => {
        // --- ส่วนดึงข้อมูล Units จาก Node-RED API ---
        const fetchUnits = async () => {
            try {
                const response = await fetch(`${NODE_RED_API_URL}/api/units`);
                if (!response.ok) {
                    throw new Error('Failed to fetch units from Node-RED');
                }
                const data = await response.json();
                
                setAvailableUnits(data);
                
                // ตั้งค่า Unit แรกเป็นค่าเริ่มต้น และตั้งชื่อ Unit
                if (data.length > 0) {
                    setSelectedUnitId(data[0].unit_id);
                    setSelectedUnitName(data[0].unit_name);
                }
            } catch (error) {
                console.error("Error fetching units:", error);
                addLog(`❌ Failed to load Unit list: ${error.message}`);
            }
        };
        fetchUnits();

        // --- ส่วนเชื่อมต่อ MQTT Broker ---
        if (!MQTT_HOST || !MQTT_PORT) {
            addLog('❌ Error: VITE_MQTT_HOST or VITE_MQTT_PORT is missing in .env file.');
            return;
        }

        const clientId = 'react_sim_' + Math.random().toString(16).substr(2, 8);
        const mqttClient = new Paho.Client(MQTT_HOST, Number(MQTT_PORT), clientId);
        
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
    }, [addLog, NODE_RED_API_URL]); // Dependency Array: run เมื่อ addLog หรือ URL เปลี่ยน

    // --- 2. ฟังก์ชันสำหรับส่งข้อมูลไปยัง Broker ---
    const publishData = () => {
        if (!client || !client.isConnected()) {
            addLog('❌ Not connected to Broker.');
            return;
        }

        const turbineId = selectedUnitId; 
        // *** สร้าง TOPIC_BASE ใหม่ตาม Unit ID ที่เลือก ***
        const currentTopicBase = `gnt/${turbineId}`;
        
        // สร้าง 4 Payload (1 Payload ต่อ 1 Topic)
        Object.entries(sensorValues).forEach(([sensorName, value]) => {
            const topicSuffix = topicMap[sensorName];
            const fullTopic = currentTopicBase + topicSuffix; // เช่น gnt/unit02/temp
            
            // การตั้งชื่อ Field ใน JSON
            const fieldName = sensorName.split(' ')[0].toLowerCase().replace('sensor', 'rpm'); 

            const payloadObject = {};
            payloadObject[fieldName] = value;
            
            const payloadString = JSON.stringify(payloadObject);
            const message = new Paho.Message(payloadString);
            message.destinationName = fullTopic;
            
            client.send(message);
            addLog(`➡️ Sent ${fieldName}: ${value} to ${fullTopic}`);
        });

        addLog(`✅ Sent 4 Sensor Readings for ${selectedUnitName}.`);
    };

    // --- 3. ฟังก์ชันจัดการการเปลี่ยนแปลง Slider ---
    const handleSliderChange = (sensorName, event) => {
        const value = parseFloat(event.target.value);
        setSensorValues(prevValues => ({
            ...prevValues,
            [sensorName]: value,
        }));
    };

    // --- 4. ฟังก์ชันจัดการ Dropdown Change ---
    const handleUnitChange = (e) => {
        const newUnitId = e.target.value;
        setSelectedUnitId(newUnitId);
        
        // อัปเดตชื่อ Unit สำหรับแสดงใน Header และ Log
        const unit = availableUnits.find(u => u.unit_id === newUnitId);
        if (unit) {
            setSelectedUnitName(unit.unit_name);
        }
    };

    // --- 5. ส่วนแสดงผล Slider ---
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
            {/* อัปเดต Header ให้แสดง Unit Name และ ID ที่ถูกเลือก */}
            <h2>⚙️ Sensor Data Simulator: {selectedUnitName} ({selectedUnitId})</h2>
            
            <div style={{ padding: '10px', backgroundColor: isConnected ? '#d4edda' : '#f8d7da', color: isConnected ? '#155724' : '#721c24', borderRadius: '5px', marginBottom: '20px' }}>
                สถานะ Broker: **{isConnected ? 'เชื่อมต่อแล้ว' : 'กำลังรอเชื่อมต่อ...'}**
            </div>

            {/* Dropdown สำหรับเลือก Unit */}
            <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
                <label htmlFor="unit-selector" style={{ fontWeight: 'bold' }}>
                    **เลือก (Unit ID):**
                </label>
                <select
                    id="unit-selector"
                    value={selectedUnitId}
                    onChange={handleUnitChange}
                    style={{ marginLeft: '10px', padding: '8px' }}
                >
                    {availableUnits.map((unit) => (
                        <option key={unit.unit_id} value={unit.unit_id}>
                            {unit.unit_name} ({unit.unit_id})
                        </option>
                    ))}
                </select>
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

            <button 
                onClick={publishData} 
                disabled={!isConnected}
                style={{ marginTop: '20px', padding: '15px 30px', fontSize: '1.2em', cursor: 'pointer', backgroundColor: isConnected ? '#007bff' : '#ccc', color: 'white', border: 'none', borderRadius: '5px' }}
            >
                SEND 4 Sensor Readings
            </button>
        </div>
    );
}

export default SensorSimulator_with_button;