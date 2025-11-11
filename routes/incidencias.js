const express = require('express');
const router = express.Router();
const upload = require('../services/storageService');
const { generarReporteIncidencia } = require('../services/reporteWordService'); 

const sendNotification = (dbConnection, usuarioId, incidenciaId, mensaje) => {
    if (!usuarioId) return;
    const notifQuery = 'INSERT INTO notificaciones (usuario_id, incidencia_id, mensaje) VALUES (?, ?, ?)';
    dbConnection.query(notifQuery, [usuarioId, incidenciaId, mensaje], (notifErr) => {
        if (notifErr) {
            console.error('ADVERTENCIA: Falló la creación de la notificación:', notifErr);
        }
    });
};

module.exports = (dbConnection) => {
    router.post('/', upload.any(), async (req, res) => {
        const { area, modulo, detalle, hora, prioridad, responsable_id } = req.body;
        const file = req.files && req.files.length > 0 ? req.files[0] : null;
        let url_foto_almacenada = file?.path || null;

        const estado_inicial = 'Pendiente';
        const query = 'INSERT INTO incidencias (area, modulo, descripcion, hora, prioridad, estado, responsable_id, url_foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

        dbConnection.query(
            query,
            [area, modulo, detalle, hora, prioridad, estado_inicial, responsable_id, url_foto_almacenada],
            (err, result) => {
                if (err) {
                    console.error('Error al insertar la incidencia:', err);
                    return res.status(500).send('Error al crear la incidencia en MySQL.');
                }

                const nuevaIncidenciaId = result.insertId;
                if (responsable_id) {
                    const mensajeNotif = `¡Se te ha asignado la nueva incidencia #${nuevaIncidenciaId} en el área de ${area}!`;
                    sendNotification(dbConnection, responsable_id, nuevaIncidenciaId, mensajeNotif);
                }

                res.status(201).json({
                    message: 'Incidencia creada con éxito.',
                    id: nuevaIncidenciaId,
                    url_foto: url_foto_almacenada
                });
            }
        );
    });

    router.post('/registrar-y-descargar', upload.any(), async (req, res) => {
        const { area, modulo, detalle, prioridad, responsable_id, hora } = req.body;
        const file = req.files && req.files.length > 0 ? req.files[0] : null;
        let url_foto_almacenada = file?.path || null;

        const estado_inicial = 'Pendiente';
        const query = 'INSERT INTO incidencias (area, modulo, descripcion, hora, prioridad, estado, responsable_id, url_foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

        dbConnection.query(
            query,
            [area, modulo, detalle, hora, prioridad, estado_inicial, responsable_id, url_foto_almacenada],
            async (err, result) => {
                if (err) {
                    console.error('Error al insertar la incidencia:', err);
                    return res.status(500).send('Error al crear la incidencia en MySQL.');
                }

                const nuevaIncidenciaId = result.insertId;
                if (responsable_id) {
                    const mensajeNotif = `¡Se te ha asignado la nueva incidencia #${nuevaIncidenciaId} en el área de ${area}!`;
                    sendNotification(dbConnection, responsable_id, nuevaIncidenciaId, mensajeNotif);
                }

                try {
                    const datosIncidenciaParaReporte = {
                        id: nuevaIncidenciaId,
                        area,
                        modulo,
                        descripcion: detalle,
                        hora,
                        prioridad,
                        estado: estado_inicial,
                        responsable_id,
                        url_foto: url_foto_almacenada,
                        fecha_creacion: new Date()
                    };

                    const docBuffer = await generarReporteIncidencia(datosIncidenciaParaReporte);
                    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                    res.setHeader('Content-Disposition', `attachment; filename=Reporte_Incidencia_${nuevaIncidenciaId}.docx`);
                    res.send(docBuffer);
                } catch (reportErr) {
                    console.error('Error al generar el reporte:', reportErr);
                    res.status(201).json({
                        message: 'Incidencia creada con éxito, pero falló la generación del reporte Word.',
                        id: nuevaIncidenciaId
                    });
                }
            }
        );
    });

    /* router.put('/:id', upload.any(), async (req, res) => {
        const { id } = req.params;
        const { area, modulo, descripcion, hora, prioridad, estado, responsable_id } = req.body;
        const file = req.files && req.files.length > 0 ? req.files[0] : null;
        let nuevaUrlFoto = file?.path || null;

        try {
            const getResponsableQuery = 'SELECT responsable_id, url_foto FROM incidencias WHERE id = ?';
            dbConnection.query(getResponsableQuery, [id], (err, results) => {
                if (err || results.length === 0) {
                    return res.status(404).send('Incidencia no encontrada.');
                }

                const responsableAnteriorId = results[0].responsable_id;
                const urlFotoAnterior = results[0].url_foto;

                let query = 'UPDATE incidencias SET area = ?, modulo = ?, descripcion = ?, hora = ?, prioridad = ?, estado = ?, responsable_id = ?, fecha_actualizacion = CURRENT_TIMESTAMP';
                const params = [area, modulo, descripcion, hora, prioridad, estado, responsable_id];

                if (nuevaUrlFoto) {
                    query += ', url_foto = ?';
                    params.push(nuevaUrlFoto);
                } else if (urlFotoAnterior && urlFotoAnterior !== '') {
                    query += ', url_foto = ?';
                    params.push(urlFotoAnterior);
                } else {
                    query += ', url_foto = NULL';
                }

                query += ' WHERE id = ?';
                params.push(id);

                dbConnection.query(query, params, (err, result) => {
                    if (err) {
                        console.error('Error al actualizar la incidencia:', err);
                        return res.status(500).send('Error al actualizar la incidencia.');
                    }

                    if (result.affectedRows === 0) {
                        return res.status(404).send('Incidencia no encontrada.');
                    }

                    const responsableChanged = responsable_id !== responsableAnteriorId;

                    if (responsableChanged) {
                        if (responsableAnteriorId) {
                            const mensajeAntiguo = `La incidencia #${id} ha sido reasignada a otra persona.`;
                            sendNotification(dbConnection, responsableAnteriorId, id, mensajeAntiguo);
                        }

                        if (responsable_id) {
                            const mensajeNuevo = `Se te asignó la incidencia #${id}`;
                            sendNotification(dbConnection, responsable_id, id, mensajeNuevo);
                        }
                    } else if (responsable_id) {
                        const mensajeGeneral = `La incidencia #${id} ha sido actualizada.`;
                        sendNotification(dbConnection, responsable_id, id, mensajeGeneral);
                    }

                    res.status(200).json({
                        message: 'Incidencia actualizada con éxito.',
                        nueva_url_foto: nuevaUrlFoto || urlFotoAnterior || null
                    });
                });
            });
        } catch (error) {
            console.error('Error general al actualizar incidencia:', error);
            res.status(500).send('Error interno al actualizar la incidencia.');
        }
    }); */

    router.get('/', (req, res) => {
        const query = 'SELECT * FROM incidencias';
        dbConnection.query(query, (err, results) => {
            if (err) {
                console.error('Error al obtener las incidencias:', err);
                return res.status(500).send('Error al obtener las incidencias.');
            }
            res.status(200).json(results);
        });
    });

    router.get('/descargar-reporte/:id', (req, res) => {
        const { id } = req.params;

        const query = `
            SELECT 
            i.id,
            i.area,
            i.modulo,
            i.descripcion,
            i.hora,
            i.prioridad,
            i.estado,
            i.responsable_id,
            i.url_foto,
            i.fecha_creacion,
            u.nombre AS responsable_nombre
            FROM incidencias i
            LEFT JOIN usuarios u ON i.responsable_id = u.id
            WHERE i.id = ?;
        `;

        dbConnection.query(query, [id], async (err, results) => {
            if (err) {
                console.error('Error al obtener la incidencia para el reporte:', err);
                return res.status(500).send('Error al obtener la incidencia.');
            }
                if (results.length === 0) {
                return res.status(404).send('Incidencia no encontrada.');
            }

            const i = results[0];

            try {
                const datos = {
                    id: i.id,
                    area: i.area,
                    modulo: i.modulo,
                    descripcion: i.descripcion,
                    hora: i.hora,
                    prioridad: i.prioridad,
                    estado: i.estado,
                    responsable_id: i.responsable_id,
                    responsable_nombre: i.responsable_nombre,
                    url_foto: i.url_foto || null,
                    fecha_creacion: i.fecha_creacion || new Date(),
                };

                const docBuffer = await generarReporteIncidencia(datos);

                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                res.setHeader('Content-Disposition', `attachment; filename=Reporte_Incidencia_${id}.docx`);
                res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
                res.setHeader('Content-Length', Buffer.byteLength(docBuffer));

                return res.end(docBuffer);
            } catch (e) {
                console.error('Error al generar el reporte por ID:', e);
                return res.status(500).send('Error al generar el reporte Word.');
            }
        });
    });

    router.get('/:id', (req, res) => {
        const { id } = req.params;
        const query = 'SELECT * FROM incidencias WHERE id = ?';

        dbConnection.query(query, [id], (err, results) => {
            if (err) {
                console.error('Error al obtener la incidencia por ID:', err);
                return res.status(500).send('Error al obtener la incidencia.');
            }
            if (results.length === 0) {
                return res.status(404).send('Incidencia no encontrada.');
            }
            res.status(200).json(results[0]);
        });
    });

    router.put('/:id/estado', (req, res) => {
        const { id } = req.params;
        const { estado } = req.body; 

        if (!estado) {
            return res.status(400).send('El campo "estado" es requerido.');
        }

        const allowedStates = ['Pendiente', 'En curso', 'Resuelto'];
        if (!allowedStates.includes(estado)) {
            return res.status(400).send('Estado no válido.');
        }
            
        const getQuery = 'SELECT responsable_id, estado FROM incidencias WHERE id = ?';

        dbConnection.query(getQuery, [id], (err, results) => {
            if (err || results.length === 0) {
                return res.status(404).send('Incidencia no encontrada.');
            }
            const { responsable_id, estado: estadoAnterior } = results[0];

            let updateQuery = 'UPDATE incidencias SET estado = ?, fecha_actualizacion = CURRENT_TIMESTAMP';
            let params = [estado];

            if (estado === 'Resuelto' && estadoAnterior !== 'Resuelto') {
                updateQuery += ', fecha_cierre = CURRENT_TIMESTAMP, tiempo_ciclo_minutos = TIMESTAMPDIFF(MINUTE, fecha_creacion, CURRENT_TIMESTAMP)';
            } else if (estado !== 'Resuelto' && estadoAnterior === 'Resuelto') {
                updateQuery += ', fecha_cierre = NULL, tiempo_ciclo_minutos = 0';
            }

            updateQuery += ' WHERE id = ?';
            params.push(id);
            
            dbConnection.query(updateQuery, params, (err, result) => {
                if (err) {
                    console.error('Error al actualizar el estado de la incidencia:', err);
                    return res.status(500).send('Error al actualizar el estado.');
                }
                
                if (result.affectedRows > 0 && responsable_id && estado !== estadoAnterior) {
                    const mensajeNotif = `El estado de tu incidencia #${id} ha cambiado de '${estadoAnterior}' a '${estado}'.`;
                    sendNotification(dbConnection, responsable_id, id, mensajeNotif);
                }

                res.status(200).json({ message: `Estado de la incidencia ${id} actualizado a ${estado}.` });
            });
        });
    });

    router.delete('/:id', (req, res) => {
        const { id } = req.params;
        const query = 'DELETE FROM incidencias WHERE id = ?';
        dbConnection.query(query, [id], (err, result) => {
            if (err) {
                console.error('Error al eliminar la incidencia:', err);
                return res.status(500).send('Error al eliminar la incidencia.');
            }
            if (result.affectedRows === 0) {
                return res.status(404).send('Incidencia no encontrada.');
            }
            res.status(200).send('Incidencia eliminada con éxito.');
        });
    });

    router.get('/estadisticas/ver', (req, res) => {
        // Consulta 1: Conteo por estado
        const queryEstados = `
            SELECT 
                estado, 
                COUNT(*) AS cantidad 
            FROM incidencias 
            GROUP BY estado;
        `;

        // Consulta 2: Tiempo promedio de ciclo por prioridad (solo para resueltas)
        const queryTiempoPromedio = `
            SELECT 
                prioridad, 
                AVG(tiempo_ciclo_minutos) AS promedio_minutos 
            FROM incidencias 
            WHERE estado = 'Resuelto' AND tiempo_ciclo_minutos > 0
            GROUP BY prioridad;
        `;

        // Consulta 3: Incidencias resueltas por día (últimos 30 días)
        const queryResueltasPorDia = `
            SELECT 
                DATE(fecha_cierre) AS fecha, 
                COUNT(*) AS resueltas 
            FROM incidencias 
            WHERE estado = 'Resuelto' AND fecha_cierre >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE(fecha_cierre)
            ORDER BY fecha;
        `;

        // Consulta 4: Conteo por área
        const queryPorArea = `
            SELECT 
                area, 
                COUNT(*) AS cantidad 
            FROM incidencias 
            GROUP BY area;
        `;

        const queryPorModulo = `
            SELECT 
                modulo, 
                COUNT(*) AS cantidad 
            FROM incidencias 
            GROUP BY modulo;
        `;

        dbConnection.query(queryEstados, (err, resultadosEstados) => {
            if (err) {
                console.error('Error al obtener estadísticas de estados:', err);
                return res.status(500).json({ error: 'Error interno del servidor al obtener estadísticas de estados' });
            }

            dbConnection.query(queryTiempoPromedio, (err, resultadosTiempoPromedio) => {
                if (err) {
                    console.error('Error al obtener estadísticas de tiempo promedio:', err);
                    return res.status(500).json({ error: 'Error interno del servidor al obtener estadísticas de tiempo promedio' });
                }

                dbConnection.query(queryResueltasPorDia, (err, resultadosResueltasPorDia) => {
                    if (err) {
                        console.error('Error al obtener estadísticas de resueltas por día:', err);
                        return res.status(500).json({ error: 'Error interno del servidor al obtener estadísticas de resueltas por día' });
                    }

                    dbConnection.query(queryPorArea, (err, resultadosPorArea) => {
                        if (err) {
                            console.error('Error al obtener estadísticas por área:', err);
                            return res.status(500).json({ error: 'Error interno del servidor al obtener estadísticas por área' });
                        }

                        dbConnection.query(queryPorModulo, (err, resultadosPorModulo) => {
                            if (err) {
                                console.error('Error al obtener estadísticas por módulo:', err);
                                return res.status(500).json({ error: 'Error interno del servidor al obtener estadísticas por módulo' });
                            }

                            res.status(200).json({
                                incidenciasPorEstado: resultadosEstados,
                                tiempoPromedioPorPrioridad: resultadosTiempoPromedio.map(row => ({
                                    ...row,
                                    promedio_horas: row.promedio_minutos ? (row.promedio_minutos / 60).toFixed(2) : 0 // Para convertir minutos a horas
                                })),
                                incidenciasResueltasPorDia: resultadosResueltasPorDia,
                                incidenciasPorArea: resultadosPorArea,
                                incidenciasPorModulo: resultadosPorModulo   
                            });
                        });
                    });
                });
            });
        });
    });
    
    return router;
};