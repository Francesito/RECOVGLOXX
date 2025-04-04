// firebase.js
require('dotenv').config(); // Carga las variables de entorno desde .env
const admin = require('firebase-admin');

// Verifica si FIREBASE_SERVICE_ACCOUNT está definida
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error('La variable de entorno FIREBASE_SERVICE_ACCOUNT no está definida. Verifica tu archivo .env.');
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (error) {
  throw new Error('Error al parsear FIREBASE_SERVICE_ACCOUNT. Asegúrate de que sea una cadena JSON válida: ' + error.message);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };