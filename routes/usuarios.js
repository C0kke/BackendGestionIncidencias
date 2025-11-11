const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const upload = require('../services/storageService');

module.exports = (dbConnection) => {

    router.post('/', upload.any(), async (req, res) => {
        const { nombre, email, password, rol } = req.body;
        const file = req.files && req.files.length > 0 ? req.files[0] : null;
        const foto_perfil_url = file?.path || null;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const query = 'INSERT INTO usuarios (nombre, email, password, rol, foto_perfil) VALUES (?, ?, ?, ?, ?)';
        dbConnection.query(query, [nombre, email, hashedPassword, rol, foto_perfil_url], (err, result) => {                   
            if (err) {                
                console.error('Error al registrar el usuario:', err);                
                if (err.code === 'ER_DUP_ENTRY') {                    
                    return res.status(409).send('El email ya está registrado.');                
                }                
                return res.status(500).send('Error al registrar el usuario.');            
            }
            res.status(201).json({ message: 'Usuario registrado con éxito.', id: result.insertId });
            });
    });

    router.post('/login', (req, res) => {        
        const { email, password } = req.body;
        const query = 'SELECT * FROM usuarios WHERE email = ?';
        dbConnection.query(query, [email], async (err, results) => {
            if (err) {
                return res.status(500).send('Error en el servidor.');
            }
            if (results.length === 0) {
                return res.status(400).send('Email o contraseña incorrectos.');
            }
            const user = results[0];
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).send('Email o contraseña incorrectos.');
            }
            const userWithoutPassword = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, foto_perfil: user.foto_perfil };
            res.status(200).json({ message: 'Login exitoso.', user: userWithoutPassword });         
        });    
    });

    router.get('/', (req, res) => {
        const query = 'SELECT id, nombre, email, rol, estado, foto_perfil FROM usuarios';
        dbConnection.query(query, (err, results) => {
            if (err) {
                console.error('Error al obtener los usuarios:', err);
                return res.status(500).send('Error al obtener los usuarios.');
            }
            res.status(200).json(results);
        });
    });

    router.get('/:id', (req, res) => {
        const { id } = req.params;
        const query = 'SELECT id, nombre, email, rol, estado, foto_perfil FROM usuarios WHERE id = ?'; 
        
        dbConnection.query(query, [id], (err, results) => {
            if (err) {
                console.error('Error al obtener el usuario por ID:', err);
                return res.status(500).send('Error al obtener el usuario.');
            }
            if (results.length === 0) {
                return res.status(404).json({ message: 'Usuario no encontrado.' });
            }
            res.status(200).json(results[0]);
        });
    });

    router.put('/:id', upload.any(), async (req, res) => {
        const { id } = req.params;
        let { nombre, email, password, rol } = req.body;

        const file = req.files && req.files.length > 0 ? req.files[0] : null;
        const foto_perfil_url = file?.path || null;

        let query, values;

        try {
            if (!password || password.trim() === "") {
                if (foto_perfil_url) {
                    query = 'UPDATE usuarios SET nombre = ?, email = ?, rol = ?, foto_perfil = ? WHERE id = ?';
                    values = [nombre, email, rol, foto_perfil_url, id];
                } else {
                    query = 'UPDATE usuarios SET nombre = ?, email = ?, rol = ? WHERE id = ?';
                    values = [nombre, email, rol, id];
                }
            } else {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);

                if (foto_perfil_url) {
                    query = 'UPDATE usuarios SET nombre = ?, email = ?, password = ?, rol = ?, foto_perfil = ? WHERE id = ?';
                    values = [nombre, email, hashedPassword, rol, foto_perfil_url, id];
                } else {
                    query = 'UPDATE usuarios SET nombre = ?, email = ?, password = ?, rol = ? WHERE id = ?';
                    values = [nombre, email, hashedPassword, rol, id];
                }
            }

            dbConnection.query(query, values, (err, result) => {
                if (err) {
                    console.error('Error al actualizar el usuario:', err);
                    return res.status(500).send('Error al actualizar el usuario.');
                }
                if (result.affectedRows === 0) {
                    return res.status(404).send('Usuario no encontrado.');
                }
                res.status(200).json({ message: 'Usuario actualizado con éxito.', foto_perfil: foto_perfil_url });
            });

        } catch (error) {
            console.error('Error interno:', error);
            return res.status(500).send('Error interno del servidor.');
        }
    });

    router.put('/activar/:id', (req, res) => {
        const { id } = req.params;
        const query = "UPDATE usuarios SET estado = 'activo' WHERE id = ?";
        dbConnection.query(query, [id], (err, result) => {
            if (err) {
                console.error('Error al activar el usuario:', err);
                return res.status(500).send('Error al activar el usuario.');
            }
            if (result.affectedRows === 0) {
                return res.status(404).send('Usuario no encontrado.');
            }
            res.status(200).send('Usuario activado.');
        });
    });

    router.put('/desactivar/:id', (req, res) => {
        const { id } = req.params;
        const query = "UPDATE usuarios SET estado = 'inactivo' WHERE id = ?";
        dbConnection.query(query, [id], (err, result) => {
            if (err) {
                console.error('Error al desactivar el usuario:', err);
                return res.status(500).send('Error al desactivar el usuario.');
            }
            if (result.affectedRows === 0) {
                return res.status(404).send('Usuario no encontrado.');
            }
            res.status(200).send('Usuario desactivado con éxito.');
        });
    });

    return router;
};