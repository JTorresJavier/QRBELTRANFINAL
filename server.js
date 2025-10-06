// server.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');                 // ★ NEW

const authRoutes = require('./server/auth.routes');
const recoveryRoutes = require('./server/recovery.routes');
const qrRoutes = require('./server/qr.routes');
const studentRoutes = require('./server/student.routes');
const adminRoutes = require('./server/admin.routes');

const app = express();

// ★ NEW – CSP permisiva para tu caso (quita el "default-src 'none'")
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      scriptSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "http://localhost:3000"], // fetch a tu API
    }
  },
  crossOriginEmbedderPolicy: false, // evita bloqueos en dev
}));

app.use(cors());                    // si servís todo desde /public, podrías quitarlo
app.use(express.json());

// ★ NEW – opcional: responder vacío al favicon para evitar warnings
app.get('/favicon.ico', (_req, res) => res.status(204).end());

// Rutas de recuperación de contraseña
app.use('/api/auth/recovery', recoveryRoutes);

// API
app.use('/api/auth', authRoutes);

// Rutas de QR
app.use('/api/qr', qrRoutes);

// Rutas de estudiante
app.use('/api/student', studentRoutes);

// Frontend estático
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de admin (al final, para que no pisen /public)
app.use('/api/admin', adminRoutes);

// fallback opcional: servir index si piden rutas sin extensión
// app.get(/^\/(?!api\/).*(?!\.[a-zA-Z0-9]+)$/, (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Servidor en http://localhost:${port}`));
