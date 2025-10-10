const express = require('express');
const router = express.Router();

module.exports = (dbConnection) => {
    router.post('/', (req, res) => {
        const { usuario_id, incidencia_id, mensaje } = req.body;

        if (!usuario_id || !incidencia_id || !mensaje) {
            return res.status(400).send('Faltan campos obligatorios: usuario_id, incidencia_id, mensaje.');
        }

        const query = 'INSERT INTO notificaciones (usuario_id, incidencia_id, mensaje, leida) VALUES (?, ?, ?, 0)';

        dbConnection.query(
            query, 
            [usuario_id, incidencia_id, mensaje], 
            (err, result) => {
                if (err) {
                    console.error('Error al insertar la notificación:', err);
                    return res.status(500).send('Error al crear la notificación en MySQL.');
                }
                res.status(201).json({ message: 'Notificación creada con éxito.', id: result.insertId });
            }
        );
    });

    router.get('/', (req, res) => {
        const query = 'SELECT * FROM notificaciones';
        dbConnection.query(query, (err, results) => {
            if (err) {
                console.error('Error al obtener las notificaciones:', err);
                return res.status(500).send('Error al obtener las notificaciones.');
            }
            res.status(200).json(results);
        });
    });

    router.get('/usuario/:usuario_id', (req, res) => {
        const { usuario_id } = req.params;
        
        const query = 'SELECT * FROM notificaciones WHERE usuario_id = ? ORDER BY leida ASC, fecha_creacion DESC';

        dbConnection.query(query, [usuario_id], (err, results) => {
            if (err) {
                console.error('Error al obtener las notificaciones:', err);
                return res.status(500).send('Error al obtener las notificaciones.');
            }
            res.status(200).json(results);
        });
    });
    
    router.put('/:id/leida', (req, res) => {
        const { id } = req.params;
        const query = 'UPDATE notificaciones SET leida = 1 WHERE id = ? AND leida = 0';
        
        dbConnection.query(query, [id], (err, result) => {
            if (err) {
                console.error('Error al marcar la notificación como leída:', err);
                return res.status(500).send('Error al actualizar la notificación.');
            }
            if (result.affectedRows === 0) {
                return res.status(200).send('Notificación no encontrada o ya estaba marcada como leída.');
            }
            res.status(200).send('Notificación marcada como leída.');
        });
    });

    return router;
};