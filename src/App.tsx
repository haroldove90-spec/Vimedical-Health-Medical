import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Send, 
  AlertCircle, 
  Activity, 
  FileText, 
  Stethoscope,
  X,
  Loader2,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { analyzeClinicalInput } from './services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ url: string; file: File } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; date: string; type: string; result: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('vimedical_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const saveToHistory = (type: string, result: string) => {
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      type,
      result
    };
    setHistory(prev => {
      const updated = [newEntry, ...prev].slice(0, 5);
      localStorage.setItem('vimedical_history', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [analysisResult, isAnalyzing]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedImage({ url, file });
    }
  };

  const removeImage = () => {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage.url);
      setSelectedImage(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      let imageData;
      if (selectedImage) {
        const base64 = await fileToBase64(selectedImage.file);
        imageData = {
          data: base64,
          mimeType: selectedImage.file.type
        };
      }

      const result = await analyzeClinicalInput(inputText, imageData);
      setAnalysisResult(result);

      // Determine type for history
      let type = 'Consulta General';
      const lowerText = inputText.toLowerCase();
      if (lowerText.includes('herida') || lowerText.includes('visión')) type = 'Visión Médica';
      else if (lowerText.includes('receta') || lowerText.includes('digitaliza')) type = 'Digitalización';
      else if (lowerText.includes('triaje') || lowerText.includes('síntomas')) type = 'Triaje IA';
      
      saveToHistory(type, result);
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error durante el análisis. Por favor, intente de nuevo.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToolClick = (tool: 'vision' | 'digital' | 'triaje') => {
    switch (tool) {
      case 'vision':
        setInputText('Por favor, realiza un análisis de visión médica de esta imagen de herida/piel. Describe tejido, bordes y signos de infección.');
        fileInputRef.current?.click();
        break;
      case 'digital':
        setInputText('Extrae los datos de esta receta médica: Nombre del paciente, Medicamentos, Dosis y Próxima cita.');
        fileInputRef.current?.click();
        break;
      case 'triaje':
        setInputText('Realiza un triaje basado en los siguientes síntomas: [Describa aquí los síntomas, ej: fiebre de 39°C y dolor abdominal agudo]');
        break;
    }
  };

  const loadExample = (type: 'herida' | 'receta' | 'emergencia') => {
    switch (type) {
      case 'herida':
        setInputText('Analiza esta herida: Se observa una lesión en el miembro inferior derecho, con presencia de tejido amarillento y bordes enrojecidos. El paciente reporta dolor local.');
        break;
      case 'receta':
        setInputText('Digitaliza esta información de receta: Paciente Juan Pérez. Paracetamol 500mg cada 8 horas por 3 días. Cita de control el 15 de abril.');
        break;
      case 'emergencia':
        setInputText('El paciente presenta dolor intenso en el pecho que se irradia al brazo izquierdo y dificultad para respirar desde hace 10 minutos.');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Activity className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-slate-800">Vimedical Health</h1>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-blue-600">Clinical Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {history.length > 0 && (
              <button 
                onClick={() => {
                  localStorage.removeItem('vimedical_history');
                  setHistory([]);
                }}
                className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors"
              >
                Limpiar Historial
              </button>
            )}
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 pb-32">
        {/* Welcome Section */}
        {!analysisResult && !isAnalyzing && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-800 mb-4">Asistente Clínico Inteligente</h2>
              <p className="text-slate-600 max-w-xl mx-auto">
                Seleccione una herramienta para comenzar el análisis clínico asistido por IA.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'vision', icon: Camera, title: "Visión Médica", desc: "Análisis de tejidos y signos de infección en heridas.", color: "bg-blue-50 text-blue-600 border-blue-100" },
                { id: 'digital', icon: FileText, title: "Digitalización", desc: "Extracción de datos de recetas y documentos.", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                { id: 'triaje', icon: Stethoscope, title: "Triaje IA", desc: "Clasificación de urgencia basada en síntomas.", color: "bg-purple-50 text-purple-600 border-purple-100" }
              ].map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => handleToolClick(item.id as any)}
                  className={cn(
                    "p-6 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md",
                    item.color,
                    "bg-white border-slate-200"
                  )}
                >
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", item.color.split(' ')[0])}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </button>
              ))}
            </div>

            {/* Recent Activity */}
            {history.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <h4 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Actividad Reciente
                </h4>
                <div className="space-y-4">
                  {history.map((entry) => (
                    <button 
                      key={entry.id}
                      onClick={() => setAnalysisResult(entry.result)}
                      className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
                          {entry.type === 'Visión Médica' && <Camera className="w-5 h-5 text-blue-600" />}
                          {entry.type === 'Digitalización' && <FileText className="w-5 h-5 text-emerald-600" />}
                          {entry.type === 'Triaje IA' && <Stethoscope className="w-5 h-5 text-purple-600" />}
                          {entry.type === 'Consulta General' && <Activity className="w-5 h-5 text-slate-600" />}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-slate-800 text-sm">{entry.type}</p>
                          <p className="text-xs text-slate-400">{entry.date}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Pruebas Rápidas (Ejemplos)</h4>
              <div className="flex flex-wrap justify-center gap-3">
                <button onClick={() => loadExample('herida')} className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  🩹 Analizar Herida
                </button>
                <button onClick={() => loadExample('receta')} className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  📄 Digitalizar Receta
                </button>
                <button onClick={() => loadExample('emergencia')} className="px-4 py-2 bg-red-50 border border-red-100 rounded-full text-sm font-medium text-red-600 hover:bg-red-100 transition-colors">
                  🚨 Caso de Emergencia
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Analysis Results */}
        <AnimatePresence mode="wait">
          {isAnalyzing && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="relative">
                <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 w-8 h-8 animate-pulse" />
              </div>
              <p className="mt-6 text-slate-600 font-medium animate-pulse">Procesando información clínica...</p>
              <p className="text-xs text-slate-400 mt-2">Analizando patrones y extrayendo datos relevantes</p>
            </motion.div>
          )}

          {analysisResult && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <Stethoscope className="w-5 h-5" />
                    <span className="font-bold">Informe de Análisis Clínico</span>
                  </div>
                  <button 
                    onClick={() => setAnalysisResult(null)}
                    className="text-white/80 hover:text-white p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-8 prose prose-slate max-w-none">
                  <ReactMarkdown 
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-slate-800 mb-4" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-bold text-slate-700 mt-6 mb-2" {...props} />,
                      ul: ({node, ...props}) => <ul className="space-y-2 my-4 list-none pl-0" {...props} />,
                      li: ({node, ...props}) => (
                        <li className="flex items-start gap-3 text-slate-600" {...props}>
                          <ChevronRight className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
                          <span>{props.children}</span>
                        </li>
                      ),
                      p: ({node, ...props}) => <p className="text-slate-600 leading-relaxed mb-4" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />,
                    }}
                  >
                    {analysisResult}
                  </ReactMarkdown>
                </div>

                <div className="bg-slate-50 border-t border-slate-200 p-6">
                  <div className="flex items-start gap-3 text-amber-600 bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">
                      Este análisis es asistido por IA y tiene fines informativos. Requiere validación por un profesional médico colegiado.
                    </p>
                  </div>
                </div>
              </div>
              <div ref={scrollRef} />
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 mb-6"
          >
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium text-sm">{error}</p>
          </motion.div>
        )}
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 p-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            {/* Image Preview */}
            <AnimatePresence>
              {selectedImage && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full mb-4 left-0"
                >
                  <div className="relative group">
                    <img 
                      src={selectedImage.url} 
                      alt="Preview" 
                      className="w-24 h-24 object-cover rounded-2xl border-2 border-white shadow-xl"
                    />
                    <button 
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-2 bg-white border border-slate-200 rounded-3xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-slate-500 hover:bg-slate-100 rounded-2xl transition-colors"
              >
                <Camera className="w-6 h-6" />
              </button>
              
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Describa síntomas, suba una foto de herida o receta..."
                className="flex-1 bg-transparent border-none focus:ring-0 py-3 px-2 resize-none max-h-32 min-h-[48px] text-slate-700 placeholder:text-slate-400"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />

              <button 
                type="submit"
                disabled={isAnalyzing || (!inputText.trim() && !selectedImage)}
                className={cn(
                  "p-3 rounded-2xl transition-all shadow-lg",
                  isAnalyzing || (!inputText.trim() && !selectedImage)
                    ? "bg-slate-100 text-slate-400 shadow-none"
                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
                )}
              >
                {isAnalyzing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
              </button>
            </div>
          </form>
          <p className="text-[10px] text-center text-slate-400 mt-3 font-medium uppercase tracking-widest">
            Vimedical Health • Motor de Inteligencia Clínica
          </p>
        </div>
      </div>
    </div>
  );
}
