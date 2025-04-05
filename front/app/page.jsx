'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import jsPDF from 'jspdf';
import Image from 'next/image';
import { API_BASE_URL } from '../src/config'; // Ya está importado correctamente
import '../styles/globalStyles.css';

// Configuración del patrón de fondo de Highcharts
Highcharts.wrap(Highcharts.Chart.prototype, 'getContainer', function (proceed) {
  const result = proceed.apply(this, Array.prototype.slice.call(arguments, 1));
  const chart = this;
  if (chart.options.chart.backgroundPattern) {
    const pattern = chart.renderer.createElement('pattern').attr({
      id: 'gridPattern',
      patternUnits: 'userSpaceOnUse',
      width: 20,
      height: 20,
    }).add();
    chart.renderer
      .path(['M', 0, 0, 'L', 20, 20, 'M', 20, 0, 'L', 0, 20])
      .attr({
        stroke: 'rgba(229, 231, 235, 0.05)',
        'stroke-width': 1,
      })
      .add(pattern);
    chart.container.style.backgroundImage = `url(#${pattern.attr('id')})`;
  }
  return result;
});

// Estado inicial de chartOptions (gráfico vacío)
const initialChartOptions = {
  chart: {
    type: 'line',
    height: 550,
    backgroundColor: 'rgba(26, 32, 44, 0.95)',
    style: { fontFamily: 'Roboto, sans-serif' },
    borderRadius: 16,
    shadow: { color: 'rgba(0, 0, 0, 0.5)', offsetX: 0, offsetY: 5, opacity: 0.2, width: 10 },
    backgroundPattern: true,
    animation: { duration: 1500, easing: 'easeOutBounce' },
  },
  title: { text: 'Progreso de Rehabilitación', style: { color: '#e5e7eb', fontSize: '24px', fontWeight: 'bold' } },
  subtitle: { text: 'No hay datos disponibles', style: { color: '#ff4444', fontSize: '14px' } },
  xAxis: {
    categories: ['Índice', 'Meñique', 'Medio', 'Anular'],
    title: { text: 'Dedos', style: { color: '#e5e7eb', fontSize: '14px' } },
    labels: { style: { color: '#e5e7eb', fontSize: '14px' } },
    lineColor: '#e5e7eb',
    tickColor: '#e5e7eb',
    margin: 20,
  },
  yAxis: [
    {
      id: 'angle',
      title: { text: 'Ángulo (grados)', style: { color: '#00eaff', fontSize: '14px' } },
      labels: {
        style: { color: '#00eaff', fontSize: '12px' },
        formatter: function () {
          return `${this.value}°`;
        },
      },
      min: 0,
      max: 180,
      tickInterval: 30,
      gridLineColor: 'rgba(229, 231, 235, 0.1)',
    },
    {
      id: 'force',
      title: { text: 'Fuerza (N)', style: { color: '#ff00cc', fontSize: '14px' } },
      labels: {
        style: { color: '#ff00cc', fontSize: '12px' },
        formatter: function () {
          return `${this.value} N`;
        },
      },
      min: 0,
      max: 20,
      tickInterval: 5,
      opposite: true,
      gridLineColor: 'rgba(229, 231, 235, 0.1)',
    },
    {
      id: 'servoforce',
      title: { text: 'Fuerza Servo (N) *Estimada', style: { color: '#ffaa00', fontSize: '14px' } },
      labels: {
        style: { color: '#ffaa00', fontSize: '12px' },
        formatter: function () {
          return `${this.value} N`;
        },
      },
      min: 0,
      max: 15,
      tickInterval: 3,
      opposite: true,
      gridLineColor: 'rgba(229, 231, 235, 0.1)',
    },
    {
      id: 'velocity',
      title: { text: 'Velocidad (grados/s)', style: { color: '#a3e635', fontSize: '14px' } },
      labels: {
        style: { color: '#a3e635', fontSize: '12px' },
        formatter: function () {
          return `${this.value} °/s`;
        },
      },
      min: 0,
      max: 200,
      tickInterval: 40,
      gridLineColor: 'rgba(229, 231, 235, 0.1)',
    },
  ],
  tooltip: {
    shared: true,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    style: { color: '#e5e7eb', fontSize: '14px' },
    formatter: function () {
      const points = this.points;
      let tooltip = `<b>${this.x}</b><br/>`;
      points.forEach((point) => {
        const seriesName = point.series.name;
        const value = point.y;
        const unit = seriesName.includes('Ángulo') ? '°' : seriesName.includes('Fuerza') || seriesName.includes('Servo') ? ' N' : ' °/s';
        const description = seriesName === 'Ángulo del Dedo' ? 'Nivel de flexión del dedo (medido por sensores flexibles)' :
                          seriesName === 'Fuerza' ? 'Fuerza ejercida por el dedo' :
                          seriesName === 'Fuerza Servo' ? 'Fuerza estimada del servo (SM-S4306R)' :
                          'Velocidad de movimiento (medida por MPU6050)';
        tooltip += `<span style="color:${point.color}">${seriesName}: ${value}${unit} (${description})</span><br/>`;
      });
      return tooltip;
    },
  },
  plotOptions: {
    line: {
      lineWidth: 3,
      marker: {
        symbol: 'circle',
        radius: 6,
        fillColor: '#ffffff',
        lineWidth: 2,
        lineColor: null,
        states: { hover: { radius: 8, fillColor: '#ffffff', lineWidth: 3 } },
      },
      states: { hover: { lineWidth: 4 } },
      zones: [{ value: 0 }, { color: null }],
    },
    series: {
      dataLabels: {
        enabled: true,
        formatter: function () {
          const seriesName = this.series.name;
          const unit = seriesName.includes('Ángulo') ? '°' : seriesName.includes('Fuerza') || seriesName.includes('Servo') ? ' N' : ' °/s';
          return `<span style="color:${this.series.color}">${this.y}${unit}</span>`;
        },
        style: { fontSize: '12px', textOutline: 'none' },
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 4,
        padding: 4,
        shadow: true,
      },
      events: { legendItemClick: function () { return true; } },
    },
  },
  series: [
    { name: 'Ángulo del Dedo', yAxis: 'angle', data: [], color: { linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 }, stops: [[0, '#00eaff'], [1, '#00b4cc']] }, dashStyle: 'Solid' },
    { name: 'Fuerza', yAxis: 'force', data: [], color: { linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 }, stops: [[0, '#ff00cc'], [1, '#cc0099']] }, dashStyle: 'Dash' },
    { name: 'Fuerza Servo', yAxis: 'servoforce', data: [], color: { linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 }, stops: [[0, '#ffaa00'], [1, '#cc8800']] }, dashStyle: 'Dot' },
    { name: 'Velocidad', yAxis: 'velocity', data: [], color: { linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 }, stops: [[0, '#a3e635'], [1, '#7ecc1c']] }, dashStyle: 'DashDot' },
  ],
  legend: {
    itemStyle: { color: '#e5e7eb', fontSize: '14px' },
    itemHoverStyle: { color: '#ffffff' },
    align: 'center',
    verticalAlign: 'top',
    floating: false,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.2)',
    backgroundColor: 'rgba(26, 32, 44, 0.8)',
    padding: 8,
    itemMarginTop: 5,
    itemMarginBottom: 5,
  },
  credits: { enabled: false },
};

