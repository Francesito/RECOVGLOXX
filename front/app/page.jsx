
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import jsPDF from 'jspdf';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../src/config';
import '../styles/globalStyles.css';
import Navbar from '../components/Navbar';

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

// Función para detectar si es móvil
const isMobile = () => (typeof window !== 'undefined' && window.innerWidth <= 768) || false;

// Opciones para la gráfica combinada (desktop)
// Dentro de getChartOptions, ajustamos el ancho y aseguramos que los elementos sean legibles
// Dentro de getChartOptions, ajustamos el ancho a 1000px en escritorio
const getChartOptions = (isMobile) => ({
  chart: {
    type: isMobile ? 'column' : 'line',
    height: isMobile ? 300 : 550,
    width: isMobile ? null : 600, // Mantenemos el ancho de 750px en escritorio
    backgroundColor: 'rgba(26, 32, 44, 0.95)',
    style: { fontFamily: 'Roboto, sans-serif' },
    borderRadius: 16,
    shadow: { color: 'rgba(0, 0, 0, 0.5)', offsetX: 0, offsetY: 5, opacity: 0.2, width: 10 },
    backgroundPattern: true,
    animation: { duration: 1500 },
  },
  title: { text: 'Progreso de Rehabilitación', style: { color: '#e5e7eb', fontSize: '24px', fontWeight: 'bold' } },
  subtitle: { text: 'No hay datos disponibles', style: { color: '#ff4444', fontSize: '14px' } },
  xAxis: {
    categories: ['Índice', 'Meñique', 'Medio', 'Anular'],
    title: { text: 'Dedos', style: { color: '#e5e7eb', fontSize: '14px' } },
    labels: { style: { color: '#e5e7eb', fontSize: '12px' } },
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
    column: {
      borderWidth: 0,
      groupPadding: 0.1,
      pointPadding: 0.05,
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
});

// Opciones para gráficas individuales (móviles)
const getSingleChartOptions = (type, title, yAxisTitle, yAxisMax, yAxisInterval, color, unit) => ({
  chart: {
    type: 'column',
    height: 250,
    backgroundColor: 'rgba(26, 32, 44, 0.95)',
    style: { fontFamily: 'Roboto, sans-serif' },
    borderRadius: 16,
    shadow: { color: 'rgba(0, 0, 0, 0.5)', offsetX: 0, offsetY: 5, opacity: 0.2, width: 10 },
    backgroundPattern: true,
    animation: { duration: 1500 }, // Eliminamos easing: 'easeOutBounce'
  },
  title: { text: title, style: { color: '#e5e7eb', fontSize: '18px', fontWeight: 'bold' } },
  subtitle: { text: 'No hay datos disponibles', style: { color: '#ff4444', fontSize: '12px' } },
  xAxis: {
    categories: ['Índice', 'Meñique', 'Medio', 'Anular'],
    title: { text: 'Dedos', style: { color: '#e5e7eb', fontSize: '12px' } },
    labels: { style: { color: '#e5e7eb', fontSize: '10px' } },
    lineColor: '#e5e7eb',
    tickColor: '#e5e7eb',
    margin: 10,
  },
  yAxis: {
    title: { text: yAxisTitle, style: { color: color, fontSize: '12px' } },
    labels: {
      style: { color: color, fontSize: '10px' },
      formatter: function () {
        return `${this.value}${unit}`;
      },
    },
    min: 0,
    max: yAxisMax,
    tickInterval: yAxisInterval,
    gridLineColor: 'rgba(229, 231, 235, 0.1)',
  },
  tooltip: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    style: { color: '#e5e7eb', fontSize: '12px' },
    formatter: function () {
      return `<b>${this.x}</b><br/><span style="color:${color}">${title}: ${this.y}${unit}</span>`;
    },
  },
  plotOptions: {
    column: {
      borderWidth: 0,
      groupPadding: 0.1,
      pointPadding: 0.05,
    },
    series: {
      dataLabels: {
        enabled: true,
        formatter: function () {
          return `<span style="color:${color}">${this.y}${unit}</span>`;
        },
        style: { fontSize: '10px', textOutline: 'none' },
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 4,
        padding: 4,
        shadow: true,
      },
    },
  },
  series: [
    { name: title, data: [], color: { linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 }, stops: [[0, color], [1, color.replace('ff', 'cc')]] } },
  ],
  legend: { enabled: false },
  credits: { enabled: false },
});

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
  const [chartOptions, setChartOptions] = useState(getChartOptions(isMobile()));
  const [angleChartOptions, setAngleChartOptions] = useState(getSingleChartOptions('angle', 'Ángulo del Dedo', 'Ángulo (grados)', 180, 30, '#00eaff', '°'));
  const [forceChartOptions, setForceChartOptions] = useState(getSingleChartOptions('force', 'Fuerza', 'Fuerza (N)', 20, 5, '#ff00cc', ' N'));
  const [servoForceChartOptions, setServoForceChartOptions] = useState(getSingleChartOptions('servoforce', 'Fuerza Servo', 'Fuerza Servo (N)', 15, 3, '#ffaa00', ' N'));
  const [velocityChartOptions, setVelocityChartOptions] = useState(getSingleChartOptions('velocity', 'Velocidad', 'Velocidad (grados/s)', 200, 40, '#a3e635', ' °/s'));
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
  const router = useRouter();

  const components = useMemo(
    () => [
      { name: 'Sensores Flexibles', description: 'Miden la flexión de los dedos.', image: '/imagenes/sensoresflexibles.png' },
      { name: 'MPU6050 (Giroscopio SparkFun)', description: 'Acelerómetro y giroscopio para detectar movimientos de la mano.', image: '/imagenes/sparkfun.png' },
      { name: 'Servomotores SM-S4306R', description: 'Asisten en los movimientos de los dedos con rotación continua.', image: '/imagenes/servo.png' },
      { name: 'Cables y Conectores', description: 'Para integrar los componentes.', image: '/imagenes/jumpers.png' },
      { name: 'Guante de Tela o Neopreno', description: 'Base para montar los sensores.', image: '/imagenes/guantes.png' },
    ],
    []
  );

  const [imageLoadStatus, setImageLoadStatus] = useState(
    components.map(() => ({ loaded: false, failed: false }))
  );

  useEffect(() => {
    const handleResize = () => {
      setChartOptions(getChartOptions(isMobile()));
      setAngleChartOptions(getSingleChartOptions('angle', 'Ángulo del Dedo', 'Ángulo (grados)', 180, 30, '#00eaff', '°'));
      setForceChartOptions(getSingleChartOptions('force', 'Fuerza', 'Fuerza (N)', 20, 5, '#ff00cc', ' N'));
      setServoForceChartOptions(getSingleChartOptions('servoforce', 'Fuerza Servo', 'Fuerza Servo (N)', 15, 3, '#ffaa00', ' N'));
      setVelocityChartOptions(getSingleChartOptions('velocity', 'Velocidad', 'Velocidad (grados/s)', 200, 40, '#a3e635', ' °/s'));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    setChartOptions(getChartOptions(isMobile()));
    setAngleChartOptions(getSingleChartOptions('angle', 'Ángulo del Dedo', 'Ángulo (grados)', 180, 30, '#00eaff', '°'));
    setForceChartOptions(getSingleChartOptions('force', 'Fuerza', 'Fuerza (N)', 20, 5, '#ff00cc', ' N'));
    setServoForceChartOptions(getSingleChartOptions('servoforce', 'Fuerza Servo', 'Fuerza Servo (N)', 15, 3, '#ffaa00', ' N'));
    setVelocityChartOptions(getSingleChartOptions('velocity', 'Velocidad', 'Velocidad (grados/s)', 200, 40, '#a3e635', ' °/s'));
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
            ...getChartOptions(isMobile()),
            subtitle: { text: 'No hay pacientes con datos registrados.', style: { color: '#ff4444', fontSize: '14px' } },
            series: [
              { ...getChartOptions(isMobile()).series[0], data: [] },
              { ...getChartOptions(isMobile()).series[1], data: [] },
              { ...getChartOptions(isMobile()).series[2], data: [] },
              { ...getChartOptions(isMobile()).series[3], data: [] },
            ],
          });
          setAngleChartOptions({ ...getSingleChartOptions('angle', 'Ángulo del Dedo', 'Ángulo (grados)', 180, 30, '#00eaff', '°'), series: [{ ...getSingleChartOptions('angle', 'Ángulo del Dedo', 'Ángulo (grados)', 180, 30, '#00eaff', '°').series[0], data: [] }] });
          setForceChartOptions({ ...getSingleChartOptions('force', 'Fuerza', 'Fuerza (N)', 20, 5, '#ff00cc', ' N'), series: [{ ...getSingleChartOptions('force', 'Fuerza', 'Fuerza (N)', 20, 5, '#ff00cc', ' N').series[0], data: [] }] });
          setServoForceChartOptions({ ...getSingleChartOptions('servoforce', 'Fuerza Servo', 'Fuerza Servo (N)', 15, 3, '#ffaa00', ' N'), series: [{ ...getSingleChartOptions('servoforce', 'Fuerza Servo', 'Fuerza Servo (N)', 15, 3, '#ffaa00', ' N').series[0], data: [] }] });
          setVelocityChartOptions({ ...getSingleChartOptions('velocity', 'Velocidad', 'Velocidad (grados/s)', 200, 40, '#a3e635', ' °/s'), series: [{ ...getSingleChartOptions('velocity', 'Velocidad', 'Velocidad (grados/s)', 200, 40, '#a3e635', ' °/s').series[0], data: [] }] });
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
        const noDataOptions = {
          ...getChartOptions(isMobile()),
          subtitle: { 
            text: 'El paciente no está registrado o no tiene datos.', 
            style: { color: '#ff4444', fontSize: '14px' } 
          },
          series: [
            { ...getChartOptions(isMobile()).series[0], data: [] },
            { ...getChartOptions(isMobile()).series[1], data: [] },
            { ...getChartOptions(isMobile()).series[2], data: [] },
            { ...getChartOptions(isMobile()).series[3], data: [] }
          ]
        };
        setChartOptions(noDataOptions);
        setAngleChartOptions({ 
          ...getSingleChartOptions('angle', 'Ángulo del Dedo', 'Ángulo (grados)', 180, 30, '#00eaff', '°'), 
          series: [{ ...getSingleChartOptions('angle', 'Ángulo del Dedo', 'Ángulo (grados)', 180, 30, '#00eaff', '°').series[0], data: [] }],
          subtitle: { text: 'No hay datos disponibles', style: { color: '#ff4444', fontSize: '12px' } }
        });
        setForceChartOptions({ 
          ...getSingleChartOptions('force', 'Fuerza', 'Fuerza (N)', 20, 5, '#ff00cc', ' N'), 
          series: [{ ...getSingleChartOptions('force', 'Fuerza', 'Fuerza (N)', 20, 5, '#ff00cc', ' N').series[0], data: [] }],
          subtitle: { text: 'No hay datos disponibles', style: { color: '#ff4444', fontSize: '12px' } }
        });
        setServoForceChartOptions({ 
          ...getSingleChartOptions('servoforce', 'Fuerza Servo', 'Fuerza Servo (N)', 15, 3, '#ffaa00', ' N'), 
          series: [{ ...getSingleChartOptions('servoforce', 'Fuerza Servo', 'Fuerza Servo (N)', 15, 3, '#ffaa00', ' N').series[0], data: [] }],
          subtitle: { text: 'No hay datos disponibles', style: { color: '#ff4444', fontSize: '12px' } }
        });
        setVelocityChartOptions({ 
          ...getSingleChartOptions('velocity', 'Velocidad', 'Velocidad (grados/s)', 200, 40, '#a3e635', ' °/s'), 
          series: [{ ...getSingleChartOptions('velocity', 'Velocidad', 'Velocidad (grados/s)', 200, 40, '#a3e635', ' °/s').series[0], data: [] }],
          subtitle: { text: 'No hay datos disponibles', style: { color: '#ff4444', fontSize: '12px' } }
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
      const progressPercentageLocal = calculateProgress({
        Index: {
          angle: series[0].data[0] || 0,
          force: series[1].data[0] || 0,
          servoforce: series[2].data[0] || 0,
          velocity: series[3].data[0] || 0
        },
        Ring: {
          angle: series[0].data[1] || 0,
          force: series[1].data[1] || 0,
          servoforce: series[2].data[1] || 0,
          velocity: series[3].data[1] || 0
        },
        Middle: {
          angle: series[0].data[2] || 0,
          force: series[1].data[2] || 0,
          servoforce: series[2].data[2] || 0,
          velocity: series[3].data[2] || 0
        },
        Little: {
          angle: series[0].data[3] || 0,
          force: series[1].data[3] || 0,
          servoforce: series[2].data[3] || 0,
          velocity: series[3].data[3] || 0
        }
      });
  
      const newOptions = {
        ...getChartOptions(isMobile()),
        xAxis: { categories },
        series: series.map((serie, index) => ({
          ...getChartOptions(isMobile()).series[index],
          data: serie.data,
        })),
        subtitle: { 
          text: subtitle, 
          style: { color: '#a0aec0', fontSize: '14px' } 
        },
      };
  
      setChartOptions(newOptions);
      setAngleChartOptions({
        ...getSingleChartOptions('angle', 'Ángulo del Dedo', 'Ángulo (grados)', 180, 30, '#00eaff', '°'),
        xAxis: { categories },
        series: [{ 
          ...getSingleChartOptions('angle', 'Ángulo del Dedo', 'Ángulo (grados)', 180, 30, '#00eaff', '°').series[0], 
          data: series[0].data 
        }],
        subtitle: { 
          text: subtitle, 
          style: { color: '#a0aec0', fontSize: '12px' } 
        }
      });
      setForceChartOptions({
        ...getSingleChartOptions('force', 'Fuerza', 'Fuerza (N)', 20, 5, '#ff00cc', ' N'),
        xAxis: { categories },
        series: [{ 
          ...getSingleChartOptions('force', 'Fuerza', 'Fuerza (N)', 20, 5, '#ff00cc', ' N').series[0], 
          data: series[1].data 
        }],
        subtitle: { 
          text: subtitle, 
          style: { color: '#a0aec0', fontSize: '12px' } 
        }
      });
      setServoForceChartOptions({
        ...getSingleChartOptions('servoforce', 'Fuerza Servo', 'Fuerza Servo (N)', 15, 3, '#ffaa00', ' N'),
        xAxis: { categories },
        series: [{ 
          ...getSingleChartOptions('servoforce', 'Fuerza Servo', 'Fuerza Servo (N)', 15, 3, '#ffaa00', ' N').series[0], 
          data: series[2].data 
        }],
        subtitle: { 
          text: subtitle, 
          style: { color: '#a0aec0', fontSize: '12px' } 
        }
      });
      setVelocityChartOptions({
        ...getSingleChartOptions('velocity', 'Velocidad', 'Velocidad (grados/s)', 200, 40, '#a3e635', ' °/s'),
        xAxis: { categories },
        series: [{ 
          ...getSingleChartOptions('velocity', 'Velocidad', 'Velocidad (grados/s)', 200, 40, '#a3e635', ' °/s').series[0], 
          data: series[3].data 
        }],
        subtitle: { 
          text: subtitle, 
          style: { color: '#a0aec0', fontSize: '12px' } 
        }
      });
      setTotalSessions(sessionCount || 0);
      setProgressPercentage(progressPercentageLocal);
    } catch (err) {
      console.error('getDailyProgressChart - Error:', err.message);
      const errorOptions = {
        ...getChartOptions(isMobile()),
        subtitle: { 
          text: 'Error al cargar los datos.', 
          style: { color: 'red', fontSize: '14px' } 
        },
        series: [
          { ...getChartOptions(isMobile()).series[0], data: [] },
          { ...getChartOptions(isMobile()).series[1], data: [] },
          { ...getChartOptions(isMobile()).series[2], data: [] },
          { ...getChartOptions(isMobile()).series[3], data: [] }
        ]
      };
      setChartOptions(errorOptions);
      setAngleChartOptions({ 
        ...getSingleChartOptions('angle', 'Ángulo del Dedo', 'Ángulo (grados)', 180, 30, '#00eaff', '°'), 
        series: [{ ...getSingleChartOptions('angle', 'Ángulo del Dedo', 'Ángulo (grados)', 180, 30, '#00eaff', '°').series[0], data: [] }],
        subtitle: { text: 'Error al cargar datos', style: { color: 'red', fontSize: '12px' } }
      });
      setForceChartOptions({ 
        ...getSingleChartOptions('force', 'Fuerza', 'Fuerza (N)', 20, 5, '#ff00cc', ' N'), 
        series: [{ ...getSingleChartOptions('force', 'Fuerza', 'Fuerza (N)', 20, 5, '#ff00cc', ' N').series[0], data: [] }],
        subtitle: { text: 'Error al cargar datos', style: { color: 'red', fontSize: '12px' } }
      });
      setServoForceChartOptions({ 
        ...getSingleChartOptions('servoforce', 'Fuerza Servo', 'Fuerza Servo (N)', 15, 3, '#ffaa00', ' N'), 
        series: [{ ...getSingleChartOptions('servoforce', 'Fuerza Servo', 'Fuerza Servo (N)', 15, 3, '#ffaa00', ' N').series[0], data: [] }],
        subtitle: { text: 'Error al cargar datos', style: { color: 'red', fontSize: '12px' } }
      });
      setVelocityChartOptions({ 
        ...getSingleChartOptions('velocity', 'Velocidad', 'Velocidad (grados/s)', 200, 40, '#a3e635', ' °/s'), 
        series: [{ ...getSingleChartOptions('velocity', 'Velocidad', 'Velocidad (grados/s)', 200, 40, '#a3e635', ' °/s').series[0], data: [] }],
        subtitle: { text: 'Error al cargar datos', style: { color: 'red', fontSize: '12px' } }
      });
      setTotalSessions(0);
      setProgressPercentage(0.0);
    }
  }, [patients]);

  useEffect(() => {
    if (selectedPatient && selectedPatient.isRegistered && selectedPatient.hasSessions) {
      // Resetear todos los gráficos antes de cargar nuevos datos
      const loadingOptions = {
        ...getChartOptions(isMobile()),
        subtitle: { 
          text: 'Cargando datos...', 
          style: { color: '#a0aec0', fontSize: '14px' } 
        },
        series: [
          { ...getChartOptions(isMobile()).series[0], data: [] },
          { ...getChartOptions(isMobile()).series[1], data: [] },
          { ...getChartOptions(isMobile()).series[2], data: [] },
          { ...getChartOptions(isMobile()).series[3], data: [] }
        ]
      };
      setChartOptions(loadingOptions);
      setAngleChartOptions({
        ...getSingleChartOptions('angle', 'Ángulo del Dedo', 'Ángulo (grados)', 180, 30, '#00eaff', '°'),
        series: [{ 
          ...getSingleChartOptions('angle', 'Ángulo del Dedo', 'Ángulo (grados)', 180, 30, '#00eaff', '°').series[0], 
          data: [] 
        }],
        subtitle: { 
          text: 'Cargando datos...', 
          style: { color: '#a0aec0', fontSize: '12px' } 
        }
      });
      setForceChartOptions({
        ...getSingleChartOptions('force', 'Fuerza', 'Fuerza (N)', 20, 5, '#ff00cc', ' N'),
        series: [{ 
          ...getSingleChartOptions('force', 'Fuerza', 'Fuerza (N)', 20, 5, '#ff00cc', ' N').series[0], 
          data: [] 
        }],
        subtitle: { 
          text: 'Cargando datos...', 
          style: { color: '#a0aec0', fontSize: '12px' } 
        }
      });
      setServoForceChartOptions({
        ...getSingleChartOptions('servoforce', 'Fuerza Servo', 'Fuerza Servo (N)', 15, 3, '#ffaa00', ' N'),
        series: [{ 
          ...getSingleChartOptions('servoforce', 'Fuerza Servo', 'Fuerza Servo (N)', 15, 3, '#ffaa00', ' N').series[0], 
          data: [] 
        }],
        subtitle: { 
          text: 'Cargando datos...', 
          style: { color: '#a0aec0', fontSize: '12px' } 
        }
      });
      setVelocityChartOptions({
        ...getSingleChartOptions('velocity', 'Velocidad', 'Velocidad (grados/s)', 200, 40, '#a3e635', ' °/s'),
        series: [{ 
          ...getSingleChartOptions('velocity', 'Velocidad', 'Velocidad (grados/s)', 200, 40, '#a3e635', ' °/s').series[0], 
          data: [] 
        }],
        subtitle: { 
          text: 'Cargando datos...', 
          style: { color: '#a0aec0', fontSize: '12px' } 
        }
      });
      
      // Ahora cargar los datos reales
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
      if (chartOptions && chartOptions.series[0].data.length > 0) {
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
        doc.text(observacionesText, 20, 190, { maxWidth: 170, lineHeightFactor: 1.2 });
        doc.save(`Informe_Progreso_${selectedPatient.nombre}_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
      } else {
        setError('No hay datos disponibles para descargar.');
      }
    } catch (err) {
      console.error('handleDownloadReport - Error:', err.message);
      setError('Error al generar/descargar el informe: ' + err.message);
    }
  }, [selectedPatient, chartOptions]);

  const calculateProgress = (fingerData) => {
    const goals = {
      angle: 180,
      force: 30,
      servoforce: 18,
      velocity: 240,
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
  
      const newFingerData = {
        Index: {
          angle: series[0].data[0] || 0,
          force: series[1].data[0] || 0,
          servoforce: series[2].data[0] || 0,
          velocity: series[3].data[0] || 0,
        },
        Ring: {
          angle: series[0].data[1] || 0,
          force: series[1].data[1] || 0,
          servoforce: series[2].data[1] || 0,
          velocity: series[3].data[1] || 0,
        },
        Middle: {
          angle: series[0].data[2] || 0,
          force: series[1].data[2] || 0,
          servoforce: series[2].data[2] || 0,
          velocity: series[3].data[2] || 0,
        },
        Little: {
          angle: series[0].data[3] || 0,
          force: series[1].data[3] || 0,
          servoforce: series[2].data[3] || 0,
          velocity: series[3].data[3] || 0,
        }
      };
  
      const progressPercentageLocal = calculateProgress(newFingerData);
  
      const newOptions = {
        ...getChartOptions(isMobile()),
        xAxis: { categories },
        series: series.map((serie, index) => ({
          ...getChartOptions(isMobile()).series[index],
          data: serie.data,
        })),
        subtitle: { 
          text: subtitle, 
          style: { color: '#a0aec0', fontSize: '14px' } 
        },
      };
  
      setFingerData(newFingerData);
      setChartOptions(newOptions);
      setAngleChartOptions({
        ...getSingleChartOptions('angle', 'Ángulo del Dedo', 'Ángulo (grados)', 180, 30, '#00eaff', '°'),
        xAxis: { categories },
        series: [{ 
          ...getSingleChartOptions('angle', 'Ángulo del Dedo', 'Ángulo (grados)', 180, 30, '#00eaff', '°').series[0], 
          data: series[0].data 
        }],
        subtitle: { 
          text: subtitle, 
          style: { color: '#a0aec0', fontSize: '12px' } 
        }
      });
      setForceChartOptions({
        ...getSingleChartOptions('force', 'Fuerza', 'Fuerza (N)', 20, 5, '#ff00cc', ' N'),
        xAxis: { categories },
        series: [{ 
          ...getSingleChartOptions('force', 'Fuerza', 'Fuerza (N)', 20, 5, '#ff00cc', ' N').series[0], 
          data: series[1].data 
        }],
        subtitle: { 
          text: subtitle, 
          style: { color: '#a0aec0', fontSize: '12px' } 
        }
      });
      setServoForceChartOptions({
        ...getSingleChartOptions('servoforce', 'Fuerza Servo', 'Fuerza Servo (N)', 15, 3, '#ffaa00', ' N'),
        xAxis: { categories },
        series: [{ 
          ...getSingleChartOptions('servoforce', 'Fuerza Servo', 'Fuerza Servo (N)', 15, 3, '#ffaa00', ' N').series[0], 
          data: series[2].data 
        }],
        subtitle: { 
          text: subtitle, 
          style: { color: '#a0aec0', fontSize: '12px' } 
        }
      });
      setVelocityChartOptions({
        ...getSingleChartOptions('velocity', 'Velocidad', 'Velocidad (grados/s)', 200, 40, '#a3e635', ' °/s'),
        xAxis: { categories },
        series: [{ 
          ...getSingleChartOptions('velocity', 'Velocidad', 'Velocidad (grados/s)', 200, 40, '#a3e635', ' °/s').series[0], 
          data: series[3].data 
        }],
        subtitle: { 
          text: subtitle, 
          style: { color: '#a0aec0', fontSize: '12px' } 
        }
      });
      setTotalSessions(sessionCount || 0);
      setProgressPercentage(progressPercentageLocal);
      setLoading(false);
    } catch (err) {
      console.error('fetchUserProgress - Error:', err.message);
      const errorOptions = {
        ...getChartOptions(isMobile()),
        subtitle: { 
          text: 'Aún no hay datos registrados.', 
          style: { color: '#ff4444', fontSize: '14px' } 
        },
        series: [
          { ...getChartOptions(isMobile()).series[0], data: [] },
          { ...getChartOptions(isMobile()).series[1], data: [] },
          { ...getChartOptions(isMobile()).series[2], data: [] },
          { ...getChartOptions(isMobile()).series[3], data: [] }
        ]
      };
      setChartOptions(errorOptions);
      setAngleChartOptions({ 
        ...getSingleChartOptions('angle', 'Ángulo del Dedo', 'Ángulo (grados)', 180, 30, '#00eaff', '°'), 
        series: [{ ...getSingleChartOptions('angle', 'Ángulo del Dedo', 'Ángulo (grados)', 180, 30, '#00eaff', '°').series[0], data: [] }],
        subtitle: { text: 'Aún no hay datos registrados', style: { color: '#ff4444', fontSize: '12px' } }
      });
      setForceChartOptions({ 
        ...getSingleChartOptions('force', 'Fuerza', 'Fuerza (N)', 20, 5, '#ff00cc', ' N'), 
        series: [{ ...getSingleChartOptions('force', 'Fuerza', 'Fuerza (N)', 20, 5, '#ff00cc', ' N').series[0], data: [] }],
        subtitle: { text: 'Aún no hay datos registrados', style: { color: '#ff4444', fontSize: '12px' } }
      });
      setServoForceChartOptions({ 
        ...getSingleChartOptions('servoforce', 'Fuerza Servo', 'Fuerza Servo (N)', 15, 3, '#ffaa00', ' N'), 
        series: [{ ...getSingleChartOptions('servoforce', 'Fuerza Servo', 'Fuerza Servo (N)', 15, 3, '#ffaa00', ' N').series[0], data: [] }],
        subtitle: { text: 'Aún no hay datos registrados', style: { color: '#ff4444', fontSize: '12px' } }
      });
      setVelocityChartOptions({ 
        ...getSingleChartOptions('velocity', 'Velocidad', 'Velocidad (grados/s)', 200, 40, '#a3e635', ' °/s'), 
        series: [{ ...getSingleChartOptions('velocity', 'Velocidad', 'Velocidad (grados/s)', 200, 40, '#a3e635', ' °/s').series[0], data: [] }],
        subtitle: { text: 'Aún no hay datos registrados', style: { color: '#ff4444', fontSize: '12px' } }
      });
      setTotalSessions(0);
      setProgressPercentage(0.0);
      setLoading(false);
    }
  }, []);

// Función para obtener las observaciones del usuario (paciente)
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

    // Aseguramos que data.observaciones sea un array, y si no hay observaciones, devolvemos un array vacío
    const observaciones = Array.isArray(data.observaciones) && data.observaciones.length > 0
      ? data.observaciones
      : [];
    setUserObservaciones(observaciones);
  } catch (err) {
    console.error('fetchUserObservations - Error:', err.message);
    setError('Error al cargar observaciones: ' + err.message);
    setUserObservaciones([]); // En caso de error, seteamos un array vacío
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
      console.log('handleSubmit - Fetching:', `${API_BASE_URL}/api/login`);
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('handleSubmit - Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('handleSubmit - Error Response:', errorText);
        throw new Error(`Error ${response.status}: ${errorText || 'No se pudo conectar al servidor'}`);
      }

      const data = await response.json();
      console.log('handleSubmit - Response Data:', data);

      if (!data.success) {
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
      setError(err.message || 'Ocurrió un error al iniciar sesión. Verifica tu conexión o intenta de nuevo.');
    }
  }, [email, password, fetchPatients, fetchNotifications, fetchUserProgress, fetchUserObservations]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neonCyan"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative background-pattern">
      <Navbar
        user={user}
        setUser={setUser}
        resetAllStates={resetAllStates}
        fetchPatients={fetchPatients}
        fetchNotifications={fetchNotifications}
        fetchUserProgress={fetchUserProgress}
        fetchUserObservations={fetchUserObservations}
      />
      <main className="flex-grow pt-20">
        {!user ? (
        <div className="container mx-auto py-16 px-6 relative min-h-screen z-10 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-8 w-full max-w-6xl md:flex-row">
          {/* Sección izquierda - Video y título */}
          <div className="w-full max-w-md flex flex-col items-center space-y-8">
            <div className="relative w-full h-48 sm:h-64 md:h-[300px] rounded-2xl overflow-hidden">
              <video 
                autoPlay 
                loop 
                muted 
                className="absolute top-0 left-0 w-full h-full object-cover mix-blend-multiply bg-transparent"
              >
                <source src="./videos/BACKGROUND.webm" type="video/webm" />
                Tu navegador no soporta el elemento de video.
              </video>
            </div>
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-cyan-300 mb-4">RECOVGLOX</h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-xl mx-auto">
                Una solución avanzada para la rehabilitación de manos. Monitorea tu progreso, mejora tu movilidad y recupera tu fuerza con tecnología de punta.
              </p>
            </div>
          </div>
      
          {/* Sección derecha - Formulario */}
          <div className="w-full max-w-md flex justify-center">
            <div className="w-full bg-cardBg backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-cyan-300 text-center mb-6">Iniciar Sesión</h2>
              
              {error && (
                <div className="mb-4 p-3 bg-red-900/50 text-red-300 rounded-lg text-sm sm:text-base">
                  {error}
                </div>
              )}
      
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Correo"
                  required
                  className="input-field text-sm sm:text-base"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  required
                  className="input-field text-sm sm:text-base"
                />
                <button type="submit" className="button-primary text-sm sm:text-base">
                  Iniciar Sesión
                </button>
              </form>
      
              <p className="text-center mt-4 text-gray-300 text-sm sm:text-base">
                ¿No tienes cuenta?{' '}
                <Link href="/register" className="text-cyan-400 hover:text-cyan-300 transition-all">
                  Regístrate
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
        ) : (
          <div className="container mx-auto py-8 px-4 sm:px-6">
            {user.userType === 'physio' ? (
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/3 bg-cardBg backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-gray-700">
                  <div className="min-h-[150px]">
                    <h3 className="text-lg sm:text-xl font-bold text-cyan-300 mb-4 text-center">Agregar Paciente</h3>
                    <form onSubmit={handleAddPatient} className="space-y-4 w-full">
                      <input
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="Nombre del paciente"
                        required
                        className="input-field text-sm sm:text-base"
                      />
                      <input
                        type="email"
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        placeholder="Correo del paciente"
                        required
                        className="input-field text-sm sm:text-base"
                      />
                      <button type="submit" className="button-primary text-sm sm:text-base">Agregar</button>
                    </form>
                  </div>
                  <div className="min-h-[200px] mt-6">
                    <h3 className="text-lg sm:text-xl font-bold text-cyan-300 mb-4 text-center">Notificaciones</h3>
                    {notifications.length === 0 ? (
                      <p className="text-gray-400 text-center text-sm sm:text-base">No hay notificaciones.</p>
                    ) : (
                      <>
                        <ul className="space-y-3 w-full">
                          {notifications.slice(0, showAllNotifications ? notifications.length : 2).map((notif, index) => (
                            <li key={index} className="p-3 bg-darkBg rounded-lg shadow-md border border-gray-600 flex items-start">
                              <span className={`mr-2 ${notif.read ? 'text-gray-500' : 'text-yellow-500'}`}>●</span>
                              <div>
                                <p className="text-gray-400 text-sm">{notif.message}</p>
                                <p className="text-gray-500 text-xs">{new Date(notif.timestamp).toLocaleString('es-ES')}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                        {notifications.length > 2 && (
                          <button
                            onClick={() => setShowAllNotifications(!showAllNotifications)}
                            className="text-cyan-400 hover:text-cyan-300 transition-all mt-4 block mx-auto text-sm"
                          >
                            {showAllNotifications ? 'Ver menos' : 'Ver más'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <div className="min-h-[200px] mt-6">
                    <h3 className="text-lg sm:text-xl font-bold text-cyan-300 mb-4 text-center">Pacientes Registrados</h3>
                    {loading ? (
                      <p className="text-gray-400 text-center text-sm sm:text-base">Cargando...</p>
                    ) : patients.length === 0 ? (
                      <p className="text-gray-400 text-center text-sm sm:text-base">No hay pacientes registrados.</p>
                    ) : (
                      <>
                        <ul className="space-y-3 w-full">
                          {patients.slice(0, showAllPatients ? patients.length : 2).map((patient) => (
                            <li key={patient.id} className="p-3 bg-darkBg rounded-lg shadow-md border border-gray-600 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-2 sm:mb-0">
                                <span className="text-gray-300 text-sm">
                                  {patient.nombre} ({patient.email})
                                </span>
                                {!patient.isRegistered && (
                                  <span className="text-red-500 text-xs font-semibold">[No registrado]</span>
                                )}
                                {patient.hasSessions && (
                                  <span className="text-gray-500 text-xs">
                                    ({patient.sessionCount} sesiones)
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  setChartOptions({
                                    ...getChartOptions(isMobile()),
                                    subtitle: { text: 'Cargando datos...', style: { color: '#a0aec0', fontSize: '14px' } },
                                    series: [
                                      { ...getChartOptions(isMobile()).series[0], data: [] },
                                      { ...getChartOptions(isMobile()).series[1], data: [] },
                                      { ...getChartOptions(isMobile()).series[2], data: [] },
                                      { ...getChartOptions(isMobile()).series[3], data: [] },
                                    ],
                                  });
                                  setAngleChartOptions({ ...getSingleChartOptions('angle', 'Ángulo del Dedo', 'Ángulo (grados)', 180, 30, '#00eaff', '°'), series: [{ ...getSingleChartOptions('angle', 'Ángulo del Dedo', 'Ángulo (grados)', 180, 30, '#00eaff', '°').series[0], data: [] }] });
                                  setForceChartOptions({ ...getSingleChartOptions('force', 'Fuerza', 'Fuerza (N)', 20, 5, '#ff00cc', ' N'), series: [{ ...getSingleChartOptions('force', 'Fuerza', 'Fuerza (N)', 20, 5, '#ff00cc', ' N').series[0], data: [] }] });
                                  setServoForceChartOptions({ ...getSingleChartOptions('servoforce', 'Fuerza Servo', 'Fuerza Servo (N)', 15, 3, '#ffaa00', ' N'), series: [{ ...getSingleChartOptions('servoforce', 'Fuerza Servo', 'Fuerza Servo (N)', 15, 3, '#ffaa00', ' N').series[0], data: [] }] });
                                  setVelocityChartOptions({ ...getSingleChartOptions('velocity', 'Velocidad', 'Velocidad (grados/s)', 200, 40, '#a3e635', ' °/s'), series: [{ ...getSingleChartOptions('velocity', 'Velocidad', 'Velocidad (grados/s)', 200, 40, '#a3e635', ' °/s').series[0], data: [] }] });
                                  setTotalSessions(0);
                                  setProgressPercentage(0.0);
                                  setSelectedPatient(patient);
                                  if (patient.isRegistered && patient.hasSessions) {
                                    getDailyProgressChart(patient.email);
                                  } else {
                                    setChartOptions({
                                      ...getChartOptions(isMobile()),
                                      subtitle: { text: 'Aún no hay datos registrados para este paciente.', style: { color: '#ff4444', fontSize: '14px' } },
                                      series: [
                                        { ...getChartOptions(isMobile()).series[0], data: [] },
                                        { ...getChartOptions(isMobile()).series[1], data: [] },
                                        { ...getChartOptions(isMobile()).series[2], data: [] },
                                        { ...getChartOptions(isMobile()).series[3], data: [] },
                                      ],
                                    });
                                    setAngleChartOptions({ ...getSingleChartOptions('angle', 'Ángulo del Dedo', 'Ángulo (grados)', 180, 30, '#00eaff', '°'), series: [{ ...getSingleChartOptions('angle', 'Ángulo del Dedo', 'Ángulo (grados)', 180, 30, '#00eaff', '°').series[0], data: [] }] });
                                    setForceChartOptions({ ...getSingleChartOptions('force', 'Fuerza', 'Fuerza (N)', 20, 5, '#ff00cc', ' N'), series: [{ ...getSingleChartOptions('force', 'Fuerza', 'Fuerza (N)', 20, 5, '#ff00cc', ' N').series[0], data: [] }] });
                                    setServoForceChartOptions({ ...getSingleChartOptions('servoforce', 'Fuerza Servo', 'Fuerza Servo (N)', 15, 3, '#ffaa00', ' N'), series: [{ ...getSingleChartOptions('servoforce', 'Fuerza Servo', 'Fuerza Servo (N)', 15, 3, '#ffaa00', ' N').series[0], data: [] }] });
                                    setVelocityChartOptions({ ...getSingleChartOptions('velocity', 'Velocidad', 'Velocidad (grados/s)', 200, 40, '#a3e635', ' °/s'), series: [{ ...getSingleChartOptions('velocity', 'Velocidad', 'Velocidad (grados/s)', 200, 40, '#a3e635', ' °/s').series[0], data: [] }] });
                                  }
                                }}
                                className="text-cyan-400 hover:text-cyan-300 transition-all text-sm"
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
                            className="text-cyan-400 hover:text-cyan-300 transition-all mt-4 block mx-auto text-sm"
                          >
                            {showAllPatients ? 'Ver menos' : 'Ver más'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <div className="min-h-[100px] mt-6">
                    <h4 className="text-lg font-bold text-cyan-300 mb-4 text-center">Estadísticas Rápidas</h4>
                    <div className="space-y-2 text-center">
                      <p className="text-gray-300 text-sm">Pacientes registrados: {patients.length}</p>
                      <p className="text-gray-300 text-sm">Sesiones registradas: {totalSessions}</p>
                      <p className="text-gray-300 text-sm">Última actualización: {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                  {selectedPatient && Array.isArray(selectedPatient.observaciones) && selectedPatient.observaciones.length > 0 && (
                    <div className="min-h-[100px] mt-6 p-4 bg-darkBg rounded-lg shadow-md border border-gray-600">
                      <h5 className="text-lg font-bold text-cyan-300 mb-4">Historial de Observaciones</h5>
                      {selectedPatient.observaciones.map((obs, index) => (
                        <p key={index} className="text-gray-300 whitespace-pre-wrap text-sm">
                          {obs.fechaObservacion ? new Date(obs.fechaObservacion).toLocaleString() : 'Fecha no disponible'}: {obs.text || 'Sin texto'}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-full md:w-2/3 bg-cardBg backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-gray-700">
                  {selectedPatient ? (
                    <>
                      <h3 className="text-lg sm:text-xl font-bold text-cyan-300 mb-4 text-center">
                        Progreso de {selectedPatient.nombre}
                      </h3>
                      {isMobile() ? (
                        <div className="space-y-6">
                          <div className="chart-container p-4 bg-darkBg rounded-lg shadow-inner w-[660px]">
                            <HighchartsReact highcharts={Highcharts} options={angleChartOptions} />
                          </div>
                          <div className="chart-container p-4 bg-darkBg rounded-lg shadow-inner w-[660px]">
                            <HighchartsReact highcharts={Highcharts} options={forceChartOptions} />
                          </div>
                          <div className="chart-container p-4 bg-darkBg rounded-lg shadow-inner w-[660px]">
                            <HighchartsReact highcharts={Highcharts} options={servoForceChartOptions} />
                          </div>
                          <div className="chart-container p-4 bg-darkBg rounded-lg shadow-inner w-[660px]">
                            <HighchartsReact highcharts={Highcharts} options={velocityChartOptions} />
                          </div>
                        </div>
                      ) : (
                        <div className="chart-container p-4 bg-darkBg rounded-lg shadow-inner w-[660px]">
                          <HighchartsReact highcharts={Highcharts} options={chartOptions} />
                        </div>
                      )}
                      <div className="mt-6 w-full">
                        <h4 className="text-lg font-bold text-cyan-300 mb-4 text-center">Observaciones</h4>
                        <textarea
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          placeholder="Escribe tus observaciones aquí..."
                          className="input-field h-32 text-sm"
                        />
                        <button onClick={handleAddObservacion} className="button-primary mt-4 text-sm">
                          Guardar Observación
                        </button>
                      </div>
                      <button onClick={handleDownloadReport} className="button-primary mt-4 text-sm">
                        Descargar Informe PDF
                      </button>
                    </>
                  ) : (
                    <p className="text-gray-400 text-center text-sm sm:text-base">Selecciona un paciente para ver su progreso.</p>
                  )}
                  {error && <p className="text-center text-red-500 mt-4 text-sm">{error}</p>}
                </div>
              </div>
            ) : (
              <div className="max-w-[1280px] mx-auto py-8 px-4 sm:px-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-2/3 bg-cardBg backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-gray-700">
                    <h3 className="text-lg sm:text-xl font-bold text-cyan-300 mb-4 text-center">
                      Tu Progreso de Rehabilitación
                    </h3>
                    {isMobile() ? (
                      <div className="space-y-6">
                        <div className="chart-container p-4 bg-darkBg rounded-lg shadow-inner w-full">
                          <HighchartsReact highcharts={Highcharts} options={angleChartOptions} />
                        </div>
                        <div className="chart-container p-4 bg-darkBg rounded-lg shadow-inner w-full">
                          <HighchartsReact highcharts={Highcharts} options={forceChartOptions} />
                        </div>
                        <div className="chart-container p-4 bg-darkBg rounded-lg shadow-inner w-full">
                          <HighchartsReact highcharts={Highcharts} options={servoForceChartOptions} />
                        </div>
                        <div className="chart-container p-4 bg-darkBg rounded-lg shadow-inner w-full">
                          <HighchartsReact highcharts={Highcharts} options={velocityChartOptions} />
                        </div>
                      </div>
                    ) : (
                      <div className="chart-container p-4 bg-darkBg rounded-lg shadow-inner w-full">
                        <HighchartsReact highcharts={Highcharts} options={chartOptions} />
                      </div>
                    )}
                    <div className="mt-6 w-full">
                      <h4 className="text-lg font-bold text-cyan-300 mb-4 text-center">Estadísticas</h4>
                      <div className="space-y-2 text-center">
                        <p className="text-gray-300 text-sm">Sesiones completadas: {totalSessions}</p>
                        <p className="text-gray-300 text-sm">Progreso general: {progressPercentage}%</p>
                      </div>
                    </div>
                  </div>
                  <div className="w-full md:w-1/3 bg-cardBg backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-gray-700">
                    <h3 className="text-lg sm:text-xl font-bold text-cyan-300 mb-4 text-center">Componentes del Guante</h3>
                    <div className="relative w-full h-64 sm:h-80">
                      {components.map((component, index) => (
                        <div
                          key={index}
                          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                            index === currentIndex ? 'opacity-100' : 'opacity-0'
                          } flex flex-col items-center justify-center p-4`}
                        >
                          <div className="relative w-full h-40 sm:h-48 flex items-center justify-center">
                            {imageLoadStatus[index]?.failed ? (
                              <div className="svg-placeholder">
                                <span className="text-gray-400">Imagen no disponible</span>
                              </div>
                            ) : (
                              <Image
                                src={component.image}
                                alt={component.name}
                                layout="fill"
                                objectFit="contain"
                                className={`transition-opacity duration-1000 ease-in-out ${
                                  imageLoadStatus[index]?.loaded ? 'opacity-100' : 'opacity-0'
                                } max-w-full max-h-full rounded-lg shadow-md border border-gray-600`}
                                onLoad={() => handleImageLoad(index)}
                                onError={() => handleImageError(index)}
                              />
                            )}
                          </div>
                          <h4 className="text-base sm:text-lg font-semibold text-cyan-300 mt-4 text-center">{component.name}</h4>
                          <p className="text-gray-400 mt-2 text-center text-sm sm:text-base">{component.description}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-center mt-4 space-x-2">
                      {components.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentIndex(index)}
                          className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            index === currentIndex ? 'bg-cyan-400 scale-125' : 'bg-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="mt-6">
                      <h4 className="text-lg font-bold text-cyan-300 mb-4 text-center">Observaciones</h4>
                      {Array.isArray(userObservaciones) && userObservaciones.length > 0 ? (
                        userObservaciones.map((obs, index) => (
                          <p key={index} className="text-gray-300 whitespace-pre-wrap text-sm">
                            {obs.fechaObservacion ? new Date(obs.fechaObservacion).toLocaleString() : 'Fecha no disponible'}: {obs.text || 'Sin texto'}
                          </p>
                        ))
                      ) : (
                        <p className="text-gray-300 whitespace-pre-wrap text-sm">No hay observaciones disponibles.</p>
                      )}
                    </div>
                    {error && <p className="text-center text-red-500 mt-4 text-sm">{error}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
