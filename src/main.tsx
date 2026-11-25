import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tokens.css';
import './styles/global.css';
import './styles/layout.css';
import './styles/views.css';
import './styles/views-cellule.css';
import './styles/views-arena.css';
import './styles/views-arsenal.css';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
