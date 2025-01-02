require('dotenv').config();
const PDFDocument = require('pdfkit');
require('pdfkit-table');
const fs = require('fs');
const _ = require('lodash')
const nodemailer = require('nodemailer');
const path = require('path');


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

function restarHoras(horaInicio, horaFin) {


    const [h1, m1] = horaInicio.split(':').map(Number);
    const [h2, m2] = horaFin.split(':').map(Number);

    const inicioEnMinutos = h1 * 60 + m1;
    let finEnMinutos = h2 * 60 + m2;

    if (finEnMinutos < inicioEnMinutos) {
        finEnMinutos += 24 * 60;
    }

    const diferenciaMinutos = finEnMinutos - inicioEnMinutos;
    const horas = Math.floor(diferenciaMinutos / 60);
    const minutos = diferenciaMinutos % 60;

    if (horas > 0) {
        return `${horas} hrs ${minutos} min`;
    }
    return `${minutos} min`;
}


function calcularDiferenciaKm(kmInicial, kmFinal) {

    if (!kmInicial || !kmFinal) {
        return "Error: falta kilometraje inicial o final";
    }
    const kmInicialNum = parseFloat(kmInicial.replace(/,/g, '').replace(' Km.', ''), 10);
    const kmFinalNum = parseFloat(kmFinal.replace(/,/g, '').replace(' Km.', ''), 10);
    const diferenciaKm = kmFinalNum - kmInicialNum;
    if (diferenciaKm < 0) {
        return "Error";
    }

    return `${diferenciaKm} Km`;
}

