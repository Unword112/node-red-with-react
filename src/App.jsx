import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

//import ChartComponent from './api-chart/chartComponent.jsx';

import SensorSimulator from './slider-test/sensorSim';

function App() {

  return (
    <>
      <div>
        <SensorSimulator />
      </div>
    </>
  )
}

export default App
