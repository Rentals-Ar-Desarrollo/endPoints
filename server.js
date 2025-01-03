require('dotenv').config(); // Carga las variables de entorno desde el archivo .env
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const multer = require('multer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
require('pdfkit-table');
const fs = require('fs');
const cryptoJS = require('crypto-js');
const axios = require('axios');
const { Redirect } = require('twilio/lib/twiml/VoiceResponse');
const { format } = require('date-fns');
const { CONNREFUSED } = require('dns');
const { kill, off } = require('process');
const { CreateBillingUsageRequest } = require('twilio/lib/rest/marketplace/v1/installedAddOn/installedAddOnUsage');
const xl = require('excel4node');
const { getMergedData } = require('./airtable/airtable');
const { getMergedDataExcel } = require('./dataExcel/dataExcel')
const db = require('./db.js')




const app = express();
app.use(express.json());
app.use(cors());

const transporter = nodemailer.createTransport({
    host: 'mail.arrentals.com.mx',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});



function generateToken(user) {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET no está configurado');
    }
    return jwt.sign(
        { id: user.id, name: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '1h' } // El token expirará en 1 hora
    );
}


app.post('/register', async (req, res) => {
    const { name, email, password, curp } = req.body;  // Añadir CURP

    // Validación de campos requeridos
    if (!name || !email || !password || !curp) {
        return res.status(400).send('Nombre, correo electrónico, contraseña y CURP son requeridos');
    }

    try {
        // Encriptar la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Consulta para insertar el usuario en la base de datos
        const query = 'INSERT INTO users (username, email, hashedPassword, curp) VALUES (?, ?, ?, ?)';  // Añadir CURP a la consulta
        db.query(query, [name, email, hashedPassword, curp], (err, results) => {
            if (err) {
                console.error('Error al registrar el usuario:', err);
                return res.status(500).send('Error al registrar el usuario');
            }
            res.status(201).send({ id: results.insertId, name, email, curp });  // Incluir CURP en la respuesta
        });
    } catch (err) {
        console.error('Error al cifrar la contraseña:', err);
        res.status(500).send('Error al cifrar la contraseña');
    }
});


app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('Correo electrónico y contraseña son requeridos');
    }

    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], async (err, results) => {
        if (err) {
            console.error('Error al buscar el usuario:', err);
            return res.status(500).send('Error al buscar el usuario');
        }

        if (results.length === 0) {
            return res.status(401).send('Usuario no encontrado');
        }

        const user = results[0];
        const match = await bcrypt.compare(password, user.hashedPassword);

        if (match) {
            try {
                const token = generateToken(user);


                res.status(200).json({ message: 'Login exitoso, PDF generado y protegido', token });

            } catch (err) {
                console.error('Error al generar el token:', err);
                res.status(500).send('Error al generar el token');
            }
        } else {
            res.status(401).send('Contraseña incorrecta');
        }
    });
});


