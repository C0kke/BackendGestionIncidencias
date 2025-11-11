const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, HeadingLevel, AlignmentType, ImageRun } = docx;
const axios = require('axios');

async function generarReporteIncidencia(data) {
    const createDetailsTable = (incidencia) => {
        return new Table({
            columnWidths: [3000, 6000],
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ID Incidencia", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph(`#${incidencia.id}`)] }),
                    ],
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Área", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph(incidencia.area || 'N/A')] }),
                    ],
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Módulo", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph(incidencia.modulo || 'N/A')] }),
                    ],
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Prioridad", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph(incidencia.prioridad || 'N/A')] }),
                    ],
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Estado", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph(incidencia.estado || 'N/A')] }),
                    ],
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Responsable", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph(incidencia.responsable_nombre || 'N/A')] }),
                    ],
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Fecha Creación", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph(incidencia.fecha_creacion ? new Date(incidencia.fecha_creacion).toLocaleString() : 'N/A')] }),
                    ],
                }),
            ],
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

    // Si hay una imagen Cloudinary, la descargamos como buffer binario
    let imageRun = null;
    if (data.url_foto) {
        try {
            const response = await axios.get(data.url_foto, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(response.data, 'binary');
            imageRun = new ImageRun({
                data: imageBuffer,
                transformation: { width: 400, height: 300 },
            });
        } catch (err) {
            console.error("Error al obtener imagen para el reporte:", err.message);
        }
    }

    const children = [
        new Paragraph({
            text: `REPORTE DE INCIDENCIA #${data.id}`,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
        }),
        new Paragraph({
            text: "Detalles Clave",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
        }),
        createDetailsTable(data),
        new Paragraph({ text: "", spacing: { after: 300 } }),
        new Paragraph({
            text: "Descripción Completa",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
        }),
        new Paragraph({
            text: data.descripcion || "No se proporcionó descripción.",
            spacing: { after: 400 },
        }),
    ];

    if (imageRun) {
        children.push(
            new Paragraph({
                text: "Evidencia fotográfica",
                heading: HeadingLevel.HEADING_2,
                spacing: { after: 150 },
            }),
            new Paragraph({
                children: [imageRun],
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 400 },
            })
        );
    }

    const document = new Document({
        sections: [{ children }],
    });

    const buffer = await Packer.toBuffer(document);
    return buffer;
}

module.exports = { generarReporteIncidencia };