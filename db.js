const mysql = require('mysql');

// Configuración del pool de conexiones
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
    waitForConnections: true, // Esperar cuando no hay conexiones disponibles
    queueLimit: 0 // Número de conexiones en cola (0 para ilimitado)
});

// Ejemplo de consulta usando el pool
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error al conectar al pool:', err);
        return;
    }
    console.log('Conectado al pool de la base de datos');
    connection.release(); // Libera la conexión una vez terminada
});


module.exports = pool;
