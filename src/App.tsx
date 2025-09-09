import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import FeedbackForm from './components/FeedbackForm';
import { AnimatePresence } from 'framer-motion';
import { RegulationsProvider } from './context/RegulationsContext';
import { ThemeProvider } from './context/ThemeContext';

// Admin components
import AdminLogin from './components/admin/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './components/admin/Dashboard';
import RegulationsList from './components/admin/RegulationsList';
import RegulationDetail from './components/admin/RegulationDetail';
import RegulationForm from './components/admin/RegulationForm';

function App() {
  return (
    <ThemeProvider>
      <RegulationsProvider>
        <Router>
          <AnimatePresence mode="wait">
            <Routes>
              {/* Main site routes */}
              <Route path="/" element={<Layout />} />
              <Route path="/feedback" element={<FeedbackForm />} />
              
              {/* Admin routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="regulations" element={<RegulationsList />} />
                <Route path="regulations/:id/view" element={<RegulationDetail />} />
                <Route path="regulations/:id/edit" element={<RegulationForm mode="edit" />} />
                <Route path="regulations/new" element={<RegulationForm mode="create" />} />
              </Route>
            </Routes>
          </AnimatePresence>
        </Router>
      </RegulationsProvider>
    </ThemeProvider>
  );
}

export default App;