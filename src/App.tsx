import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/ui/Toast';
import { Dashboard } from './pages/Dashboard';
import { AddTransaction } from './pages/AddTransaction';
import { History } from './pages/History';
import { Insights } from './pages/Insights';
import { Settings } from './pages/Settings';
import './index.css';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="history" element={<History />} />
            <Route path="insights" element={<Insights />} />
            <Route path="settings" element={<Settings />} />
            <Route path="add" element={<AddTransaction />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
