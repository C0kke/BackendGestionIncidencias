const BackblazeB2 = require('backblaze-b2');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config();

const b2 = new BackblazeB2({
    accountId: process.env.B2_ACCOUNT_ID,
    applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
    applicationKey: process.env.B2_APPLICATION_KEY,
});


/**
 * @param {object} file
 * @param {string} [id]
 * @returns {string}
 */
async function subirImagen(file, id) {
    if (!file || !file.buffer || !file.originalname || !file.mimetype) {
        throw new Error("No se proporcionó un archivo válido (debe tener buffer, originalname y mimetype).");
    }
    
    const safeId = id || ''; 
    console.log(b2)
    
    try {
        console.log("1. Autorizando con B2...");
        await b2.authorize(); 
        console.log("2. Autorización exitosa.");
    } catch (authError) {
        console.error("Error durante la autorización:", authError.message);
        throw new Error("Fallo en la autenticación de B2. Verifique B2_ACCOUNT_ID y B2_APPLICATION_KEY.");
    }
    
    let uploadUrlResponse;
    try {
        uploadUrlResponse = await b2.getUploadUrl({ 
            bucketId: process.env.B2_BUCKET_ID
        });

    } catch (getUrlError) {
        console.error("Error al obtener la URL de subida:", getUrlError.message);
        console.error("Detalles del error (posiblemente falta de permisos o configuración del bucket):", getUrlError);
        throw new Error("Fallo al obtener la URL de subida de B2. El error 400 indica un problema de parámetro. Asegúrese de que el B2_BUCKET_ID sea correcto.");
    }

    if (!uploadUrlResponse || !uploadUrlResponse.uploadUrl) {
        throw new Error("La respuesta de getUploadUrl es válida, pero no contiene uploadUrl.");
    }

    const uniqueFileName = `incidencia-${safeId}-${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;
    
    const fileSha1 = crypto.createHash('sha1').update(file.buffer).digest('hex');
    console.log(`SHA1 generado: ${fileSha1}`);

    console.log(`Intentando subir archivo: ${uniqueFileName}`);
    let uploadResponse;
    try {
        uploadResponse = await b2.uploadFile({
            uploadUrl: uploadUrlResponse.uploadUrl,
            uploadAuthToken: uploadUrlResponse.authorizationToken,
            data: file.buffer, 
            fileName: uniqueFileName,
            mime: file.mimetype,
            contentSha1: fileSha1, 
        });
    } catch (uploadError) {
        console.error("Error al subir el archivo:", uploadError.message);
        throw new Error("Fallo en la subida del archivo a B2.");
    }
    
    console.log("5. Subida exitosa. Generando URL de retorno."); 

    return `https://f005.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${uniqueFileName}`;
}

module.exports = { subirImagen };
