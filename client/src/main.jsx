import React from 'react';
import ReactDOM from 'react-dom/client';
import { AlienProvider } from './context/AlienContext';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AlienProvider>
      <App />
    </AlienProvider>
  </React.StrictMode>
);
