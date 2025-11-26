import React, { useState, useEffect } from 'react';
import './MapOverview.css'; 

// API URL สำหรับดึงข้อมูลหมู่บ้าน
const VILLAGES_API_URL = `http://${import.meta.env.VITE_MQTT_HOST}:1880/api/villages/status`;

function MapOverview({ onVillageSelect }) {
  const [villages, setVillages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- useEffect และ fetchVillageStatus (ใช้โค้ดเดิมที่ถูกต้องแล้ว) ---
  useEffect(() => {
    const fetchVillageStatus = async () => {
      setIsLoading(true); 
      try {
        const res = await fetch(VILLAGES_API_URL);

        if (!res.ok) {
          throw new Error('Failed to fetch village data');
        }

        const data = await res.json();
        
        // เมื่อไม่มีข้อมูล Status มาจาก DB ให้กำหนด default เป็น 'normal'
        const dataWithDefaultStatus = data.map(v => ({
            ...v,
            status: v.status || 'normal' 
        }));

        setVillages(dataWithDefaultStatus); 

      } catch (err) {
        console.error("Error fetching villages:", err);
        setVillages([]); 
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVillageStatus();
  }, []); 

  // --- Logic สำหรับกำหนดสี Pin (ใช้โค้ดเดิม) ---
  const getPinColorClass = (status) => {
    if (status === 'surplus') return 'pin-green';
    if (status === 'demand') return 'pin-red';
    // ถ้า status เป็น undefined หรือค่าอื่นๆ ที่ไม่ใช่ surplus/demand
    return 'pin-yellow';
  };

  return (
    <div className="map-page-container">
      <h1>GNT Smart Village Network</h1>

      {isLoading && (
        <div className="map-loading">Loading Village Data...</div>
      )}

      {!isLoading && (
        // *** ส่วนนี้คือการ Render Map Image และ Pins ***
        <div className="map-container">
          <img 
            src="https://placehold.co/1400x800/161b22/2d343e?text=Village+Map+Image" 
            alt="Village Map Background" 
            className="map-background-image" 
            onError={(e) => { e.target.src = 'https://placehold.co/1400x800/161b22/2d343e?text=Error+Loading+Map'; }}
          />
          
          {/* Render หมุดปัก (Pins) */}
          {villages.map((village) => (
            <div
              key={village.unit_id} 
              className={`village-pin ${getPinColorClass(village.status)}`}
              style={{ left: `${village.map_x}%`, top: `${village.map_y}%` }}
              onClick={() => onVillageSelect(village.unit_id)}
            >
              <div className="pin-icon"></div>
              <div className="pin-label">{village.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MapOverview;