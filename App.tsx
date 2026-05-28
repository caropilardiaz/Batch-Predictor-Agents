
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DataTable } from './components/DataTable';
import { EstimationAgent } from './components/EstimationAgent';
import { AccuracyDashboard } from './components/AccuracyDashboard';

import { FileUploader } from './components/FileUploader';
import { historicalData as initialData } from './data/historicalData';
import type { BatchData } from './types';

const App: React.FC = () => {
  const [dataset, setDataset] = useState<BatchData[]>(initialData);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [modelEstimations, setModelEstimations] = useState<Record<number, string>>({});
  const [backendMessage, setBackendMessage] = useState('');

  useEffect(() => {
    fetch('/api/hello')
      .then(res => res.json())
      .then(data => setBackendMessage(data.message))
      .catch(() => setBackendMessage('No se pudo conectar al backend.'));
  }, []);

  // Determine which job is active
  const activeJob = dataset.find(job => job.id === selectedJobId) || null;

  const handleEstimationUpdate = (jobId: number, estimation: string) => {
    setModelEstimations(prev => ({
      ...prev,
      [jobId]: estimation,
    }));
  };

  const handleManualSelection = (id: number) => {
      setSelectedJobId(id);
  };

  return (
    <div
      className="min-h-screen min-w-screen font-sans"
      style={{
        background: 'var(--macro-white)',
        color: 'var(--macro-blue-dark)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        minWidth: '100vw',
      }}
    >
      <Header />

      <div
        style={{
          margin: '20px 0',
          padding: '10px',
          background: '#f0f0f0',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <strong>Mensaje del backend:</strong> {backendMessage}
        </div>
        <FileUploader
          onDataLoaded={(data) => {
            setDataset(data);
            setSelectedJobId(null);
          }}
        />
      </div>

      <main
        className="flex-1 w-full flex flex-col items-center justify-start"
        style={{ minHeight: 0 }}
      >
        <div className="w-full max-w-7xl px-4 md:px-8 pt-4">
          <AccuracyDashboard data={dataset} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-3">
              <EstimationAgent
                historicalData={dataset}
                targetJob={activeJob}
                onClearTarget={() => {
                  setSelectedJobId(null);
                }}
                onEstimationUpdate={handleEstimationUpdate}
                isFuturePrediction={false}
              />
            </div>
            <div className="lg:col-span-3">
              <DataTable
                data={dataset}
                onSelectJob={handleManualSelection}
                selectedJobId={selectedJobId}
                modelEstimations={modelEstimations}
              />
            </div>
          </div>
        </div>
      </main>

      <footer
        className="text-center p-4 text-lg font-medium"
        style={{
          background: 'var(--macro-blue-dark)',
          color: 'var(--macro-white)',
        }}
      >
        <p>Powered by IT Patagonia © 2025</p>
      </footer>
    </div>
  );
};

export default App;
