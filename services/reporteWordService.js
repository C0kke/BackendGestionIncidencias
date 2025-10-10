const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel } = docx;

/**
 * Genera el buffer del documento Word a partir de los datos de la incidencia.
 * @param {object} data - Los datos de la incidencia obtenidos de la base de datos.
 * @returns {Promise<Buffer>} El buffer del archivo .docx.
 */
async function generarReporteIncidencia(data) {
    // Función auxiliar para crear la tabla de detalles
    const createDetailsTable = (incidencia) => {
        return new Table({
            columnWidths: [3000, 6000],
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ID Incidencia", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ text: `#${incidencia.id}` })] }),
                    ],
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Área", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ text: incidencia.area })] }),
                    ],
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Prioridad", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ text: incidencia.prioridad })] }),
                    ],
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Estado", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ text: incidencia.estado })] }),
                    ],
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Responsable", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ text: incidencia.responsable_nombre || 'N/A' })] }), // Asumiendo que puede obtener el nombre
                    ],
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Fecha Creación", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ text: incidencia.fecha_creacion ? new Date(incidencia.fecha_creacion).toLocaleString() : 'N/A' })] }),
                    ],
                }),
            ],
            // Estilos simples para la tabla (opcional)
            borders: {
                top: { style: BorderStyle.SINGLE, size: 6, color: "auto" },
                bottom: { style: BorderStyle.SINGLE, size: 6, color: "auto" },
                left: { style: BorderStyle.SINGLE, size: 6, color: "auto" },
                right: { style: BorderStyle.SINGLE, size: 6, color: "auto" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "auto" },
                insideVertical: { style: BorderStyle.SINGLE, size: 6, color: "auto" },
            }
        });
    };

    const document = new Document({
        sections: [{
            children: [
                new Paragraph({
                    text: `REPORTE DE INCIDENCIA #${data.id}`,
                    heading: HeadingLevel.TITLE,
                    alignment: docx.AlignmentType.CENTER,
                    spacing: { after: 300 }
                }),
                
                // --- Sección de Detalles Clave ---
                new Paragraph({
                    text: "Detalles Clave",
                    heading: HeadingLevel.HEADING_2,
                    spacing: { after: 150 }
                }),
                createDetailsTable(data),
                
                new Paragraph({ text: "", spacing: { after: 300 } }), // Espacio
                
                // --- Sección de Descripción ---
                new Paragraph({
                    text: "Descripción Completa",
                    heading: HeadingLevel.HEADING_2,
                    spacing: { after: 150 }
                }),
                new Paragraph({
                    text: data.descripcion || 'No se proporcionó una descripción.',
                    spacing: { after: 300 }
                }),

                // --- URL de Foto (Opcional) ---
                new Paragraph({
                    text: `URL de Evidencia: ${data.url_foto || 'N/A'}`,
                    spacing: { before: 300 }
                }),
            ],
        }],
    });

    // Genera el buffer binario del archivo .docx
    const buffer = await Packer.toBuffer(document);
    return buffer;
}

module.exports = { generarReporteIncidencia };