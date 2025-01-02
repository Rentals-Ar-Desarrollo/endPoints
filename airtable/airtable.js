const Airtable = require('airtable');
const axios = require('axios');
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

        // Procesar registros agrupados
        const groupedByOperator = {};
        const operatorProductorCount = {};
        allRecords.forEach(record => {
            const tipoReporte = record.fields['Tipo de reporte'] || 'Tipo no encontrado';
            const operatorID = record.fields["Operador"] ? record.fields["Operador"][0] : null;
            const operatorName = operatorMap[operatorID] || 'ID no encontrado';
            const isTerminoDeLlamado = record.fields['Tipo de reporte'] === 'Termino de llamado';
            const rawCreationDate = record.fields['Fecha de creación '] || null;
            const formattedCreationDate = rawCreationDate ? format(new Date(rawCreationDate), 'dd/MM/yyyy') : 'Fecha no encontrada';
            const formattedCreationTime = rawCreationDate ? new Date(rawCreationDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Hora no encontrada';
            const dayOfWeek = rawCreationDate ? getDayOfWeek(format(new Date(rawCreationDate), 'dd/MM/yyyy')) : 'Día no encontrado';
            const kilometrajeKey = isTerminoDeLlamado ? 'kilometrajeFinal' : 'kilometrajeInicial';
            const horaCreacionKey = isTerminoDeLlamado ? 'horaCreacionTermino' : 'horaCreacion';
            const comentarioKey = isTerminoDeLlamado ? 'comentarioFin' : 'comentarioInicio';
            const project = record.fields['Proyecto'] || 'Proyecto no encontrado';
            const department = record.fields['Departamento'] || 'Departamento no encontrado';
            const productora = record.fields['Productora'] || 'Productora no encontrada';
            const nivelCombustible = record.fields['Nivel de combustible'] || 'Campo no encontrado';
            const recordData = {
                tipoReporte,
                tipoReporte: record.fields['Tipo de reporte'] || 'Campo no encontrado',
                tipoUnidad: record.fields['Tipo de unidad'] || 'Campo no encontrado',
                [kilometrajeKey]: record.fields['Kilometraje'] || 'Campo no encontrado',
                operador: operatorName,
                productora,
                proyecto: project,
                [comentarioKey]: record.fields['Comentarios'] || 'Campo no encontrado',
                placas: record.fields['Placas'] || 'Campo no encontrado',
                departamento: department,
                createdTime: format(new Date(record.createdTime), 'dd/MM/yyyy'),
                recordId: record.id,
                fechaCreacion: formattedCreationDate,
                [horaCreacionKey]: formattedCreationTime,
                diaDeLaSemana: dayOfWeek,
                bitacora: record.fields['Bitácora'] || 'Campo no encontrado',
                nivelCombustible
            };

            if (!groupedByOperator[operatorName]) {
                groupedByOperator[operatorName] = {};
            }
            if (!groupedByOperator[operatorName][project]) {
                groupedByOperator[operatorName][project] = {};
            }
            if (!groupedByOperator[operatorName][project][department]) {
                groupedByOperator[operatorName][project][department] = [];
            }

            groupedByOperator[operatorName][project][department].push(recordData);
            if (!operatorProductorCount[operatorName]) {
                operatorProductorCount[operatorName] = new Set();
            }
            operatorProductorCount[operatorName].add(productora);
        });
        for (const operator in operatorProductorCount) {
            operatorProductorCount[operator] = operatorProductorCount[operator].size;
        }

        return groupedByOperator;
    } catch (error) {
        console.error('Error al combinar datos:', error);
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
async function getMergedData(startDate, endDate) {
    try {
        const operatorMap = await fetchOperators();
        const mergedData = await fetchAndMergeData(operatorMap, startDate, endDate);
        return mergedData;
    } catch (error) {
        console.error('Error al obtener Datos:', error);
        throw error;
    }
}

module.exports = { getMergedData };