const generateBitacora = async (data, startDate, endDate) => {
    try {
        const dirPath = path.join(__dirname, '../bitacoras');

        // Crear la carpeta si no existe
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        const fileName = `bitacora-de-${startDate}-al-${endDate}.pdf`;
        const filePath = path.join(dirPath, fileName);

        const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', autoFirstPage: false });
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);
        let folioCounter = 1;
        const addHeaderFooter = (folio) => {


            const imagePath = path.join(__dirname, '../Imagen1-removebg-preview.png')
            const imgFooterPath = path.join(__dirname, '../FOOTER-removebg-preview.png')


            if (imagePath) {
                doc.image(imagePath, 20, 25, { fit: [120, 120] });
            }
            if (imgFooterPath) {
                doc.image(imgFooterPath, 0, 500, { fit: [1300, 100] });
            }
            doc.fontSize(9)
                .fillColor('red')
                .text(`Folio: ${folio}`, 655, 60, { width: 250 });
            doc.fillColor('black');
        };
        for (const [operatorName, projects] of Object.entries(data)) {
            for (const [projectName, departments] of Object.entries(projects)) {
                for (const [departmentName, records] of Object.entries(departments)) {
                    if (records && records.length > 0) {
                        doc.addPage();
                        addHeaderFooter(folioCounter++);
                        let horaIncioGlobal;
                        let horaFinGlobal;
                        let kmIncialGlobal;
                        let kmFinalGlobal;
                        _.filter(records, (record) => _.trim(record.tipoReporte) === 'Inicio de llamado' || _.trim(record.tipoReporte) === 'Termino de llamado')
                            .forEach(record => {
                                const tipoReporte = record.tipoReporte;
                                doc.rect(20, 15, 750, 80)
                                    .strokeColor('black')
                                    .lineWidth(1.5)
                                    .stroke();
                                doc.rect(20, 15, 750, 80)
                                    .strokeColor('black')
                                    .lineWidth(1.5)
                                    .stroke();
                                doc.fontSize(9);
                                doc.roundedRect(450, 22, 220, 18, 4)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('CASA PRODUCTORA: ', 280, 28, { align: 'center' }); // Título
                                doc.fontSize(7)
                                    .text(record.productora, 548, 28)
                                    .stroke();
                                // CASA PROYECTO
                                doc.roundedRect(450, 45, 200, 18, 4)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('PROYECTO:', 230, 50, { align: 'center', fontSize: 8 })
                                    .stroke();
                                doc.fontSize(7)
                                    .text(record.proyecto, 500, 50)
                                    .stroke();
                                // DEPARTAMENTO
                                doc.roundedRect(450, 68, 200, 18, 4)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('DEPARTAMENTO: ', 250, 73, { align: 'center', fontSize: 8 })
                                    .stroke(); // Dibuja solo el borde sin relleno
                                doc.fontSize(7)
                                    .text(record.departamento, 520, 73)
                                    .stroke();
                                doc.roundedRect(150, 22, 280, 30, 4)
                                    .fillColor('#004f53')
                                    .strokeColor('#004f53')
                                    .lineWidth(1)
                                    .fillAndStroke();
                                doc.fillColor('white').fontSize(14).text('DEPARTAMENTO ADMINISTRATIVO', 165, 33, { align: 'center', width: 250 });
                                doc.moveDown();
                                doc.roundedRect(150, 58, 280, 30, 4)
                                    .fillColor('#35dbad')
                                    .strokeColor('#35dbad')
                                    .lineWidth(1)
                                    .fillAndStroke();
                                doc.fillColor('#004f53').fontSize(14).text('Bitácora de llamados', 165, 70, { align: 'center', width: 250 });
                                doc.moveDown();

                                doc.fillColor("black")
                                doc.fontSize(9);
                                doc.roundedRect(20, 100, 80, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(100, 100, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('FECHA', 100, 115, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(150, 100, 150, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('HORARIOS Y KILOMETRAJE', 95, 115, { align: "center", width: 250 })
                                    .stroke();
                                doc.roundedRect(300, 100, 80, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('COMBUSTIBLE', 213, 115, { align: "center", width: 250 })
                                    .stroke();
                                doc.roundedRect(380, 100, 290, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('DESARROLLO DE ACTIVIDAD', 370, 115, { align: "center", width: 250 })
                                    .stroke();
                                doc.roundedRect(670, 100, 100, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('OBSERVACIONES', 590, 115, { align: "center", width: 250 })
                                    .stroke();


                                const daysCoordinates = {
                                    'lunes': { kmDifePrint: { x: 252, y: 170 }, horaDiferienciaD: { x: 251, y: 150 }, fecha: { x: 100, y: 161 }, tipoUnidad: { x: 30, y: 150 }, placas: { x: 12, y: 162 }, horaInicio: { x: 130, y: 150 }, horaFinal: { x: 205, y: 150 }, kmInicial: { x: 125, y: 170 }, kmFinal: { x: 175, y: 170 }, kmTotal: { x: 225, y: 170 }, comentarioInicio: { x: 385, y: 145 }, comentarioFin: { x: 465, y: 145 }, img: { x: 305, y: 140 } },
                                    'martes': { kmDifePrint: { x: 252, y: 213 }, horaDiferienciaD: { x: 251, y: 190 }, fecha: { x: 100, y: 201 }, tipoUnidad: { x: 30, y: 190 }, placas: { x: 12, y: 205 }, horaInicio: { x: 130, y: 190 }, horaFinal: { x: 205, y: 190 }, kmInicial: { x: 125, y: 213 }, kmFinal: { x: 175, y: 213 }, kmTotal: { x: 225, y: 210 }, comentarioInicio: { x: 385, y: 185 }, comentarioFin: { x: 465, y: 185 }, img: { x: 305, y: 180 } },
                                    'miércoles': { kmDifePrint: { x: 252, y: 250 }, horaDiferienciaD: { x: 251, y: 230 }, fecha: { x: 100, y: 241 }, tipoUnidad: { x: 30, y: 230 }, placas: { x: 12, y: 245 }, horaInicio: { x: 130, y: 230 }, horaFinal: { x: 205, y: 230 }, kmInicial: { x: 125, y: 250 }, kmFinal: { x: 175, y: 250 }, kmTotal: { x: 225, y: 250 }, comentarioInicio: { x: 385, y: 225 }, comentarioFin: { x: 465, y: 225 }, img: { x: 305, y: 220 } },
                                    'jueves': { kmDifePrint: { x: 252, y: 290 }, horaDiferienciaD: { x: 251, y: 270 }, fecha: { x: 100, y: 281 }, tipoUnidad: { x: 30, y: 270 }, placas: { x: 12, y: 285 }, horaInicio: { x: 130, y: 270 }, horaFinal: { x: 205, y: 270 }, kmInicial: { x: 125, y: 290 }, kmFinal: { x: 175, y: 290 }, kmTotal: { x: 225, y: 290 }, comentarioInicio: { x: 385, y: 265 }, comentarioFin: { x: 465, y: 265 }, img: { x: 305, y: 260 } },
                                    'viernes': { kmDifePrint: { x: 252, y: 330 }, horaDiferienciaD: { x: 251, y: 310 }, fecha: { x: 100, y: 321 }, tipoUnidad: { x: 30, y: 310 }, placas: { x: 12, y: 325 }, horaInicio: { x: 130, y: 310 }, horaFinal: { x: 205, y: 310 }, kmInicial: { x: 125, y: 330 }, kmFinal: { x: 175, y: 330 }, kmTotal: { x: 225, y: 330 }, comentarioInicio: { x: 385, y: 305 }, comentarioFin: { x: 465, y: 305 }, img: { x: 305, y: 300 } },
                                    'sábado': { kmDifePrint: { x: 252, y: 370 }, horaDiferienciaD: { x: 251, y: 350 }, fecha: { x: 100, y: 361 }, tipoUnidad: { x: 30, y: 350 }, placas: { x: 12, y: 365 }, horaInicio: { x: 130, y: 350 }, horaFinal: { x: 205, y: 350 }, kmInicial: { x: 125, y: 370 }, kmFinal: { x: 175, y: 370 }, kmTotal: { x: 225, y: 370 }, comentarioInicio: { x: 385, y: 345 }, comentarioFin: { x: 465, y: 345 }, img: { x: 305, y: 340 } },
                                    'domingo': { kmDifePrint: { x: 252, y: 410 }, horaDiferienciaD: { x: 251, y: 390 }, fecha: { x: 100, y: 401 }, tipoUnidad: { x: 30, y: 390 }, placas: { x: 12, y: 405 }, horaInicio: { x: 130, y: 390 }, horaFinal: { x: 205, y: 390 }, kmInicial: { x: 125, y: 410 }, kmFinal: { x: 175, y: 410 }, kmTotal: { x: 225, y: 410 }, comentarioInicio: { x: 385, y: 385 }, comentarioFin: { x: 465, y: 385 }, img: { x: 305, y: 380 } }
                                };
                                //const imgPath = 'C:/Users/desar/OneDrive/Documentos/proyecto/proyecto/clientes-server/nivel_ar.JPEG';
                                const imgPath = path.join(__dirname, '../nivel_ar.JPEG')

                                const fuelLevels = {
                                    'E': { color: '#ff3333', dx: -26, dy: -10 },
                                    '1/4': { color: '#ff7733', dx: -17, dy: -20 },
                                    '1/2': { color: '#ffa233', dx: 0, dy: -25 },
                                    '3/4': { color: '#cede8e', dx: 16, dy: -20 },
                                    'F': { color: '#62d655', dx: 26, dy: -9 }
                                };
                                doc.fillColor('black')
                                if (daysCoordinates[record.diaDeLaSemana]) {
                                    const coords = daysCoordinates[record.diaDeLaSemana];

                                    let adjustedHoraFinalCoords = { x: coords.horaFinal.x, y: coords.horaFinal.y };
                                    let adjustedKmFinalCoords = { x: coords.kmFinal.x, y: coords.kmFinal.y };

                                    if (record.horaCreacionTermino) {
                                        const horaPartes = record.horaCreacionTermino.split(':');
                                        const hora = parseInt(horaPartes[0]);
                                        if (hora >= 0 && hora < 12) {
                                            adjustedHoraFinalCoords = { x: coords.horaFinal.x, y: coords.horaFinal.y - 40 };
                                            adjustedKmFinalCoords = { x: coords.kmFinal.x, y: coords.kmFinal.y - 40 };
                                        }
                                    }

                                    if (record.horaCreacion) {
                                        horaIncioGlobal = record.horaCreacion
                                        doc.fontSize(7).text(record.horaCreacion, coords.horaInicio.x, coords.horaInicio.y, {
                                            align: 'center',
                                            width: 100
                                        });
                                    }
                                    if (record.horaCreacionTermino) {
                                        horaFinGlobal = record.horaCreacionTermino
                                        doc.fontSize(7).text(record.horaCreacionTermino, adjustedHoraFinalCoords.x, adjustedHoraFinalCoords.y, {
                                            align: 'left',
                                            width: 100
                                        });
                                    }

                                    if (record.kilometrajeInicial) {
                                        kmIncialGlobal = record.kilometrajeInicial
                                        doc.fontSize(7).text(record.kilometrajeInicial, coords.kmInicial.x, coords.kmInicial.y, {
                                            align: 'center',
                                            width: 100
                                        });
                                    }

                                    if (record.kilometrajeFinal) {
                                        kmFinalGlobal = record.kilometrajeFinal
                                        doc.fontSize(7).text(record.kilometrajeFinal, adjustedKmFinalCoords.x, adjustedKmFinalCoords.y, {
                                            align: 'center',
                                            width: 100
                                        });
                                    }




                                    //var color = colors[Math.floor(Math.random() * colors.length)];
                                    if (kmIncialGlobal && kmFinalGlobal) {

                                        const kmDiferiencia = calcularDiferenciaKm(kmIncialGlobal, kmFinalGlobal)
                                        doc.fontSize(7).text(kmDiferiencia, coords.kmDifePrint.x, coords.kmDifePrint.y, { align: 'left', width: 150 });
                                        kmIncialGlobal = null
                                        kmFinalGlobal = null
                                    }



                                    if (horaIncioGlobal && horaFinGlobal) {
                                        const horaDiferiencia = restarHoras(horaIncioGlobal, horaFinGlobal)
                                        doc.fontSize(7).text(horaDiferiencia, coords.horaDiferienciaD.x, coords.horaDiferienciaD.y, { align: 'left', width: 150 });
                                        horaIncioGlobal = null
                                        horaFinGlobal = null
                                    }



                                    // let colors = ['#004f53', '#35dbad', '#ff3333', '#ff7733', '#ffa233', '#cede8e', '#62d655'];
                                    // var color = colors[Math.floor(Math.random() * colors.length)];

                                    doc.image(imgPath, coords.img.x, coords.img.y, { fit: [70, 70], align: 'left', valign: 'top' });
                                    doc.fillColor('black')
                                        .fontSize(7)
                                        //.roundedRect(coords.tipoUnidad.x, coords.tipoUnidad.y, 80, 40)
                                        .strokeColor('black')
                                        .lineWidth(1)
                                        .fontSize(record.horaCreacion > 10 ? 6 : 9);
                                    doc.fontSize(7).text(record.fechaCreacion, coords.fecha.x, coords.fecha.y, { align: 'center', width: 50 })
                                        .text(record.tipoUnidad, coords.tipoUnidad.x, coords.tipoUnidad.y, { align: 'center', width: 50 })
                                        .text(record.placas, coords.placas.x, coords.placas.y, { align: 'center', width: 100 })
                                        .fontSize(7)
                                        .text(record.comentarioInicio, coords.comentarioInicio.x, coords.comentarioInicio.y, { align: 'left', width: 80 })
                                        .text(record.comentarioFin, coords.comentarioFin.x, coords.comentarioFin.y, { align: 'left', width: 190 })
                                        .stroke();

                                    if (fuelLevels[record.nivelCombustible]) {
                                        const fuel = fuelLevels[record.nivelCombustible];
                                        const centerX = coords.img.x + 35;
                                        const centerY = coords.img.y + 35;
                                        doc.circle(centerX + fuel.dx, centerY + fuel.dy, 5)
                                            .fillColor(fuel.color)
                                            .fill();
                                    }
                                    doc.fillColor('black')
                                }


                                doc.roundedRect(20, 140, 80, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();
                                doc.roundedRect(100, 140, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .fontSize(8)
                                    .text('LUNES', 100, 141, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(100, 140, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();
                                //HRINICIAL_LUNES
                                doc.roundedRect(150, 140, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();
                                doc.roundedRect(150, 140, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('HR. INICIAL', 150, 141, { align: "center", width: 50 })
                                    .stroke();
                                //HRFINAL_LUNES
                                doc.roundedRect(200, 140, 50, 8)
                                    .strokeColor('black')
                                    .stroke();
                                doc.roundedRect(200, 140, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('HR. FINAL', 200, 141, { align: "center", width: 50 })
                                    .stroke();
                                //TOTAL_LUNES
                                doc.roundedRect(250, 140, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();
                                doc.roundedRect(250, 140, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('TOTAL', 250, 141, { align: "center", width: 50 })
                                    .stroke();
                                //KM_INCIAL_LUNES
                                doc.roundedRect(150, 160, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('KM. INICIAL', 150, 161, { align: "center", width: 50 })
                                    .stroke();
                                //KM_FINAL_LUNES
                                doc.roundedRect(200, 160, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('KM. FINAL', 200, 161, { align: "center", width: 50 })
                                    .stroke();
                                //KM_FINAL_TOTAL_LUNES
                                doc.roundedRect(250, 160, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('TOTAL', 250, 161, { align: "center", width: 50 })
                                    .stroke();
                                //COMBUISTIBLE
                                doc.roundedRect(300, 140, 80, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();
                                //DESARROLLO DE ACTIVIDAD
                                doc.roundedRect(380, 140, 290, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();
                                //OBSERVACIONES
                                doc.roundedRect(670, 140, 100, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();

                                // /*AQUI COMIENZA EL DIA MARTES OJO*/
                                // //MARTES
                                doc.roundedRect(20, 180, 80, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(100, 180, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('MARTES', 100, 181, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(100, 180, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                //HRINICIAL_MARTES
                                doc.roundedRect(150, 180, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(150, 180, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('HR. INICIAL', 150, 181, { align: "center", width: 50 })
                                    .stroke();
                                //HRFINAL_MARTES
                                doc.roundedRect(200, 180, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();
                                doc.roundedRect(200, 180, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('HR. FINAL', 200, 181, { align: "center", width: 50 })
                                    .stroke();
                                //TOTAL_MARTES
                                doc.roundedRect(250, 180, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(250, 180, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('TOTAL', 250, 181, { align: "center", width: 50 })
                                    .stroke();
                                //KM_INCIAL_MARTES
                                doc.roundedRect(150, 200, 50, 10)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('KM. INICIAL', 150, 201, { align: "center", width: 50 })
                                    .stroke();
                                //KM_FINAL_MARTES
                                doc.roundedRect(200, 200, 50, 10)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('KM. FINAL', 200, 201, { align: "center", width: 50 })
                                    .stroke();
                                //KM_FINAL_TOTAL_MARTES
                                doc.roundedRect(250, 200, 50, 10)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('TOTAL', 250, 201, { align: "center", width: 50 })
                                    .stroke();
                                //COMBUISTIBLE_MARTES
                                doc.roundedRect(300, 180, 80, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();
                                //DESARROLLO DE ACTIVIDAD
                                doc.roundedRect(380, 180, 290, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();
                                //OBSERVACIONES
                                doc.roundedRect(670, 180, 100, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();




                                // /* AQUI COMIENZA AREA NUEVA MIERCOLES OJO*/
                                // //MIERCOLES
                                doc.roundedRect(20, 220, 80, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(100, 220, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('MIERCOLES', 100, 221, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(100, 220, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                //HRINICIAL_MIERCOLES
                                doc.roundedRect(150, 220, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('HR. INICIAL', 150, 221, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(150, 220, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                //HRFINAL_MIERCOLES
                                doc.roundedRect(200, 220, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('HR. FINAL', 200, 221, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(200, 220, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                //TOTAL_MIERCOLES
                                doc.roundedRect(250, 220, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('TOTAL', 250, 221, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(250, 220, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                //KM_INCIAL_MIERCOLES
                                doc.roundedRect(150, 240, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('KM. INICIAL', 150, 241, { align: "center", width: 50 })
                                    .stroke();
                                //KM_FINAL_MIERCOLES
                                doc.roundedRect(200, 240, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('KM. FINAL', 200, 241, { align: "center", width: 50 })
                                    .stroke();
                                //KM_FINAL_TOTAL_MIERCOLES
                                doc.roundedRect(250, 240, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('TOTAL', 250, 241, { align: "center", width: 50 })
                                    .stroke();
                                //COMBUISTIBLE_MIERCOLES
                                doc.roundedRect(300, 220, 80, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                //DESARROLLO DE ACTIVIDAD
                                doc.roundedRect(380, 220, 290, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();
                                //OBSERVACIONES
                                doc.roundedRect(670, 220, 100, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();

                                // /* AQUI COMIENZA UNA NUEVA AREA JUEVES OJO*/
                                // //JUEVES
                                doc.roundedRect(20, 260, 80, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(100, 260, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('JUEVES', 100, 261, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(100, 260, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                // //HRINICIAL_JUEVES
                                doc.roundedRect(150, 260, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('HR. INICIAL', 150, 261, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(150, 260, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                //HRFINAL_JUEVES
                                doc.roundedRect(200, 260, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(200, 260, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('HR. FINAL', 200, 261, { align: "center", width: 50 })
                                    .stroke();
                                //TOTAL_JUEVES
                                doc.roundedRect(250, 260, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(250, 260, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('TOTAL', 250, 261, { align: "center", width: 50 })
                                    .stroke();
                                //KM_INCIAL_JUEVES
                                doc.roundedRect(150, 280, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('KM. INICIAL', 150, 281, { align: "center", width: 50 })
                                    .stroke();
                                //KM_FINAL_JUEVES
                                doc.roundedRect(200, 280, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('KM. FINAL', 200, 281, { align: "center", width: 50 })
                                    .stroke();
                                //KM_FINAL_TOTAL_JUEVES
                                doc.roundedRect(250, 280, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('TOTAL', 250, 281, { align: "center", width: 50 })
                                    .stroke();
                                //COMBUISTIBLE_JUEVES
                                doc.roundedRect(300, 260, 80, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                //DESARROLLO DE ACTIVIDAD
                                doc.roundedRect(380, 260, 290, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();
                                //OBSERVACIONES
                                doc.roundedRect(670, 260, 100, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();

                                // /*AQUI COMIENZA UNA NUEVA AREA VIERNES OJO*/
                                // //VIERNES
                                doc.roundedRect(20, 300, 80, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(100, 300, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('VIERNES', 100, 301, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(100, 300, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                //HRINICIAL_VIERNES
                                doc.roundedRect(150, 300, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(150, 300, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('HR. INICIAL', 150, 301, { align: "center", width: 50 })
                                    .stroke();
                                //HRFINAL_VIERNES
                                doc.roundedRect(200, 300, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(200, 300, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('HR. FINAL', 200, 301, { align: "center", width: 50 })
                                    .stroke();
                                //TOTAL_VIERNES
                                doc.roundedRect(250, 300, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(250, 300, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('TOTAL', 250, 301, { align: "center", width: 50 })
                                    .stroke();
                                //KM_INCIAL_VIERNES
                                doc.roundedRect(150, 320, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('KM. INICIAL', 150, 321, { align: "center", width: 50 })
                                    .stroke();
                                //KM_FINAL_VIERNES
                                doc.roundedRect(200, 320, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('KM. FINAL', 200, 321, { align: "center", width: 50 })
                                    .stroke();
                                //KM_FINAL_TOTAL_VIERNES
                                doc.roundedRect(250, 320, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('TOTAL', 250, 321, { align: "center", width: 50 })
                                    .stroke();
                                //COMBUISTIBLE_VIERNES
                                doc.roundedRect(300, 300, 80, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                //DESARROLLO DE ACTIVIDAD
                                doc.roundedRect(380, 300, 290, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();
                                //OBSERVACIONES
                                doc.roundedRect(670, 300, 100, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)

                                    .stroke();

                                // /* AQUI COMIENZA UNA NUEVA AREA SABADO OJO*/
                                // //SABADO    
                                doc.roundedRect(20, 340, 80, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(100, 340, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('SABADO', 100, 341, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(100, 340, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                //HRINICIAL_VIERNES
                                doc.roundedRect(150, 340, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(150, 340, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('HR. INICIAL', 150, 341, { align: "center", width: 50 })
                                    .stroke();
                                //HRFINAL_SABADO
                                doc.roundedRect(200, 340, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(200, 340, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('HR. FINAL', 200, 341, { align: "center", width: 50 })
                                    .stroke();
                                //TOTAL_SABADO
                                doc.roundedRect(250, 340, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(250, 340, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('TOTAL', 250, 341, { align: "center", width: 50 })
                                    .stroke();
                                //KM_INCIAL_SABADO
                                doc.roundedRect(150, 360, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('KM. INICIAL', 150, 361, { align: "center", width: 50 })
                                    .stroke();
                                //KM_FINAL_SABADO
                                doc.roundedRect(200, 360, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('KM. FINAL', 200, 361, { align: "center", width: 50 })
                                    .stroke();
                                //KM_FINAL_TOTAL_SABADO
                                doc.roundedRect(250, 360, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('TOTAL    ', 250, 361, { align: "center", width: 50 })
                                    .stroke();
                                //COMBUISTIBLE_SABADO
                                doc.roundedRect(300, 340, 80, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('TOTAL', 300, 341, { align: "center", width: 50 })
                                    .stroke();
                                //DESARROLLO DE ACTIVIDAD
                                doc.roundedRect(380, 340, 290, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();
                                //OBSERVACIONES
                                doc.roundedRect(670, 340, 100, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();

                                // /* AQUI COMIENZA UNA NUEVA AREA DOMINGO OJO*/
                                // //DOMINGO    

                                doc.roundedRect(20, 380, 80, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(100, 380, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('DOMINGO', 100, 381, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(100, 380, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                //HRINICIAL_DOMINGO
                                doc.roundedRect(150, 380, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(150, 380, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('HR. INICIAL', 150, 381, { align: "center", width: 50 })
                                    .stroke();
                                //HRFINAL_SABADO
                                doc.roundedRect(200, 380, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(200, 380, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('HR. INICIAL', 200, 381, { align: "center", width: 50 })
                                    .stroke();
                                //TOTAL_SABADO
                                doc.roundedRect(250, 380, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                doc.roundedRect(250, 380, 50, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('TOTAL', 250, 381, { align: "center", width: 50 })
                                    .stroke();
                                //KM_INCIAL_SABADO
                                doc.roundedRect(150, 400, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('KM. INICIAL', 150, 401, { align: "center", width: 50 })
                                    .stroke();
                                //KM_FINAL_SABADO
                                doc.roundedRect(200, 400, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('KM. FINAL', 200, 401, { align: "center", width: 50 })
                                    .stroke();
                                //KM_FINAL_TOTAL_SABADO
                                doc.roundedRect(250, 400, 50, 8)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('TOTAL', 250, 401, { align: "center", width: 50 })
                                    .stroke();
                                //COMBUISTIBLE_SABADO
                                doc.roundedRect(300, 380, 80, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    //.text('VEHICULO Y PLACA', 35, 113, { align: "center", width: 50 })
                                    .stroke();
                                //DESARROLLO DE ACTIVIDAD
                                doc.roundedRect(380, 380, 290, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();
                                //OBSERVACIONES
                                doc.roundedRect(670, 380, 100, 40)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();

                                // APARTADO DE FIRMAS
                                doc.roundedRect(20, 420, 360, 10)
                                    .fillColor('#D3D3D3')
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .fillAndStroke();
                                doc.fillColor('black')
                                    .fontSize(8)
                                    .text('PRODUCCIÓN O DEPARTAMENTO', 45, 422, { align: "center", width: 250 });
                                doc.roundedRect(20, 430, 360, 60)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();
                                doc.fillColor('black')
                                    .fontSize(8)
                                    .text('NOMBRE Y FIRMA', 55, 480, { align: "center", width: 200 });



                                //FIRMA NOMBRE Y FIRMA CONDUCTOR
                                doc.roundedRect(380, 420, 200, 10)
                                    .fillColor('#D3D3D3')
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .fillAndStroke();
                                doc.fillColor('black')
                                    .fontSize(8)
                                    .text('CONDUCTOR', 360, 422, { align: "center", width: 250 });
                                doc.roundedRect(380, 430, 200, 60)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();
                                doc.fillColor('black')
                                    .fontSize(8)
                                    .text('NOMBRE Y FIRMA', 360, 480, { align: "center", width: 180 })
                                    .text(record.operador, 390, 440, { align: "center", width: 150 });

                                //FIRMA NOMBRE Y FIRMA CONDUCTOR
                                doc.roundedRect(580, 420, 190, 10)
                                    .fillColor('#D3D3D3')
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .fillAndStroke();
                                doc.fillColor('black')
                                    .fontSize(8)
                                    .text('TOTALES', 550, 422, { align: "center", width: 250 });
                                doc.roundedRect(580, 430, 190, 60)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .stroke();

                                //OTROS_APARTADOS 
                                doc.roundedRect(580, 430, 100, 20)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('LLAMADOS', 580, 438, { align: "center", width: 50 })
                                    .stroke();

                                doc.roundedRect(580, 450, 100, 20)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('FORANEOS', 580, 458, { align: "center", width: 50 })
                                    .stroke();

                                doc.roundedRect(580, 470, 100, 20)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('ARRASTRES', 582, 478, { align: "center", width: 50 })
                                    .stroke();

                                //OTROS_APARTADOS 
                                doc.roundedRect(680, 430, 90, 20)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('CUIDADOS Y LIMPIEZA', 680, 432, { align: "center", width: 50 })
                                    .stroke();

                                doc.roundedRect(680, 450, 90, 20)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('LIMPIEZA', 675, 458, { align: "center", width: 50 })
                                    .stroke();

                                doc.roundedRect(680, 470, 90, 20)
                                    .strokeColor('black')
                                    .lineWidth(1)
                                    .text('OTROS', 673, 478, { align: "center", width: 50 })
                                    .stroke();
                            });
                    }
                }
            }
        }

        doc.end();
        writeStream.on('finish', () => {
            if (fs.existsSync(filePath)) {

                const htmlContent = `
                            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                                <div style="background-color: #49a199; color: #ffffff; padding: 10px 20px; text-align: center;">
                                    <h1 style="margin: 0;">Reporte de Bitácora</h1>
                                </div>
                                <div style="padding: 20px; background-color: #f9f9f9;">
                                    <p style="margin-bottom: 20px; font-size: 16px;">
                                        Estimado usuario,
                                    </p>
                                    <p style="margin-bottom: 20px; font-size: 16px;">
                                        Adjunto encontrarás el <span style="font-size: 20px; font-weight: bold; color: #49a199;">reporte de bitácora</span> generado automáticamente.
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


                transporter.sendMail({
                    from: `"ARRentals Soporte" <${process.env.EMAIL_USER}>`,
                    to: ['desarrolladorar@arrentals.com.mx'],
                    subject: 'Reporte de Bitácora',
                    html: htmlContent,
                    attachments: [
                        {
                            filename: fileName,
                            path: filePath
                        }
                    ]
                }, (err, info) => {
                    if (err) {
                        console.error('Error al enviar el correo:', err);
                        return res.status(500).send('Error al enviar el correo con el archivo adjunto');
                    }
                    //console.log('Correo enviado:', info.response);
                    res.status(200).send('Correo enviado exitosamente con el PDF adjunto');
                });
            } else {
                res.status(404).send('El archivo PDF no fue encontrado');
            }
        });

        writeStream.on('error', (err) => {
            console.error('Error al escribir el archivo:', err);
            res.status(500).send('Error al generar el archivo PDF');



        });
    } catch (error) {
        console.error('Error al generar el PDF:', error);
    }
};


module.exports = { generateBitacora };