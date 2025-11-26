import React, { useState } from 'react';
import MapOverview from './MapOverview'; 
import VillageDashboard from './VillageDashboard'; 
import './App.css'; 

function App() {
  const [currentPage, setCurrentPage] = useState('map'); 
  const [selectedVillageId, setSelectedVillageId] = useState(null);

  const handleVillageSelect = (villageId) => {
    setSelectedVillageId(villageId); 
    setCurrentPage('dashboard');    
  };

  const navigateToAllUnits = (event) => {
    event.preventDefault(); 
    setSelectedVillageId('all'); 
    setCurrentPage('dashboard');
  };

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
          <a >
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

    </div>
  );
}

export default App;