app.post('/request-password-reset', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).send('Correo electrónico es requerido');
    }

    const checkUserQuery = 'SELECT * FROM users WHERE email = ?';
    db.query(checkUserQuery, [email], (err, results) => {
        if (err) {
            console.error('Error al verificar el correo electrónico:', err);
            return res.status(500).send('Error al verificar el correo electrónico');
        }
        if (results.length === 0) {
            return res.status(404).send('El correo electrónico no está registrado');
        }

        const resetCode = crypto.randomBytes(3).toString('hex'); // Código aleatorio de 6 caracteres
        const insertCodeQuery = 'INSERT INTO password_resets (email, resetCode) VALUES (?, ?)';
        db.query(insertCodeQuery, [email, resetCode], (err, result) => {
            if (err) {
                console.error('Error al almacenar el código de reinicio:', err);
                return res.status(500).send('Error al solicitar el reinicio de contraseña');
            }


            const htmlContent = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                    <div style="background-color: #49a199; color: #ffffff; padding: 10px 20px; text-align: center;">
                        <h1 style="margin: 0;">Reinicio de Contraseña</h1>
                    </div>
                    <div style="padding: 20px; background-color: #f9f9f9;">
                        <p style="margin-bottom: 20px; font-size: 16px;">
                            Hola,
                        </p>
                        <p style="margin-bottom: 20px; font-size: 16px;">
                            Tu código de reinicio de contraseña es: 
                            <span style="font-size: 20px; font-weight: bold; color: #49a199;">${resetCode}</span>
                        </p>
                        <p style="margin-top: 20px; font-size: 14px; color: #777;">
                            Este es un envío automatizado. <strong>No responder</strong> a este correo.
                        </p>
                    </div>
                    <div style="background-color: #eeeeee; text-align: center; padding: 10px;">
                        <p style="margin: 0; font-size: 12px; color: #777;">
                            &copy; 2024 ARRentals. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            `;

            // Enviar correo con contenido HTML
            transporter.sendMail({
                from: `"ARRentals Soporte" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Código de reinicio de contraseña',
                html: htmlContent
            }, (err, info) => {
                if (err) {
                    console.error('Error al enviar el correo de reinicio:', err);
                    return res.status(500).send('Error al enviar el correo de reinicio');
                }
                res.status(200).send('Código de reinicio enviado a tu correo electrónico');
            });
        });
    });
});

app.post('/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
        return res.status(400).send('Correo electrónico, código de verificación y nueva contraseña son requeridos');
    }

    try {

        const query = 'SELECT * FROM password_resets WHERE email = ? AND resetCode = ?';
        db.query(query, [email, code], async (err, results) => {
            if (err) {
                console.error('Error al verificar el código de reinicio:', err);
                return res.status(500).send('Error al verificar el código de reinicio');
            }

            if (results.length === 0) {
                return res.status(400).send('Código de verificación inválido');
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);

            const updateQuery = 'UPDATE users SET hashedPassword = ? WHERE email = ?';
            db.query(updateQuery, [hashedPassword, email], (err, results) => {
                if (err) {
                    console.error('Error al actualizar la contraseña:', err);
                    return res.status(500).send('Error al actualizar la contraseña');
                }

                // Eliminar el código de reinicio después de usarlo
                const deleteQuery = 'DELETE FROM password_resets WHERE email = ? AND resetCode = ?';
                db.query(deleteQuery, [email, code], (err, results) => {
                    if (err) {
                        console.error('Error al eliminar el código de reinicio:', err);
                        return res.status(500).send('Error al eliminar el código de reinicio');
                    }

                    res.status(200).send('Contraseña actualizada exitosamente');
                });
            });
        });
    } catch (err) {
        console.error('Error al procesar la solicitud de restablecimiento de contraseña:', err);
        res.status(500).send('Error al procesar la solicitud de restablecimiento de contraseña');
    }
});




app.get('/data', async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: "Se requieren los parámetros 'startDate' y 'endDate'." });
    }

    try {
        const data = await getMergedData(startDate, endDate);
        const { generateBitacora } = require('./generatePdf/generatePdf');
        const filePath = await generateBitacora(data, startDate, endDate);

        res.status(200).json({
            message: 'Datos obtenidos correctamente.',
            filePath: filePath
        });
    } catch (error) {
        console.error('Error al obtener datos:', error.message);
        res.status(500).json({ message: 'Error al obtener datos desde Airtable.', error });
    }
});





app.get('/dataExcel', async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: "Se requieren los parámetros 'startDate' y 'endDate'." });
    }

    try {
        const data = await getMergedDataExcel(startDate, endDate);
        const { generateExcelFile } = require('./excel/reportePagos')
        const filePath = await generateExcelFile(data, startDate, endDate)
        res.status(200).json({
            message: 'Datos obtenidos correctamente.',
            filePath: filePath
        });
    } catch (error) {
        console.error('Error al obtener datos:', error.message);
        res.status(500).json({ message: 'Error al obtener datos desde Airtable.', error });
    }
});




// const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => {
//     console.log(`Servidor escuchando en el puerto ${PORT}`);
// });