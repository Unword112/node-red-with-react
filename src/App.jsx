import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

//import ChartComponent from './api-chart/chartComponent.jsx';

import SensorSimulator_with_button from './slider-test/sensorSim-with-button';

function App() {

  return (
    <>
      <div>
        <SensorSimulator_with_button />
      </div>
    </>
  )
}

export default App
