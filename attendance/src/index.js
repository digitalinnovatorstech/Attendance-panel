// ✅ For React 18 and above
import React from 'react';
import ReactDOM from 'react-dom/client'; // <-- updated import
import App from './App';
import { AuthProvider } from './context/AuthContext';
 
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
<React.StrictMode>
<AuthProvider>
<App />
</AuthProvider>
</React.StrictMode>
);