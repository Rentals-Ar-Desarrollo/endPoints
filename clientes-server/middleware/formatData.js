const formatData = (req, res, next) => {
    try {
      const rawData = req.body.data; // Supongamos que los datos vienen en `req.body.data`
  
      // Agrupar datos por operador
      const formattedData = rawData.reduce((acc, record) => {
        const { operador, tipoReporte, kilometraje, horaCreacion, comentario } = record.fields;
  
        if (!acc[operador]) {
          acc[operador] = [];
        }
  
        acc[operador].push({
          tipoReporte,
          kilometraje,
          horaCreacion,
          comentario,
          recordId: record.id,
        });
  
        return acc;
      }, {});
  
      // Ordenar cada grupo por fecha
      for (const operador in formattedData) {
        formattedData[operador].sort((a, b) => new Date(a.horaCreacion) - new Date(b.horaCreacion));
      }
  
      // Guardar datos formateados en `req.formattedData`
      req.formattedData = formattedData;
  
      next();
    } catch (error) {
      console.error("Error al formatear los datos:", error);
      res.status(500).json({ error: "Error al formatear los datos" });
    }
  };
  
  module.exports = formatData;
  