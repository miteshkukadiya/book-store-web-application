import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store/index.js';
import { ToastProvider } from './context/ToastContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <Provider store={store}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </Provider>
    </Router>
  </StrictMode>
);
