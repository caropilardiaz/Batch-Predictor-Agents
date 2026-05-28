
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import xlsx from 'xlsx';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de multer para subir archivos en memoria
const upload = multer({ storage: multer.memoryStorage() });

// API route ejemplo
app.get('/api/hello', (req, res) => {
  res.json({ message: '¡Hola desde el backend!' });
});


// Endpoint para estimación IA: recibe dos archivos Excel (target y histórico)
app.post('/api/estimate', upload.fields([
  { name: 'target', maxCount: 1 },
  { name: 'history', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.files || !req.files['target'] || !req.files['history']) {
      return res.status(400).json({ error: 'Faltan archivos target o history.' });
    }
    // Leer target_job
    const targetWorkbook = xlsx.read(req.files['target'][0].buffer, { type: 'buffer' });
    const targetSheet = targetWorkbook.Sheets[targetWorkbook.SheetNames[0]];
    const targetData = xlsx.utils.sheet_to_json(targetSheet);
    const target_job = targetData[0]; // Suponemos un solo registro a estimar

    // Leer historical_data
    const historyWorkbook = xlsx.read(req.files['history'][0].buffer, { type: 'buffer' });
    const historySheet = historyWorkbook.Sheets[historyWorkbook.SheetNames[0]];
    const historical_data = xlsx.utils.sheet_to_json(historySheet);

    // Llamar al agente Python
    const response = await fetch('http://localhost:8000/estimate/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_job, historical_data })
    });
    const result = await response.json();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error procesando la estimación IA.' });
  }
});

// Servir archivos estáticos del frontend en producción
app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en puerto ${PORT}`);
});
