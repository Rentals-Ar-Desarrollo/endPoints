const Airtable = require('airtable');
const axios = require('axios');
const fs = require('fs');
const { format } = require('date-fns');

// Configuración de Airtable
const AIR_TAG_KEY = process.env.AIR_TAG_KEY;

const BASE_ID = process.env.BASE_ID;

const SECOND_TABLE_NAME = process.env.SECOND_TABLE_NAME;

const SECOND_VIEW_ID = process.env.SECOND_VIEW_ID;

/**
 * Obtiene un mapa de operadores desde Airtable.
 */
async function fetchOperators() {
    try {
        const OPERATORS_TABLE_NAME = 'Operadores';
        const OPERATORS_TABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${OPERATORS_TABLE_NAME}`;
        const operatorMap = {};
        let offset = null;

        do {
            const response = await axios.get(OPERATORS_TABLE_URL, {
                headers: { Authorization: `Bearer ${AIR_TAG_KEY}` },
                params: { offset },
            });

            response.data.records.forEach(record => {
                const id = record.id;
                const fullName = record.fields['Full Name (Company + Name)'] || 'Nombre no encontrado';
                operatorMap[id] = fullName;
            });

            offset = response.data.offset;
        } while (offset);

        return operatorMap;
    } catch (error) {
        console.error('Error al obtener operadores:', error);
        return {};
    }
}

/**
 * Agrupa registros por operador y proyecto, formateando las fechas.
 */


async function fetchAndMergeData(operatorMap, startDate, endDate) {
    try {
        const DATE_FILTER = `AND(IS_AFTER({Fecha de creación }, DATETIME_PARSE('${startDate}T06:00:00.000Z', 'YYYY-MM-DDTHH:mm:ss.SSSZ')), IS_BEFORE({Fecha de creación }, DATETIME_PARSE('${endDate}T06:00:00.000Z', 'YYYY-MM-DDTHH:mm:ss.SSSZ')))`;
        const SECOND_TABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${SECOND_TABLE_NAME}?view=${SECOND_VIEW_ID}&filterByFormula=${encodeURIComponent(DATE_FILTER)}`;
        let allRecords = [];
        let offset = null;

        do {
            const url = `${SECOND_TABLE_URL}${offset ? `&offset=${offset}` : ''}`;
            const response = await axios.get(url, { headers: { Authorization: `Bearer ${AIR_TAG_KEY}` } });
            allRecords = allRecords.concat(response.data.records);
            offset = response.data.offset;
        } while (offset);

        // Agrupar datos por proyecto, departamento y operador
        const groupedData = {};

        allRecords.forEach(record => {
            const project = record.fields['Proyecto'] || 'Proyecto no encontrado';
            const department = record.fields['Departamento'] || 'Departamento no encontrado';
            const operatorID = record.fields["Operador"] ? record.fields["Operador"][0] : null;
            const operatorName = operatorMap[operatorID] || 'ID no encontrado';
            const tipoUnidad = record.fields['Tipo de unidad'] || 'Tipo no encontrado';
            const rawCreationDate = record.fields['Fecha de creación '] || null;
            const dayOfWeek = rawCreationDate ? getDayOfWeek(format(new Date(rawCreationDate), 'dd/MM/yyyy')) : 'Día no encontrado';
            const formattedCreationDate = rawCreationDate ? format(new Date(rawCreationDate), 'yyyy-MM-dd') : null;
            const month = rawCreationDate ? format(new Date(rawCreationDate), 'MMMM') : 'Mes no encontrado'; // Obtiene el mes como texto

            // Asegurarse de la estructura de agrupación por Proyecto -> Departamento -> Operador
            if (!groupedData[project]) {
                groupedData[project] = {};
            }
            if (!groupedData[project][department]) {
                groupedData[project][department] = {};
            }
            if (!groupedData[project][department][operatorName]) {
                groupedData[project][department][operatorName] = {
                    diasTrabajados: new Set(),
                    tiposUnidad: new Set(),
                    registros: []
                };
            }

            if (formattedCreationDate) {
                groupedData[project][department][operatorName].diasTrabajados.add(formattedCreationDate);
            }
            groupedData[project][department][operatorName].tiposUnidad.add(tipoUnidad);

            groupedData[project][department][operatorName].registros.push({
                fechaCreacion: formattedCreationDate,
                mes: month, // AgrWegar el mes extraído
                tipoUnidad,
                diaDeLaSemana: dayOfWeek,
                departamento: department,
                placas: record.fields['Placas'] || 'Campo no encontrado',
            });


        });
        // Ordenar por fecha y días de la semana
        const processedData = {};
        for (const project in groupedData) {
            processedData[project] = {};
            for (const department in groupedData[project]) {
                processedData[project][department] = {};
                for (const operatorName in groupedData[project][department]) {
                    const operatorData = groupedData[project][department][operatorName];

                    // Ordenar registros por fecha
                    operatorData.registros.sort((a, b) => new Date(a.fechaCreacion) - new Date(b.fechaCreacion));

                    const diasDeLaSemana = [...new Set(operatorData.registros.map((registro) => registro.diaDeLaSemana))];

                    processedData[project][department][operatorName] = {
                        diasTrabajados: Array.from(operatorData.diasTrabajados).sort(),
                        multiplesTiposUnidad: operatorData.tiposUnidad.size > 1,
                        registros: operatorData.registros,
                        diasDeLaSemana: diasDeLaSemana
                    };
                }
            }
        }



        return processedData;

    } catch (error) {
        console.error('Error al combinar datos por proyecto:', error);
        throw error;
    }
}
/**
 * Convierte una fecha a su correspondiente día de la semana.
 */
function getDayOfWeek(dateString) {
    const dateParts = dateString.split('/');
    const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
    const date = new Date(formattedDate);
    const daysOfWeek = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
    return daysOfWeek[date.getDay()];
}

/**
 * Procesa los datos completos.
 */


async function getMergedDataExcel(startDate, endDate) {
    try {
        const operatorMap = await fetchOperators();
        const mergedData = await fetchAndMergeData(operatorMap, startDate, endDate);
        return mergedData;
    } catch (error) {
        console.error('Error al obtener Datos:', error);
        throw error;
    }
}

module.exports = { getMergedDataExcel };
