const express = require('express');
const router = express.Router();
const { getFirestore } = require('firebase-admin/firestore');

module.exports = (db, auth) => {
  const firestore = getFirestore();

  // Ruta para registrar un usuario
  // Ruta para registrar un usuario
router.post('/register', async (req, res) => {
  let userRecord = null;
  try {
    const { email, password, nombre, userType } = req.body;
    if (!email || !password || !nombre || !userType) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos.' });
    }
    if (userType === 'basic') {
      const allowedUserDoc = await db.collection('usuariosPermitidos').doc(email).get();
      if (!allowedUserDoc.exists) {
        return res.status(403).json({ success: false, error: 'No estás autorizado por un fisioterapeuta para registrarte.' });
      }
      // Verificar si el correo ya existe en Firebase Authentication
      try {
        const existingUser = await auth.getUserByEmail(email);
        // Si el usuario existe en Firebase Authentication, pero no está registrado completamente
        const allowedUserData = allowedUserDoc.data();
        if (allowedUserData.registered === false) {
          // Eliminar el usuario de Firebase Authentication para permitir un nuevo registro
          await auth.deleteUser(existingUser.uid);
          console.log(`Usuario ${existingUser.uid} eliminado de Firebase Authentication porque no estaba completamente registrado.`);
        } else {
          // Si registered es true, el usuario ya está completamente registrado
          return res.status(400).json({ success: false, error: 'El correo ya está registrado. Por favor, inicia sesión.' });
        }
      } catch (error) {
        if (error.code !== 'auth/user-not-found') {
          throw error; // Si el error no es "user-not-found", relanzarlo
        }
        // Si no se encuentra el usuario, continuar con el registro
      }
    }
    userRecord = await auth.createUser({ email, password, displayName: nombre });
    if (userType === 'physio') {
      await db.collection('fisioterapeutas').doc(userRecord.uid).set({
        nombre,
        email,
        userType: 'physio',
        createdAt: new Date().toISOString(),
      });
    } else {
      await db.collection('usuarios').doc(userRecord.uid).set({
        nombre,
        email,
        userType: 'basic',
        createdAt: new Date().toISOString(),
        hasSessions: false,
      });
      const initialCollection = db.collection('usuarios').doc(userRecord.uid).collection('datos');
      await Promise.all([
        initialCollection.doc('Index').set({ angle: 0, force: 0, servoforce: 0, velocity: 0 }),
        initialCollection.doc('Little').set({ angle: 0, force: 0, servoforce: 0, velocity: 0 }),
        initialCollection.doc('Middle').set({ angle: 0, force: 0, servoforce: 0, velocity: 0 }),
        initialCollection.doc('Ring').set({ angle: 0, force: 0, servoforce: 0, velocity: 0 }),
      ]);
      await db.collection('usuarios').doc(userRecord.uid).update({ hasSessions: true });
      await db.collection('usuariosPermitidos').doc(email).update({ registered: true });
      const patientDocRef = db.collection('pacientes').doc(email);
      const patientDoc = await patientDocRef.get();
      if (patientDoc.exists) {
        await patientDocRef.update({ userId: userRecord.uid });
      }
    }
    res.status(201).json({ success: true, message: 'Usuario registrado', uid: userRecord.uid });
  } catch (error) {
    console.error('Error en /register:', error.message);
    if (userRecord) {
      try {
        await auth.deleteUser(userRecord.uid);
        console.log(`Usuario ${userRecord.uid} eliminado de Authentication debido a un error.`);
      } catch (deleteError) {
        console.error('Error al eliminar usuario de Authentication:', deleteError.message);
      }
    }
    if (error.code === 'auth/email-already-in-use') {
      res.status(400).json({ success: false, error: 'El correo ya está registrado. Por favor, inicia sesión.' });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

  // Ruta para iniciar sesión
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Faltan email o contraseña.' });
      }
      const userRecord = await auth.getUserByEmail(email);
      const userDoc = await db.collection('fisioterapeutas').doc(userRecord.uid).get();
      let userData = {};
      let userType = 'physio';
      if (!userDoc.exists) {
        const basicUserDoc = await db.collection('usuarios').doc(userRecord.uid).get();
        if (!basicUserDoc.exists) {
          return res.status(404).json({ success: false, error: 'Usuario no encontrado en la base de datos.' });
        }
        userData = basicUserDoc.data();
        userType = 'basic';
      } else {
        userData = userDoc.data();
      }
      res.json({
        success: true,
        uid: userRecord.uid,
        user: { ...userRecord.toJSON(), ...userData, userType },
      });
    } catch (error) {
      console.error('Error en /login:', error.message);
      res.status(401).json({ success: false, error: 'Credenciales inválidas o usuario no encontrado.' });
    }
  });

  // Ruta para cerrar sesión
  router.post('/logout', async (req, res) => {
    try {
      res.json({ success: true, message: 'Sesión cerrada correctamente.' });
    } catch (error) {
      console.error('Error en /logout:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Ruta para eliminar un usuario
  router.post('/delete-user', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Falta el correo del usuario.' });
      }
      // Obtener el usuario por email
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(email);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          return res.status(404).json({ success: false, error: 'Usuario no encontrado en Firebase Authentication.' });
        }
        throw error;
      }
      const uid = userRecord.uid;

      // Determinar el tipo de usuario (si existe en la base de datos)
      const physioDoc = await db.collection('fisioterapeutas').doc(uid).get();
      const userDoc = await db.collection('usuarios').doc(uid).get();
      let userType = null;
      if (physioDoc.exists) {
        userType = 'physio';
      } else if (userDoc.exists) {
        userType = 'basic';
      }

      // Eliminar datos asociados
      if (userType === 'physio') {
        // Eliminar pacientes asociados en physio_patients
        const physioPatientsQuery = await db.collection('physio_patients').where('physioId', '==', uid).get();
        const batch = db.batch();
        physioPatientsQuery.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        // Eliminar pacientes en la colección pacientes
        const patientsQuery = await db.collection('pacientes').where('physioId', '==', uid).get();
        patientsQuery.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        // Eliminar entradas en usuariosPermitidos
        const permittedQuery = await db.collection('usuariosPermitidos').where('physioId', '==', uid).get();
        permittedQuery.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        // Eliminar notificaciones
        const notificationsQuery = await db.collection('notifications').where('recipientId', '==', uid).get();
        notificationsQuery.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        // Eliminar el documento del fisioterapeuta
        batch.delete(db.collection('fisioterapeutas').doc(uid));
        await batch.commit();
      } else if (userType === 'basic') {
        // Eliminar subcolecciones de datos (datos, datos1, etc.)
        let sessionNum = 0;
        while (true) {
          const collectionName = sessionNum === 0 ? 'datos' : `datos${sessionNum}`;
          const sessionSnapshot = await db.collection('usuarios').doc(uid).collection(collectionName).get();
          if (sessionSnapshot.empty) break;
          const batch = db.batch();
          sessionSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          sessionNum++;
        }

        // Eliminar entrada en physio_patients
        const physioPatientsQuery = await db.collection('physio_patients').where('patientId', '==', email).get();
        const batch = db.batch();
        physioPatientsQuery.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        // Eliminar entrada en pacientes
        const patientDocRef = db.collection('pacientes').doc(email);
        if ((await patientDocRef.get()).exists) {
          batch.delete(patientDocRef);
        }

        // Eliminar entrada en usuariosPermitidos
        const permittedDocRef = db.collection('usuariosPermitidos').doc(email);
        if ((await permittedDocRef.get()).exists) {
          batch.delete(permittedDocRef);
        }

        // Eliminar el documento del usuario
        batch.delete(db.collection('usuarios').doc(uid));
        await batch.commit();
      } else {
        // Si el usuario no está en fisioterapeutas ni en usuarios, aún debemos limpiar datos asociados
        const batch = db.batch();

        // Eliminar entrada en physio_patients
        const physioPatientsQuery = await db.collection('physio_patients').where('patientId', '==', email).get();
        physioPatientsQuery.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        // Eliminar entrada en pacientes
        const patientDocRef = db.collection('pacientes').doc(email);
        if ((await patientDocRef.get()).exists) {
          batch.delete(patientDocRef);
        }

        // Eliminar entrada en usuariosPermitidos
        const permittedDocRef = db.collection('usuariosPermitidos').doc(email);
        if ((await permittedDocRef.get()).exists) {
          batch.delete(permittedDocRef);
        }

        await batch.commit();
      }

      // Eliminar el usuario de Firebase Authentication
      await auth.deleteUser(uid);

      res.json({ success: true, message: 'Usuario eliminado correctamente.' });
    } catch (error) {
      console.error('Error en /delete-user:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Ruta para agregar un paciente
  router.post('/add-patient', async (req, res) => {
    try {
      const { physioId, patientName, patientEmail } = req.body;
      if (!physioId || !patientName || !patientEmail) {
        return res.status(400).json({ success: false, error: 'Faltan campos requeridos.' });
      }
      const physioDoc = await db.collection('fisioterapeutas').doc(physioId).get();
      if (!physioDoc.exists) {
        return res.status(403).json({ success: false, error: 'Solo fisioterapeutas pueden agregar pacientes.' });
      }
      const userQuery = await db.collection('usuarios').where('email', '==', patientEmail).get();
      let patientUserId = null;
      if (!userQuery.empty) {
        patientUserId = userQuery.docs[0].id;
      }
      const patientData = {
        nombre: patientName,
        email: patientEmail,
        physioId,
        userId: patientUserId || null,
        createdAt: new Date().toISOString(),
        observaciones: [],
      };
      await db.collection('pacientes').doc(patientEmail).set(patientData);
      await db.collection('physio_patients').doc(`${patientEmail}_${physioId}`).set({
        physioId,
        patientId: patientEmail,
        addedAt: new Date().toISOString(),
      });
      await db.collection('usuariosPermitidos').doc(patientEmail).set({
        nombre: patientName,
        email: patientEmail,
        physioId,
        registered: !!patientUserId,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      // Agregar el paciente a la lista de pacientes del fisioterapeuta
      const physioData = physioDoc.data();
      const currentPatients = physioData.patients || {};
      const patientIndex = Object.keys(currentPatients).length;
      currentPatients[patientIndex] = {
        nombre: patientName,
        email: patientEmail,
        createdAt: new Date().toISOString(),
        observaciones: [],
      };
      await db.collection('fisioterapeutas').doc(physioId).update({ patients: currentPatients });

      await db.collection('notifications').doc().set({
        recipientId: physioId,
        message: `Nuevo paciente registrado: ${patientName} (${patientEmail})`,
        timestamp: new Date().toISOString(),
        read: false,
      });
      res.status(201).json({ success: true, message: 'Paciente agregado correctamente.' });
    } catch (error) {
      console.error('Error en /add-patient:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Ruta para obtener la lista de pacientes de un fisioterapeuta
  router.get('/patients/:physioId', async (req, res) => {
    try {
      const { physioId } = req.params;
      const physioDoc = await db.collection('fisioterapeutas').doc(physioId).get();
      if (!physioDoc.exists) {
        return res.status(403).json({ success: false, error: 'Acceso denegado.' });
      }
      const physioPatientsQuery = await db.collection('physio_patients').where('physioId', '==', physioId).get();
      const patientsList = [];
      let totalSessions = 0;
      for (const docSnap of physioPatientsQuery.docs) {
        const patientEmail = docSnap.data().patientId;
        let patientData = {};
        const permittedDoc = await db.collection('usuariosPermitidos').doc(patientEmail).get();
        if (!permittedDoc.exists) {
          patientData = { nombre: 'Paciente no registrado', email: patientEmail };
        } else {
          patientData = permittedDoc.data();
        }
        const userQuery = await db.collection('usuarios').where('email', '==', patientEmail).get();
        let userId = null;
        let userData = {};
        let isRegistered = false;
        if (!userQuery.empty) {
          const userDoc = userQuery.docs[0];
          userId = userDoc.id;
          userData = userDoc.data();
          isRegistered = true;
        }
        let sessionCountForPatient = 0;
        let hasSessions = false;
        if (userId) {
          let sessionNum = 0;
          while (true) {
            const collectionName = sessionNum === 0 ? 'datos' : `datos${sessionNum}`;
            const sessionSnapshot = await db.collection('usuarios').doc(userId).collection(collectionName).get();
            if (sessionSnapshot.empty) break;
            if (sessionSnapshot.docs.some(doc => {
              const data = doc.data();
              // Manejar valores numéricos y cadenas
              const angle = typeof data.angle === 'string' ? Number(data.angle.replace('°', '') || 0) : Number(data.angle || 0);
              const force = typeof data.force === 'string' ? Number(data.force.replace(' N', '') || 0) : Number(data.force || 0);
              const servoforce = typeof data.servoforce === 'string' ? Number(data.servoforce.replace(' N', '') || 0) : Number(data.servoforce || 0);
              const velocity = typeof data.velocity === 'string' ? Number(data.velocity.replace(' °/s', '') || 0) : Number(data.velocity || 0);
              return angle > 0 || force > 0 || servoforce > 0 || velocity > 0;
            })) {
              hasSessions = true;
              sessionCountForPatient++;
            }
            sessionNum++;
          }
          totalSessions += sessionCountForPatient;
        }
        patientsList.push({
          id: patientEmail,
          email: patientEmail,
          ...patientData,
          nombre: userData.nombre || patientData.nombre || 'Sin nombre',
          hasSessions,
          sessionCount: sessionCountForPatient,
          observaciones: patientData.observaciones || [],
          userId,
          isRegistered,
        });
      }
      res.json({ success: true, patients: patientsList, totalSessions });
    } catch (error) {
      console.error('Error en /patients:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Ruta para agregar una observación a un paciente
  router.post('/add-observation', async (req, res) => {
    try {
      const { physioId, patientEmail, observation } = req.body;
      if (!physioId || !patientEmail || !observation) {
        return res.status(400).json({ success: false, error: 'Faltan campos requeridos.' });
      }
      const physioDoc = await db.collection('fisioterapeutas').doc(physioId).get();
      if (!physioDoc.exists) {
        return res.status(403).json({ success: false, error: 'Solo fisioterapeutas pueden agregar observaciones.' });
      }
      const patientDocRef = db.collection('usuariosPermitidos').doc(patientEmail);
      const patientDoc = await patientDocRef.get();
      if (!patientDoc.exists || patientDoc.data().physioId !== physioId) {
        return res.status(403).json({ success: false, error: 'No tienes permisos para este paciente.' });
      }
      const currentObservaciones = patientDoc.data().observaciones || [];
      const newObservacion = {
        text: observation,
        fechaObservacion: new Date().toISOString(),
        physioId,
      };
      const updatedObservaciones = [...currentObservaciones, newObservacion];
      await patientDocRef.update({ observaciones: updatedObservaciones });

      // Agregar la observación al campo patients del fisioterapeuta
      const physioData = physioDoc.data();
      const currentPatients = physioData.patients || {};
      const patientKey = Object.keys(currentPatients).find(
        key => currentPatients[key].email === patientEmail
      );
      if (patientKey) {
        currentPatients[patientKey].observaciones = updatedObservaciones;
        await db.collection('fisioterapeutas').doc(physioId).update({ patients: currentPatients });
      }

      await db.collection('notifications').doc().set({
        recipientId: physioId,
        message: `Nueva observación añadida para ${patientDoc.data().nombre}`,
        timestamp: new Date().toISOString(),
        read: false,
      });
      res.json({ success: true, message: 'Observación agregada correctamente.' });
    } catch (error) {
      console.error('Error en /add-observation:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Ruta para obtener las notificaciones de un fisioterapeuta
  router.get('/notifications/:physioId', async (req, res) => {
    try {
      const { physioId } = req.params;
      const physioDoc = await db.collection('fisioterapeutas').doc(physioId).get();
      if (!physioDoc.exists) {
        return res.status(403).json({ success: false, error: 'Acceso denegado.' });
      }
      const notificationsQuery = await db.collection('notifications')
        .where('recipientId', '==', physioId)
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();
      const notificationsList = notificationsQuery.docs.map(doc => doc.data());
      res.json({ success: true, notifications: notificationsList });
    } catch (error) {
      console.error('Error en /notifications:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Ruta para obtener el progreso de un usuario
  router.get('/progress/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { physioId } = req.query;
      const userDoc = await db.collection('usuarios').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
      }
      if (physioId) {
        const physioDoc = await db.collection('fisioterapeutas').doc(physioId).get();
        if (!physioDoc.exists) {
          return res.status(403).json({ success: false, error: 'Acceso denegado.' });
        }
        const patientDoc = await db.collection('pacientes').doc(userDoc.data().email).get();
        if (!patientDoc.exists || patientDoc.data().physioId !== physioId) {
          return res.status(403).json({ success: false, error: 'No tienes permisos para este usuario.' });
        }
      }
      let sessionNum = 0;
      let latestSession = null;
      while (true) {
        const collectionName = sessionNum === 0 ? 'datos' : `datos${sessionNum}`;
        const sessionSnapshot = await db.collection('usuarios').doc(userId).collection(collectionName).get();
        if (sessionSnapshot.empty) break;
        if (sessionSnapshot.docs.some(doc => {
          const data = doc.data();
          const angle = typeof data.angle === 'string' ? Number(data.angle.replace('°', '') || 0) : Number(data.angle || 0);
          const force = typeof data.force === 'string' ? Number(data.force.replace(' N', '') || 0) : Number(data.force || 0);
          const servoforce = typeof data.servoforce === 'string' ? Number(data.servoforce.replace(' N', '') || 0) : Number(data.servoforce || 0);
          const velocity = typeof data.velocity === 'string' ? Number(data.velocity.replace(' °/s', '') || 0) : Number(data.velocity || 0);
          return angle > 0 || force > 0 || servoforce > 0 || velocity > 0;
        })) {
          latestSession = collectionName;
        }
        sessionNum++;
      }
      if (!latestSession) {
        return res.json({
          success: true,
          data: {
            categories: ['Índice', 'Meñique', 'Medio', 'Anular'],
            series: [
              { name: 'Ángulo del Dedo', data: [], yAxis: 'angle' },
              { name: 'Fuerza', data: [], yAxis: 'force' },
              { name: 'Fuerza Servo', data: [], yAxis: 'servoforce' },
              { name: 'Velocidad', data: [], yAxis: 'velocity' },
            ],
            subtitle: 'Aún no hay datos registrados para este usuario.',
          },
        });
      }
      const datosSnapshot = await db.collection('usuarios').doc(userId).collection(latestSession).get();
      const data = processSessionData(datosSnapshot);
      res.json({
        success: true,
        data: {
          categories: data.categories,
          series: data.series,
          subtitle: `Datos de la última sesión | Mayor flexión: ${data.maxAngleFinger} (${data.maxAngle}°)`,
          sessionCount: latestSession === 'datos' ? 1 : Number(latestSession.replace('datos', '')) + 1,
        },
      });
    } catch (error) {
      console.error('Error en /progress:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Función auxiliar para procesar los datos de la sesión
  const processSessionData = (snapshot) => {
    const data = {
      categories: ['Índice', 'Meñique', 'Medio', 'Anular'],
      series: [
        { name: 'Ángulo del Dedo', data: [], yAxis: 'angle' },
        { name: 'Fuerza', data: [], yAxis: 'force' },
        { name: 'Fuerza Servo', data: [], yAxis: 'servoforce' },
        { name: 'Velocidad', data: [], yAxis: 'velocity' },
      ],
    };
    const fingerData = {};
    snapshot.forEach((doc) => {
      const finger = doc.id;
      const docData = doc.data();
      fingerData[finger] = {
        angle: typeof docData.angle === 'string' ? Number(docData.angle.replace('°', '') || 0) : Number(docData.angle || 0),
        force: typeof docData.force === 'string' ? Number(docData.force.replace(' N', '') || 0) : Number(docData.force || 0),
        servoforce: typeof docData.servoforce === 'string' ? Number(docData.servoforce.replace(' N', '') || 0) : Number(docData.servoforce || 0),
        velocity: typeof docData.velocity === 'string' ? Number(docData.velocity.replace(' °/s', '') || 0) : Number(docData.velocity || 0),
      };
    });
    const englishToSpanish = { Index: 'Índice', Little: 'Meñique', Middle: 'Medio', Ring: 'Anular' };
    const orderedData = ['Index', 'Little', 'Middle', 'Ring'].map(
      (finger) => fingerData[finger] || { angle: 0, force: 0, servoforce: 0, velocity: 0 }
    );
    data.series[0].data = orderedData.map((f) => f.angle);
    data.series[1].data = orderedData.map((f) => f.force);
    data.series[2].data = orderedData.map((f) => f.servoforce);
    data.series[3].data = orderedData.map((f) => f.velocity);
    const maxAngle = Math.max(...data.series[0].data);
    const maxAngleFingerEnglish = ['Index', 'Little', 'Middle', 'Ring'][data.series[0].data.indexOf(maxAngle)];
    data.maxAngleFinger = englishToSpanish[maxAngleFingerEnglish];
    data.maxAngle = maxAngle;
    return data;
  };

  // Ruta para obtener las observaciones de un usuario
  router.get('/observations/:email', async (req, res) => {
    try {
      const { email } = req.params;
      const permittedDoc = await db.collection('usuariosPermitidos').doc(email).get();
      if (!permittedDoc.exists) {
        return res.status(404).json({ success: false, error: 'No se encontró información.' });
      }
      const data = permittedDoc.data();
      const observaciones = data.observaciones?.length > 0
        ? `${new Date(data.observaciones[data.observaciones.length - 1].fechaObservacion).toLocaleString('es-ES')}: ${data.observaciones[data.observaciones.length - 1].text}`
        : 'No hay observaciones disponibles.';
      res.json({ success: true, observaciones });
    } catch (error) {
      console.error('Error en /observations:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Ruta para información sobre nosotros
  router.get('/sobre-nosotros', async (req, res) => {
    try {
      res.json({ success: true, data: 'Somos un equipo dedicado a innovar en tecnología wearable.' });
    } catch (error) {
      console.error('Error en /sobre-nosotros:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Ruta para información sobre el producto
  router.get('/sobre-producto', async (req, res) => {
    try {
      res.json({ success: true, data: 'El guante inteligente captura movimientos en tiempo real con sensores flexibles.' });
    } catch (error) {
      console.error('Error en /sobre-producto:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};