import { GoogleGenAI, GenerateContentResponse, Type, FunctionDeclaration } from "@google/genai";

const MODEL_NAME = "gemini-2.5-flash-preview-12-2025"; // Using a recent stable-ish preview for multimodal

export interface AnalysisResult {
  text: string;
  functionCalls?: any[];
}

const navegarAPantallaDeclaration: FunctionDeclaration = {
  name: "navegar_a_pantalla",
  description: "Navega al usuario a una sección específica de la app.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      pantalla_id: {
        type: Type.STRING,
        description: "ID de la pantalla: 'perfil', 'historial', 'ajustes', 'calendario'.",
        enum: ['perfil', 'historial', 'ajustes', 'calendario']
      }
    },
    required: ["pantalla_id"]
  }
};

const abrirCamaraAnalisisDeclaration: FunctionDeclaration = {
  name: "abrir_camara_analisis",
  description: "Activa la cámara para tomar una foto que será analizada.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      tipo: {
        type: Type.STRING,
        description: "Tipo de análisis: 'herida', 'documento' o 'generico'.",
        enum: ['herida', 'documento', 'generico']
      }
    },
    required: ["tipo"]
  }
};

const programarRecordatorioDeclaration: FunctionDeclaration = {
  name: "programar_recordatorio",
  description: "Crea un recordatorio en la base de datos de la app.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      medicamento: { type: Type.STRING, description: "Nombre del medicamento." },
      dosis: { type: Type.STRING, description: "Dosis recomendada." },
      hora: { type: Type.STRING, description: "Hora del recordatorio (ej: 08:00)." }
    },
    required: ["medicamento", "dosis", "hora"]
  }
};

export async function analyzeClinicalInput(
  text: string,
  image?: { data: string; mimeType: string }
): Promise<AnalysisResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  const systemInstruction = `
    Eres el motor de IA de la aplicación "Vimedical Health". Tu función es interactuar con el usuario y determinar cuándo es necesario llamar a una función específica de la aplicación para asistirlo.

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
    - Si detectas que el usuario necesita una acción específica (navegar, cámara, recordatorio), usa las herramientas disponibles.

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
      tools: [{
        functionDeclarations: [
          navegarAPantallaDeclaration,
          abrirCamaraAnalisisDeclaration,
          programarRecordatorioDeclaration
        ]
      }]
    },
  });

  return {
    text: response.text || "",
    functionCalls: response.functionCalls
  };
}