export default function Home() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patients, setPatients] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [showAllPatients, setShowAllPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [observaciones, setObservaciones] = useState('');
  const [chartOptions, setChartOptions] = useState(initialChartOptions);
  const [fingerData, setFingerData] = useState({
    Index: { angle: 0, force: 0, servoforce: 0, velocity: 0 },
    Ring: { angle: 0, force: 0, servoforce: 0, velocity: 0 },
    Middle: { angle: 0, force: 0, servoforce: 0, velocity: 0 },
    Little: { angle: 0, force: 0, servoforce: 0, velocity: 0 },
  });
  const [totalSessions, setTotalSessions] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0.0);
  const [userObservaciones, setUserObservaciones] = useState('');
  const [loading, setLoading] = useState(true);

  const components = useMemo(
    () => [
      { name: 'Raspberry Pi 4 Modelo B', description: 'Microcontrolador principal con WiFi y Bluetooth.', image: '/imagenes/raspberry.jpg' },
      { name: 'Sensores Flexibles', description: 'Miden la flexión de los dedos.', image: '/imagenes/sensoresflexibles.png' },
      { name: 'MPU6050 (Giroscopio SparkFun)', description: 'Acelerómetro y giroscopio para detectar movimientos de la mano.', image: '/imagenes/sparkfun.jpg' },
      { name: 'Servomotores SM-S4306R', description: 'Asisten en los movimientos de los dedos con rotación continua.', image: '/imagenes/servo.jpg' },
      { name: 'Batería Recargable', description: 'Fuente de alimentación portátil.', image: '/imagenes/bateria.png' },
      { name: 'Módulo Bluetooth/WiFi', description: 'Comunicación con la app y la web.', image: '/imagenes/modulo.jpg' },
      { name: 'Cables y Conectores', description: 'Para integrar los componentes.', image: '/imagenes/jumpers.jpg' },
      { name: 'Guante de Tela o Neopreno', description: 'Base para montar los sensores.', image: '/imagenes/guantes.jpeg' },
    ],
    []
  );

  const [imageLoadStatus, setImageLoadStatus] = useState(
    components.map(() => ({ loaded: false, failed: false }))
  );

  const handleImageLoad = useCallback((index) => {
    setImageLoadStatus((prev) =>
      prev.map((status, i) =>
        i === index ? { ...status, loaded: true, failed: false } : status
      )
    );
  }, []);

  const handleImageError = useCallback((index) => {
    setImageLoadStatus((prev) =>
      prev.map((status, i) =>
        i === index ? { ...status, loaded: false, failed: true } : status
      )
    );
  }, []);

  const resetAllStates = useCallback(() => {
    setUser(null);
    setEmail('');
    setPassword('');
    setError('');
    setCurrentIndex(0);
    setPatientName('');
    setPatientEmail('');
    setPatients([]);
    setNotifications([]);
    setShowAllNotifications(false);
    setShowAllPatients(false);
    setSelectedPatient(null);
    setObservaciones('');
    setChartOptions(initialChartOptions);
    setFingerData({
      Index: { angle: 0, force: 0, servoforce: 0, velocity: 0 },
      Ring: { angle: 0, force: 0, servoforce: 0, velocity: 0 },
      Middle: { angle: 0, force: 0, servoforce: 0, velocity: 0 },
      Little: { angle: 0, force: 0, servoforce: 0, velocity: 0 },
    });
    setTotalSessions(0);
    setProgressPercentage(0.0);
    setUserObservaciones('');
    setLoading(true);
  }, []);

  // Funciones del Fisioterapeuta (physio_home.dart)
  const fetchPatients = useCallback(async (physioId) => {
    console.log('fetchPatients - Physio ID:', physioId);
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/patients/${physioId}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al cargar pacientes.');
      }

      const updatedPatients = data.patients || [];
      const totalSessions = data.totalSessions || 0;

      setPatients(updatedPatients);
      setTotalSessions(totalSessions);

      if (updatedPatients.length > 0 && !selectedPatient) {
        const firstPatientWithUserId = updatedPatients.find(p => p.userId && p.hasSessions);
        if (firstPatientWithUserId) {
          setSelectedPatient(firstPatientWithUserId);
        } else {
          setSelectedPatient(null);
          setChartOptions({
            ...initialChartOptions,
            subtitle: { text: 'No hay pacientes con datos registrados.', style: { color: '#ff4444', fontSize: '14px' } },
            series: [
              { ...initialChartOptions.series[0], data: [] },
              { ...initialChartOptions.series[1], data: [] },
              { ...initialChartOptions.series[2], data: [] },
              { ...initialChartOptions.series[3], data: [] },
            ],
          });
        }
      }
      setLoading(false);
    } catch (err) {
      console.error('fetchPatients - Error:', err.message);
      setError('Error al cargar pacientes: ' + err.message);
      setLoading(false);
    }
  }, [selectedPatient]);

  const fetchNotifications = useCallback(async (physioId) => {
    console.log('fetchNotifications - Physio ID:', physioId);
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/${physioId}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al cargar notificaciones.');
      }

      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('fetchNotifications - Error:', err.message);
      setError('Error al cargar notificaciones: ' + err.message);
    }
  }, []);

  const handleAddPatient = useCallback(async (e) => {
    e.preventDefault();
    console.log('handleAddPatient - Form Data:', { patientName, patientEmail });

    const trimmedName = patientName ? patientName.trim() : '';
    const trimmedEmail = patientEmail ? patientEmail.trim().toLowerCase() : '';

    if (!trimmedName || !trimmedEmail) {
      let errorMessage = 'El nombre y el correo del paciente son obligatorios.';
      if (!trimmedName && !trimmedEmail) {
        errorMessage = 'El nombre y el correo del paciente son obligatorios.';
      } else if (!trimmedName) {
        errorMessage = 'El nombre del paciente es obligatorio.';
      } else if (!trimmedEmail) {
        errorMessage = 'El correo del paciente es obligatorio.';
      }
      setError(errorMessage);
      return;
    }

    try {
      const physioId = user.uid;
      const emailRegExp = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegExp.test(trimmedEmail)) {
        setError('El correo electrónico no es válido.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/add-patient`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          physioId,
          patientName: trimmedName,
          patientEmail: trimmedEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al agregar paciente.');
      }

      setPatientName('');
      setPatientEmail('');
      setError('Paciente agregado exitosamente.');
      fetchPatients(physioId);
      fetchNotifications(physioId);
    } catch (err) {
      console.error('handleAddPatient - Error:', err.message);
      setError('Error al agregar paciente: ' + err.message);
    }
  }, [user, fetchPatients, fetchNotifications, patientName, patientEmail]);

  const handleAddObservacion = useCallback(async () => {
    if (!selectedPatient) {
      setError('Debe haber un paciente seleccionado.');
      return;
    }
    if (!observaciones) {
      setError('La observación no puede estar vacía.');
      return;
    }

    try {
      const physioId = user.uid;
      const patientEmail = selectedPatient.id;

      const response = await fetch(`${API_BASE_URL}/api/add-observation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          physioId,
          patientEmail,
          observation: observaciones,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al agregar observación.');
      }

      setObservaciones('');
      fetchPatients(physioId);
      fetchNotifications(physioId);
    } catch (err) {
      console.error('handleAddObservacion - Error:', err.message);
      setError('Error al agregar observación: ' + err.message);
    }
  }, [user, selectedPatient, observaciones, fetchPatients, fetchNotifications]);

  const getDailyProgressChart = useCallback(async (patientEmail) => {
    try {
      const patient = patients.find(p => p.email === patientEmail);
      if (!patient || !patient.userId) {
        setChartOptions({
          ...initialChartOptions,
          subtitle: { text: 'El paciente no está registrado o no tiene datos.', style: { color: '#ff4444', fontSize: '14px' } },
          series: [
            { ...initialChartOptions.series[0], data: [] },
            { ...initialChartOptions.series[1], data: [] },
            { ...initialChartOptions.series[2], data: [] },
            { ...initialChartOptions.series[3], data: [] },
          ],
        });
        setTotalSessions(0);
        setProgressPercentage(0.0);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/progress/${patient.userId}`, {
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al cargar progreso.');
      }

      const { categories, series, subtitle, sessionCount } = data.data;

      const newOptions = {
        ...initialChartOptions,
        title: { text: 'Progreso Actual', style: { color: '#e5e7eb', fontSize: '24px', fontWeight: 'bold' } },
        xAxis: { categories },
        series: series.map((serie, index) => ({
          ...initialChartOptions.series[index],
          data: serie.data,
        })),
        subtitle: { text: subtitle, style: { color: '#a0aec0', fontSize: '14px' } },
      };

      setChartOptions(newOptions);
      setTotalSessions(sessionCount || 0);
    } catch (err) {
      console.error('getDailyProgressChart - Error:', err.message);
      setError('Error al cargar gráfico de progreso: ' + err.message);
      setChartOptions({
        ...initialChartOptions,
        subtitle: { text: 'Error al cargar los datos.', style: { color: 'red', fontSize: '14px' } },
        series: [
          { ...initialChartOptions.series[0], data: [] },
          { ...initialChartOptions.series[1], data: [] },
          { ...initialChartOptions.series[2], data: [] },
          { ...initialChartOptions.series[3], data: [] },
        ],
      });
      setTotalSessions(0);
      setProgressPercentage(0.0);
    }
  }, [patients]);

  useEffect(() => {
    if (selectedPatient && selectedPatient.isRegistered && selectedPatient.hasSessions) {
      getDailyProgressChart(selectedPatient.email);
    }
  }, [selectedPatient, getDailyProgressChart]);

  const handleDownloadReport = useCallback(() => {
    if (!selectedPatient) {
      setError('Debe haber un paciente seleccionado.');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFont('helvetica');
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(26, 32, 44);
      doc.rect(10, 10, 190, 277, 'F');
      doc.setFontSize(20);
      doc.setTextColor(0, 234, 255);
      doc.text('Informe de Progreso', 105, 30, { align: 'center' });
      doc.setFontSize(12);
      doc.setTextColor(150, 150, 150);
      if (chartOptions.series[0].data.length > 0) {
        doc.text(`Paciente: ${selectedPatient.nombre}`, 20, 50);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 60);
        doc.setFillColor(45, 55, 72);
        doc.rect(20, 70, 170, 100, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text('Dedos', 30, 80);
        doc.text('Ángulo (°)', 80, 80);
        doc.text('Fuerza (N)', 110, 80);
        doc.text('Fuerza Servo (N)', 140, 80);
        doc.text('Velocidad (°/s)', 170, 80);
        chartOptions.xAxis.categories.forEach((category, index) => {
          const yPos = 90 + index * 15;
          doc.setTextColor(0, 234, 255);
          doc.text(category, 30, yPos);
          doc.setTextColor(255, 165, 0);
          doc.text(`${chartOptions.series[0].data[index]}`, 80, yPos);
          doc.text(`${chartOptions.series[1].data[index]}`, 110, yPos);
          doc.text(`${chartOptions.series[2].data[index]}`, 140, yPos);
          doc.text(`${chartOptions.series[3].data[index]}`, 170, yPos);
        });
        doc.setTextColor(150, 150, 150);
        doc.text('Observaciones:', 20, 180);
        const observacionesText =
          selectedPatient.observaciones?.map((obs) => `${new Date(obs.fechaObservacion).toLocaleString()}: ${obs.text}`).join('\n') ||
          'Sin observaciones';
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text(observacionesText.split('\n'), 20, 190, { maxWidth: 170, lineHeightFactor: 1.2 });
        doc.save(`Informe_Progreso_${selectedPatient.nombre}_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
      } else {
        setError('No hay datos disponibles para descargar.');
      }
    } catch (err) {
      console.error('handleDownloadReport - Error:', err.message);
      setError('Error al generar/descargar el informe: ' + err.message);
    }
  }, [selectedPatient, chartOptions]);

  // Funciones del Usuario (user_home.dart)
  const calculateProgress = (fingerData) => {
    const goals = {
      angle: 180, // grados
      force: 30, // Newtons
      servoforce: 18, // Newtons
      velocity: 240, // grados por segundo
    };

    const fingers = ['Index', 'Ring', 'Middle', 'Little'];
    let totalProgress = 0;
    let metricsCount = 0;

    fingers.forEach(finger => {
      const data = fingerData[finger];
      if (data) {
        const angleProgress = (data.angle / goals.angle) * 100;
        const forceProgress = (data.force / goals.force) * 100;
        const servoForceProgress = (data.servoforce / goals.servoforce) * 100;
        const velocityProgress = (data.velocity / goals.velocity) * 100;

        totalProgress += (angleProgress + forceProgress + servoForceProgress + velocityProgress) / 4;
        metricsCount++;
      }
    });

    if (metricsCount === 0) return 0;
    const overallProgress = totalProgress / metricsCount;
    return Math.min(Math.round(overallProgress), 100);
  };

  const fetchUserProgress = useCallback(async (userId) => {
    console.log('fetchUserProgress - User ID:', userId);
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/progress/${userId}`, {
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al cargar datos.');
      }

      const { categories, series, subtitle, sessionCount } = data.data;

      const newFingerData = {};
      const fingers = ['Index', 'Ring', 'Middle', 'Little'];
      fingers.forEach((finger, index) => {
        newFingerData[finger] = {
          angle: series[0].data[index] || 0,
          force: series[1].data[index] || 0,
          servoforce: series[2].data[index] || 0,
          velocity: series[3].data[index] || 0,
        };
      });

      const progressPercentageLocal = calculateProgress(newFingerData);

      const newOptions = {
        ...initialChartOptions,
        xAxis: { categories },
        series: series.map((serie, index) => ({
          ...initialChartOptions.series[index],
          data: serie.data,
        })),
        subtitle: { text: subtitle, style: { color: '#a0aec0', fontSize: '14px' } },
      };

      setFingerData(newFingerData);
      setChartOptions(newOptions);
      setTotalSessions(sessionCount || 0);
      setProgressPercentage(progressPercentageLocal);
      setLoading(false);
    } catch (err) {
      console.error('fetchUserProgress - Error:', err.message);
      setError('Error al cargar datos: ' + err.message);
      setChartOptions({
        ...initialChartOptions,
        subtitle: { text: 'Aún no hay datos registrados.', style: { color: '#ff4444', fontSize: '14px' } },
      });
      setTotalSessions(0);
      setProgressPercentage(0.0);
      setLoading(false);
    }
  }, []);

  const fetchUserObservations = useCallback(async (email) => {
    console.log('fetchUserObservations - Email:', email);
    try {
      const response = await fetch(`${API_BASE_URL}/api/observations/${email}`, {
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al cargar observaciones.');
      }

      setUserObservaciones(data.observaciones || 'No hay observaciones disponibles.');
    } catch (err) {
      console.error('fetchUserObservations - Error:', err.message);
      setError('Error al cargar observaciones: ' + err.message);
    }
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    console.log('handleSubmit - Starting execution');
    setError('');

    console.log('handleSubmit - Form Data:', { email, password });

    if (!email || !password) {
      console.log('handleSubmit - Validation failed: Email or password missing');
      setError('Por favor, completa todos los campos requeridos (correo y contraseña).');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al iniciar sesión.');
      }

      const userData = data.user;

      console.log('handleSubmit - User Data to Save:', userData);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      console.log('handleSubmit - Dispatching custom-storage-update');
      window.dispatchEvent(new Event('custom-storage-update'));

      if (userData.userType === 'physio') {
        console.log('handleSubmit - Fetching data for physio');
        await fetchPatients(userData.uid);
        await fetchNotifications(userData.uid);
      } else {
        console.log('handleSubmit - Fetching data for basic user');
        await fetchUserProgress(userData.uid);
        await fetchUserObservations(userData.email);
      }
    } catch (err) {
      console.error('handleSubmit - Error:', err.message);
      setError(err.message || 'Ocurrió un error al iniciar sesión.');
    }
  }, [email, password, fetchPatients, fetchNotifications, fetchUserProgress, fetchUserObservations]);

  const handleLogout = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al cerrar sesión.');
      }

      localStorage.removeItem('user');
      resetAllStates();
    } catch (err) {
      console.error('handleLogout - Error:', err.message);
      setError('Error al cerrar sesión: ' + err.message);
    }
  }, [resetAllStates]);

  useEffect(() => {
    const checkAuthState = async () => {
      setLoading(true);
      const storedUser = localStorage.getItem('user');
      console.log('checkAuthState - Stored User:', storedUser);
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        console.log('checkAuthState - Parsed User Data:', userData);
        setUser(userData);
        if (userData.userType === 'physio') {
          await fetchPatients(userData.uid);
          await fetchNotifications(userData.uid);
        } else {
          await fetchUserProgress(userData.uid);
          await fetchUserObservations(userData.email);
        }
      }
      setLoading(false);
    };
    checkAuthState();
  }, [fetchPatients, fetchNotifications, fetchUserProgress, fetchUserObservations]);

  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % components.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [user, components]);

  return (
    <div className="min-h-screen flex flex-col relative background-pattern">
      <main className="flex-grow">
        {!user ? (
          <div className="container mx-auto py-16 px-6 relative min-h-screen z-10 flex items-center justify-center">
            <div className="flex flex-col md:flex-row items-center justify-center gap-16 w-full max-w-6xl">
              <div className="w-full md:w-1/2 flex flex-col items-center space-y-8">
                <div className="relative w-full max-w-lg h-[300px] rounded-2xl overflow-hidden shadow-xl border border-gray-700">
                  <video autoPlay loop muted className="absolute top-0 left-0 w-full h-full object-cover">
                    <source src="./videos/BACKGROUND.mp4" type="video/mp4" />
                    Tu navegador no soporta el elemento de video.
                  </video>
                </div>
                <div className="text-center">
                  <h1 className="text-5xl font-bold text-cyan-300 mb-4">RECOVGLOX</h1>
                  <p className="text-lg text-gray-300 max-w-xl mx-auto">
                    Una solución avanzada para la rehabilitación de manos. Monitorea tu progreso, mejora tu movilidad y recupera tu fuerza con tecnología de punta.
                  </p>
                </div>
              </div>
              <div className="w-full md:w-1/2 flex justify-center">
                <div className="max-w-md w-full bg-cardBg backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-gray-700">
                  <h2 className="text-3xl font-bold text-cyan-300 text-center mb-6">Iniciar Sesión</h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Correo"
                      required
                      className="input-field"
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Contraseña"
                      required
                      className="input-field"
                    />
                    <button type="submit" className="button-primary">
                      Iniciar Sesión
                    </button>
                  </form>
                  <p className="text-center mt-4 text-gray-300">
                    ¿No tienes cuenta?{' '}
                    <a
                      href="/register"
                      className="text-cyan-400 hover:text-cyan-300 transition-all"
                    >
                      Regístrate
                    </a>
                  </p>
                  {error && <p className="text-center text-red-500 mt-4">{error}</p>}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="container mx-auto py-16 px-6">
            {user.userType === 'physio' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-cardBg backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-gray-700">
                  <h3 className="text-2xl font-bold text-cyan-300 mb-4 text-center">Agregar Paciente</h3>
                  <form onSubmit={handleAddPatient} className="space-y-4 w-full">
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Nombre del paciente"
                      required
                      className="input-field"
                    />
                    <input
                      type="email"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      placeholder="Correo del paciente"
                      required
                      className="input-field"
                    />
                    <button type="submit" className="button-primary">Agregar</button>
                  </form>
                  <h3 className="text-2xl font-bold text-cyan-300 mt-8 mb-4 text-center">Notificaciones</h3>
                  {notifications.length === 0 ? (
                    <p className="text-gray-400 text-center">No hay notificaciones.</p>
                  ) : (
                    <>
                      <ul className="space-y-4 w-full">
                        {notifications.slice(0, showAllNotifications ? notifications.length : 2).map((notif, index) => (
                          <li key={index} className="p-4 bg-darkBg rounded-lg shadow-md border border-gray-600">
                            <span className={`mr-2 ${notif.read ? 'text-gray-500' : 'text-yellow-500'}`}>●</span>
                            <div>
                              <p className="text-gray-400">{notif.message}</p>
                              <p className="text-gray-500 text-sm">{new Date(notif.timestamp).toLocaleString('es-ES')}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                      {notifications.length > 2 && (
                        <button
                          onClick={() => setShowAllNotifications(!showAllNotifications)}
                          className="text-cyan-400 hover:text-cyan-300 transition-all mt-4 block mx-auto"
                        >
                          {showAllNotifications ? 'Ver menos' : 'Ver más'}
                        </button>
                      )}
                    </>
                  )}
                  <h3 className="text-2xl font-bold text-cyan-300 mt-8 mb-4 text-center">Pacientes Registrados</h3>
                  {loading ? (
                    <p className="text-gray-400 text-center">Cargando...</p>
                  ) : patients.length === 0 ? (
                    <p className="text-gray-400 text-center">No hay pacientes registrados.</p>
                  ) : (
                    <>
                      <ul className="space-y-4 w-full">
                        {patients.slice(0, showAllPatients ? patients.length : 2).map((patient) => (
                          <li key={patient.id} className="flex justify-between items-center p-4 bg-darkBg rounded-lg shadow-md border border-gray-600">
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-300">
                                {patient.nombre} ({patient.email})
                              </span>
                              {!patient.isRegistered && (
                                <span className="text-red-500 text-sm font-semibold">[No registrado]</span>
                              )}
                              {patient.hasSessions && (
                                <span className="text-gray-500 text-sm">
                                  ({patient.sessionCount} sesiones)
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setChartOptions({
                                  ...initialChartOptions,
                                  subtitle: { text: 'Cargando datos...', style: { color: '#a0aec0', fontSize: '14px' } },
                                  series: [
                                    { ...initialChartOptions.series[0], data: [] },
                                    { ...initialChartOptions.series[1], data: [] },
                                    { ...initialChartOptions.series[2], data: [] },
                                    { ...initialChartOptions.series[3], data: [] },
                                  ],
                                });
                                setTotalSessions(0);
                                setProgressPercentage(0.0);
                                setSelectedPatient(patient);
                                if (patient.isRegistered && patient.hasSessions) {
                                  getDailyProgressChart(patient.email);
                                } else {
                                  setChartOptions({
                                    ...initialChartOptions,
                                    subtitle: { text: 'Aún no hay datos registrados para este paciente.', style: { color: '#ff4444', fontSize: '14px' } },
                                    series: [
                                      { ...initialChartOptions.series[0], data: [] },
                                      { ...initialChartOptions.series[1], data: [] },
                                      { ...initialChartOptions.series[2], data: [] },
                                      { ...initialChartOptions.series[3], data: [] },
                                    ],
                                  });
                                }
                              }}
                              className="text-cyan-400 hover:text-cyan-300 transition-all"
                              disabled={!patient.isRegistered}
                            >
                              Ver
                            </button>
                          </li>
                        ))}
                      </ul>
                      {patients.length > 2 && (
                        <button
                          onClick={() => setShowAllPatients(!showAllPatients)}
                          className="text-cyan-400 hover:text-cyan-300 transition-all mt-4 block mx-auto"
                        >
                          {showAllPatients ? 'Ver menos' : 'Ver más'}
                        </button>
                      )}
                    </>
                  )}
                  <div className="mt-8 w-full">
                    <h4 className="text-xl font-bold text-cyan-300 mb-4 text-center">Estadísticas Rápidas</h4>
                    <div className="space-y-4 text-center">
                      <p className="text-gray-300">Pacientes registrados: {patients.length}</p>
                      <p className="text-gray-300">Sesiones registradas: {totalSessions}</p>
                      <p className="text-gray-300">Última actualización: {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                  {selectedPatient && selectedPatient.observaciones && selectedPatient.observaciones.length > 0 && (
                    <div className="mt-8 p-4 bg-darkBg rounded-lg shadow-md border border-gray-600">
                      <h5 className="text-xl font-bold text-cyan-300 mb-4">Historial de Observaciones</h5>
                      {selectedPatient.observaciones.map((obs, index) => (
                        <p key={index} className="text-gray-300 whitespace-pre-wrap">
                          {new Date(obs.fechaObservacion).toLocaleString()}: {obs.text}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="md:col-span-2 bg-cardBg backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-gray-700">
                  {selectedPatient ? (
                    <>
                      <h3 className="text-2xl font-bold text-cyan-300 mb-4 text-center">
                        Progreso de {selectedPatient.nombre}
                      </h3>
                      <div className="w-full chart-container p-4 bg-darkBg rounded-lg shadow-inner">
                        <HighchartsReact highcharts={Highcharts} options={chartOptions} />
                      </div>
                      <div className="mt-8 w-full">
                        <h4 className="text-xl font-bold text-cyan-300 mb-4 text-center">Observaciones</h4>
                        <textarea
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          placeholder="Escribe tus observaciones aquí..."
                          className="input-field h-32"
                        />
                        <button onClick={handleAddObservacion} className="button-primary mt-4">
                          Guardar Observación
                        </button>
                      </div>
                      <button onClick={handleDownloadReport} className="button-primary mt-4">
                        Descargar Informe PDF
                      </button>
                    </>
                  ) : (
                    <p className="text-gray-400 text-center">Selecciona un paciente para ver su progreso.</p>
                  )}
                  {error && <p className="text-center text-red-500 mt-4">{error}</p>}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 bg-cardBg backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-gray-700">
                  <div className="w-full chart-container p-4 bg-darkBg rounded-lg shadow-inner">
                    <HighchartsReact highcharts={Highcharts} options={chartOptions} />
                  </div>
                  <div className="mt-8 p-4 bg-darkBg rounded-lg shadow-md border border-gray-600 text-center">
                    <h4 className="text-xl font-bold text-cyan-300 mb-4">Resumen</h4>
                    <div className="relative w-32 h-32 mx-auto">
                      <svg className="w-full h-full" viewBox="0 0 36 36">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#4A5568" strokeWidth="3" />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#00EAFF"
                          strokeWidth="3"
                          strokeDasharray={`${progressPercentage}, 100`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-300">{progressPercentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <p className="text-gray-400 mt-4">Sesiones Completadas: {totalSessions}</p>
                  </div>
                  {userObservaciones && (
                    <div className="mt-8 p-4 bg-darkBg rounded-lg shadow-md border border-gray-600 text-center">
                      <h4 className="text-xl font-bold text-cyan-300 mb-4">Observaciones de tu Fisioterapeuta</h4>
                      <p className="text-gray-300 whitespace-pre-wrap">{userObservaciones}</p>
                    </div>
                  )}
                </div>
                <div className="bg-cardBg backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-gray-700">
                  <h3 className="text-2xl font-bold text-cyan-300 mb-4 text-center">Componentes del Guante RECOVGLOX</h3>
                  <div className="relative w-full h-[600px] overflow-hidden rounded-lg shadow-inner border border-gray-600">
                    {components.map((component, index) => (
                      <div
                        key={index}
                        className={`absolute w-full h-[600px] flex flex-col justify-start items-center p-6 transition-opacity duration-500 ease-in-out ${
                          index === currentIndex ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{ top: 0, left: 0 }}
                      >
                        <div className="w-full flex flex-col">
                          <h4 className="text-xl font-semibold text-cyan-300 text-center mb-4">{component.name}</h4>
                          <p className="text-gray-300 text-center mb-6">{component.description}</p>
                          <div className="w-full flex-1 flex items-center justify-center">
                            {imageLoadStatus[index].failed ? (
                              <div className="text-gray-400 text-center">[Imagen no disponible]</div>
                            ) : (
                              <Image
                                src={component.image}
                                alt={component.name}
                                width={400}
                                height={400}
                                className="max-w-full max-h-[400px] object-contain rounded-lg"
                                onLoad={() => handleImageLoad(index)}
                                onError={() => handleImageError(index)}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <button onClick={handleLogout} className="button-primary mt-8 mx-auto block">
              Cerrar Sesión
            </button>
          </div>
        )}
      </main>
    </div>
  );
}