
import React from 'react';
import { BotIcon } from './icons';

export const Header: React.FC = () => {
  return (
    <header className="bg-gray-800 shadow-md border-b border-gray-700">
      <div className="container mx-auto p-4 md:p-6 flex items-end gap-4 justify-between relative" style={{minHeight: '6rem'}}>
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <img 
              src="/logo_banco.jfif" 
              alt="Logo Banco" 
              className="h-24 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              Agente de Rango Dinámico
            </h1>
          </div>
        </div>
        <div style={{position: 'absolute', right: 0, bottom: 8, paddingRight: '1.5rem', color: '#1e90ff'}} className="text-xs font-light flex items-center gap-1">
          <span>Powered by IT Patagonia</span> <span style={{fontSize: '1em'}}>© 2025</span>
        </div>
      </div>
    </header>
  );
};
