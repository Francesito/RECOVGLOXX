// index.js
require('dotenv').config(); // Carga las variables de entorno desde .env
const express = require('express');
const cors = require('cors');
const { db, auth } = require('./config/firebase.js'); // Importa db y auth desde firebase.js

const app = express();
app.use(express.json());

// Configura CORS para permitir tu frontend
app.use(cors({
  origin: [
    "https://recovgloxx.onrender.com", // URL de tu frontend en Render
    "http://localhost:3000" // Para desarrollo local
  ]
}));

// Rutas
app.get('/', (req, res) => res.json({ message: 'Backend running' }));
app.use('/api', require('./routes/usuariosRutas')(db, auth));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});