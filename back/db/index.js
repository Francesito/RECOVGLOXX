const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const usuarioRutas = require('./routes/usuariosRutas');

const serviceAccount = require('./config/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => res.json({ message: 'Backend running' }));
app.use('/api', usuarioRutas(db, auth));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});