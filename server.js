const mysql = require('mysql2');
const dotenv = require('dotenv');
const express = require('express');
const incidenciasRouter = require('./routes/incidencias');
const usuariosRouter = require('./routes/usuarios');
const notificacionesRouter = require('./routes/notificaciones');
const cors = require('cors');
dotenv.config();

const app = express();
const port = process.env.PORT_GI || 3000;

const connection = mysql.createConnection({
  host: process.env.DB_HOST_GI,
  user: process.env.DB_USER_GI,
  password: process.env.DB_PASSWORD_GI,
  database: process.env.DB_NAME_GI
});

connection.connect(err => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.stack);
    return;
  }
});

app.use(express.json());
app.use(cors());
app.use('/api/incidencias', incidenciasRouter(connection));
app.use('/api/usuarios', usuariosRouter(connection));
app.use('/api/notificaciones', notificacionesRouter(connection));

app.listen(port, () => {
  console.log(`Servidor de backend corriendo en http://localhost:${port}`);
  console.log('Conectado a la base de datos' + process.env.DB_NAME_GI + ' en ' + process.env.DB_HOST_GI);
});