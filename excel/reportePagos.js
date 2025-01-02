const xl = require('excel4node');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');


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

const generateExcelFile = async (datos, startDate, endDate) => {


  try {
    const dirPath = path.join(__dirname, '../reports');

    // Crear la carpeta si no existe
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Crear el nombre del archivo
    const fileName = `reporte-de-${startDate}-al-${endDate}.xlsx`;
    const filePath = path.join(dirPath, fileName);

    // Crear un nuevo libro de Excel
    const wb = new xl.Workbook();
    const styleHeader = wb.createStyle({
      font: { bold: true, size: 12, color: '#000000' },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill: {
        type: 'pattern',
        patternType: 'solid',
        fgColor: '#D9D9D9',
      }
    });
    const styleData = wb.createStyle({
      font: { size: 11 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        left: { style: 'thin', color: 'black' },
        right: { style: 'thin', color: 'black' },
        top: { style: 'thin', color: 'black' },
        bottom: { style: 'thin', color: 'black' },
      },
      border: {
        top: { style: 'thin', color: 'black' },
        bottom: { style: 'thin', color: 'black' },
      },
    });
    const styleVerticalWrap = wb.createStyle({
      font: { size: 12, bold: true },
      alignment: {
        horizontal: 'center',
        vertical: 'center',
        wrapText: true
      },
      border: {
        left: { style: 'thin', color: 'black' },
        right: { style: 'thin', color: 'black' },
        top: { style: 'thin', color: 'black' },
        bottom: { style: 'thin', color: 'black' },
      },
      fill: {
        type: 'pattern',
        patternType: 'solid',
        fgColor: '#D9D9D9',
      }

    });
    const dataStyle = wb.createStyle({
      font: { size: 11 },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: {
        left: { style: 'thin', color: 'black' },
        right: { style: 'thin', color: 'black' },
        top: { style: 'thin', color: 'black' },
        bottom: { style: 'thin', color: 'black' },
      },
    });
    const styleTotal = wb.createStyle({
      font: {
        name: 'Abadi', // Nombre de la fuente
        size: 8,
        bold: true
      },
      alignment: {
        horizontal: 'center',
        vertical: 'center',
        wrapText: true
      },
      border: {
        left: { style: 'thin', color: 'black' },
        right: { style: 'thin', color: 'black' },
        top: { style: 'thin', color: 'black' },
        bottom: { style: 'thin', color: 'black' },
      },
      fill: {
        type: 'pattern',
        patternType: 'solid',
        fgColor: '#C0F099',
      }
    });
    const mesesEnEspañol = {
      January: "Enero",
      February: "Febrero",
      March: "Marzo",
      April: "Abril",
      May: "Mayo",
      June: "Junio",
      July: "Julio",
      August: "Agosto",
      September: "Septiembre",
      October: "Octubre",
      November: "Noviembre",
      December: "Diciembre",
    };

    Object.entries(datos).forEach(([proyecto, categorias]) => {
      const ws = wb.addWorksheet(proyecto);

      ws.column(3).setWidth(25);
      ws.column(4).setWidth(10);
      // Extraer el mes del primer registro
      let periodo = 'No especificado'; // Valor por defecto
      for (const department of Object.values(categorias)) {
        for (const operator of Object.values(department)) {
          if (operator.registros.length > 0) {
            const mesEnIngles = operator.registros[0].mes || 'No especificado';
            periodo = mesesEnEspañol[mesEnIngles] || 'No especificado'; // Traducir el mes
            break;
          }
        }
        if (periodo !== 'No especificado') break;
      }

      const data = [
        { row: 3, label: 'PROYECTO', value: proyecto },
        { row: 5, label: 'RESPONSABLE', value: '' },
        { row: 7, label: 'PERIODO', value: periodo },
        { row: 9, label: 'CLIENTE', value: 'LA GRANJA' },
        { row: 11, label: 'TOTAL DE UNIDADES', value: '1' },
      ];


      data.forEach((item) => {
        ws.cell(item.row, 3).string(item.label).style(styleHeader);
        ws.cell(item.row, 4, item.row, 14, true).string(item.value).style(styleData);
      });

      // Fusionar celdas y aplicar estilos
      ws.cell(14, 1, 17, 1, true).string('N°').style(styleVerticalWrap);
      ws.cell(16, 3, 17, 3, true).string('UNIDAD 1').style(styleVerticalWrap);
      ws.cell(14, 3, 15, 3, true).style(styleVerticalWrap)

      ws.cell(14, 2, 17, 2, true).style(styleVerticalWrap)

      ws.cell(14, 4).style(styleVerticalWrap);
      ws.column(4).setWidth(20);

      ws.cell(15, 4).style(styleVerticalWrap);
      ws.column(4).setWidth(20);

      ws.cell(16, 4).style(styleVerticalWrap);
      ws.column(4).setWidth(20);

      ws.cell(17, 4).string('DRIVER').style(styleVerticalWrap);
      ws.column(4).setWidth(20);

      //E14
      ws.cell(14, 5).style(styleVerticalWrap);
      ws.column(5).setWidth(8);
      //E15
      ws.cell(14, 6).style(styleVerticalWrap);
      ws.column(6).setWidth(8);

      //14 G_-N
      ws.cell(14, 7, 14, 14, true).string('SEMANA').style(styleVerticalWrap);
      //E-J
      ws.cell(15, 5, 15, 10, true).string(periodo).style(styleVerticalWrap);

      const styleTotal = wb.createStyle({
        font: {
          name: 'Abadi', // Nombre de la fuente
          size: 8,
          bold: true
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center',
          wrapText: true
        },
        border: {
          left: { style: 'thin', color: 'black' },
          right: { style: 'thin', color: 'black' },
          top: { style: 'thin', color: 'black' },
          bottom: { style: 'thin', color: 'black' },
        },
        fill: {
          type: 'pattern',
          patternType: 'solid',
          fgColor: '#C0F099',
        }
      });

      // DIAS DE LA SEMANA
      ws.cell(16, 5).string('L').style(styleVerticalWrap);
      ws.column(5).setWidth(8);
      ws.cell(16, 6).string('M').style(styleVerticalWrap);
      ws.column(6).setWidth(8);
      ws.cell(16, 7).string('M').style(styleVerticalWrap);
      ws.column(7).setWidth(8);
      ws.cell(16, 8).string('J').style(styleVerticalWrap);
      ws.column(8).setWidth(8);
      ws.cell(16, 9).string('V').style(styleVerticalWrap);
      ws.column(9).setWidth(8);
      ws.cell(16, 10).string('S').style(styleVerticalWrap);
      ws.column(10).setWidth(8);
      ws.cell(16, 11).string('D').style(styleVerticalWrap);
      ws.column(11).setWidth(8);

      const getDaysArray = (startDate, endDate) => {
        const arr = [];
        const dt = new Date(startDate);
        while (dt <= new Date(endDate)) {
          arr.push(dt.getDate()); // Obtiene solo el día del mes
          dt.setDate(dt.getDate() + 1); // Incrementa el día en 1
        }
        return arr; // Devuelve un arreglo de días (números)
      };
      // Obtiene los días en un arreglo
      const daysArray = getDaysArray(startDate, endDate);

      // Colocar los días en las celdas correspondientes
      daysArray.forEach((day, index) => {
        const column = 5 + index; // Comienza en la columna 5
        ws.cell(17, column) // Fila 17, columna calculada
          .string(day.toString()) // Agrega el día como texto
          .style(styleVerticalWrap); // Aplica el estilo

        ws.column(column).setWidth(8); // Ajusta el ancho de la columna
      });

      //k15
      ws.cell(15, 11).style(styleVerticalWrap);

      // Combinar las celdas K15, K16, y K17
      ws.cell(15, 12, 17, 12, true).string('No.\nDías').style(styleTotal);

      // Combinar las celdas L15, L16 y L17
      ws.cell(15, 13, 17, 13, true).string('P.\nunitario').style(styleTotal);


      // Combinar las celdas M15, M16 y M17
      ws.cell(15, 14, 17, 14, true).string('Sub\ntotal').style(styleTotal);

      function normalizarDia(dia) {
        return dia.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      }

      let rowIndex = 18;

      Object.entries(categorias || {}).forEach(([categoria, operadores]) => {
        Object.entries(operadores || {}).forEach(([operador, info]) => {
          let diasDeLaSemana = info.diasDeLaSemana || [];

          // Validación de diasDeLaSemana
          if (!Array.isArray(diasDeLaSemana)) {
            console.log('Error: diasDeLaSemana tiene un formato no soportado', diasDeLaSemana);
            diasDeLaSemana = [];
          }

          // Contar el número de días trabajados
          const numeroDiasTrabajados = diasDeLaSemana.length;

          if (info.multiplesTiposUnidad) {
            info.registros.forEach((registro) => {
              const departamento = registro.departamento || 'No especificado';
              const automovil = registro.tipoUnidad || 'No especificado';

              ws.cell(rowIndex, 2).string(automovil).style(dataStyle); // Automóvil en B
              ws.cell(rowIndex, 3).string(departamento).style(dataStyle); // Departamento en C
              ws.cell(rowIndex, 4).string(operador).style(dataStyle); // Nombre del operador en D
              ws.cell(rowIndex, 12).number(numeroDiasTrabajados).style(dataStyle); // Número de días trabajados en L

              // Mapeo de días a columnas
              const diaColumnas = {
                lunes: 5,    // E
                martes: 6,   // F
                miercoles: 7, // G
                jueves: 8,   // H
                viernes: 9,  // I
                sabado: 10,  // J
                domingo: 11, // K
              };

              // Pintar las flechas para los días trabajados
              diasDeLaSemana.forEach((dia) => {
                const diaLowerCase = normalizarDia(dia);
                const columna = diaColumnas[diaLowerCase];
                if (columna) {
                  const cellStyle = {
                    ...dataStyle,
                    fill: {
                      type: 'pattern',
                      patternType: 'solid',
                      fgColor: 'FFFF00' // Color de fondo amarillo
                    }
                  };
                  ws.cell(rowIndex, columna).string('✔').style(cellStyle); // Marca en la columna correspondiente y aplica el estilo
                } else {
                  //console.log(`Día no mapeado: ${diaLowerCase} - Claves disponibles: ${Object.keys(diaColumnas).join(', ')}`);
                }
              });

              rowIndex++; // Avanzar a la siguiente fila
            });
          } else {
            const registroUnico = info.registros[0] || {}; // Toma el primer registro o un objeto vacío
            const departamento = registroUnico.departamento || 'No especificado';
            const automovil = registroUnico.tipoUnidad || 'No especificado';

            ws.cell(rowIndex, 2).string(automovil).style(dataStyle); // Automóvil en B
            ws.cell(rowIndex, 3).string(departamento).style(dataStyle); // Departamento en C
            ws.cell(rowIndex, 4).string(operador).style(dataStyle); // Nombre del operador en D
            ws.cell(rowIndex, 12).number(numeroDiasTrabajados).style(dataStyle); // Número de días trabajados en L

            // Mapeo de días a columnas
            const diaColumnas = {
              lunes: 5,    // E
              martes: 6,   // F
              miercoles: 7, // G
              jueves: 8,   // H
              viernes: 9,  // I
              sabado: 10,  // J
              domingo: 11, // K
            };

            // Pintar las flechas para los días trabajados
            diasDeLaSemana.forEach((dia) => {
              const diaLowerCase = normalizarDia(dia); // Convierte a minúsculas y elimina espacios innecesarios
              const columna = diaColumnas[diaLowerCase];
              if (columna) {
                const cellStyle = {
                  ...dataStyle,
                  fill: {
                    type: 'pattern',
                    patternType: 'solid',
                    fgColor: 'FFFF00' // Color de fondo amarillo
                  }
                };
                ws.cell(rowIndex, columna).string('✔').style(cellStyle); // Marca en la columna correspondiente y aplica el estilo
              } else {
                //console.log(`Día no mapeado: ${diaLowerCase} - Claves disponibles: ${Object.keys(diaColumnas).join(', ')}`);
              }
            });

            rowIndex++; // Avanzar a la siguiente fila
          }
        });
      });
    });

    // Guardar el archivo Excel
    wb.write(filePath, async function (err) {
      if (err) {
        console.error('Error al escribir el archivo Excel:', err);
      } else {
        console.log('Archivo Excel guardado exitosamente en:', filePath);

        const htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
            <div style="background-color: #49a199; color: #ffffff; padding: 10px 20px; text-align: center;">
                <h1 style="margin: 0;">Reporte de Cierre</h1>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
                <p style="margin-bottom: 20px; font-size: 16px;">
                    Estimado usuario,
                </p>
                <p style="margin-bottom: 20px; font-size: 16px;">
                    Adjunto encontrarás el <span style="font-size: 20px; font-weight: bold; color: #49a199;">REPORTE DE CIERRE</span> generado automáticamente.
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
          subject: 'REPORTE DE CIERRE',
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
          console.log('Correo enviado:', info.response);
          res.status(200).send('Correo enviado exitosamente con el xlsx adjunto');
        });


      }
    });
  } catch (error) {
    console.error('Error al generar el reporte Excel:', error);
  }
};

module.exports = { generateExcelFile }
