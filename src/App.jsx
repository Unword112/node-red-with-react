import React, { useState } from 'react';
import MapOverview from './MapOverview'; 
import VillageDashboard from './VillageDashboard'; 
import './App.css'; 

import SensorSimulator_with_button from './slider-test/sensorSim-with-button';

function App() {
  const [currentPage, setCurrentPage] = useState('map'); 
  const [selectedVillageId, setSelectedVillageId] = useState(null);

  const handleVillageSelect = (villageId) => {
    setSelectedVillageId(villageId); 
    setCurrentPage('dashboard');    
  };

  // *** ฟังก์ชันใหม่: สำหรับดูภาพรวมทั้งหมด ***
  const navigateToAllUnits = (event) => {
    event.preventDefault(); 
    // ตั้งค่า selectedVillageId เป็น 'all' เพื่อให้ Dashboard ดึงข้อมูลรวม
    setSelectedVillageId('all'); 
    setCurrentPage('dashboard');
  };

  // ฟังก์ชันสำหรับคลิกเมนู "Map Overview"
  const navigateToMap = (event) => { 
    event.preventDefault(); 
    setCurrentPage('map');
    setSelectedVillageId(null);
  };

  return (
    <div className="app-container">
      <nav className="app-nav">
        
        <div className="nav-logo">
          GNT Smart Village
        </div>

        <div className="nav-menu">
          
          {/* A. ปุ่ม Map Overview */}
          <a 
            href="#"
            className={currentPage === 'map' ? 'active' : ''}
            onClick={navigateToMap}
          >
            Map Overview
          </a>
          
          {/* B. ปุ่มภาพรวมทั้งหมด (ใหม่) */}
          <a 
            href="#"
            // Active เมื่อเราอยู่หน้า Dashboard และดู All Units
            className={currentPage === 'dashboard' && selectedVillageId === 'all' ? 'active' : ''}
            onClick={navigateToAllUnits}
          >
            ภาพรวมทั้งหมด
          </a>
          
        </div>
      </nav>

      <main className="app-content">
        {currentPage === 'map' && (
          <MapOverview onVillageSelect={handleVillageSelect} />
        )}
        
        {currentPage === 'dashboard' && (
          // ส่ง 'all' หรือ Unit ID ไปให้ Dashboard
          <VillageDashboard villageId={selectedVillageId} />
        )}
      </main>

      <SensorSimulator_with_button />
    </div>
  );
}

export default App;