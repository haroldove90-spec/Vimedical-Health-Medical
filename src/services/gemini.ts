import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const MODEL_NAME = "gemini-2.5-flash-preview-12-2025"; // Using a recent stable-ish preview for multimodal

export interface AnalysisResult {
  text: string;
}

export async function analyzeClinicalInput(
  text: string,
  image?: { data: string; mimeType: string }
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  const systemInstruction = `
    Actúa como el motor de inteligencia clínica para la plataforma "Vimedical Health". 
    Tu función es procesar entradas multimodales (texto e imágenes) para asistir en la gestión médica.

    ### DIRECTRICES DE ANÁLISIS:
    1. **Visión Médica:** Al recibir fotos de heridas o piel, describe:
       - Tipo de tejido (Granulación, Esfacelo, Necrosis).
       - Estado de los bordes y piel perilesional.
       - Signos visuales de infección (Eritema, exudado purulento).
    2. **Extracción de Datos:** Si se sube un documento o receta, extrae: Nombre del paciente, Medicamentos, Dosis y Próxima cita.
    3. **Triaje:** Clasifica la urgencia en: [BAJA / MEDIA / ALTA] basado en los síntomas descritos.

    ### REGLAS DE RESPUESTA:
    - Usa un tono profesional, empático y conciso.
    - Estructura siempre con Markdown (Encabezados y Bullet points).
    - **IMPORTANTE:** Al final de cada análisis clínico, añade una sección de "Siguientes Pasos Sugeridos".

    ### RESTRICCIONES DE SEGURIDAD (Inviolables):
    - Nunca digas "Usted tiene [Enfermedad]". Di: "Los hallazgos son compatibles con..." o "Se observa una tendencia hacia...".
    - Si el usuario describe síntomas de emergencia (dolor de pecho, dificultad respiratoria), ignora el análisis y ordena acudir a Urgencias inmediatamente.
    - Incluye el disclaimer: "Análisis asistido por IA. Requiere validación médica."
  `;

  const parts: any[] = [{ text }];
  if (image) {
    parts.push({
      inlineData: {
        data: image.data.split(",")[1], // Remove data:image/png;base64,
        mimeType: image.mimeType,
      },
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-12-2025",
    contents: [{ parts }],
    config: {
      systemInstruction,
    },
  });

  return response.text || "No se pudo generar un análisis.";
}
