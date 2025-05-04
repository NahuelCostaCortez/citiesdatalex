import React from 'react';
import Layout from './components/Layout';
import { AnimatePresence } from 'framer-motion';
import { RegulationsProvider } from './context/RegulationsContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <RegulationsProvider>
        <AnimatePresence mode="wait">
          <Layout />
        </AnimatePresence>
      </RegulationsProvider>
    </ThemeProvider>
  );
}

export default App;