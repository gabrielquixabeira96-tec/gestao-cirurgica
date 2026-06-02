import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Loader2, FlaskConical, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Patient } from '../types';
import { cn } from '../lib/utils';
import { buscarExamesPaciente, PedidoLab } from '../services/labService';

interface ExamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onSave: (patientId: number, exams: { exam_pathology: string; exam_imaging: string; exam_others: string }) => Promise<void>;
}

export function ExamsModal({ isOpen, onClose, patient, onSave }: ExamsModalProps) {
  const [pathology, setPathology] = useState('');
  const [imaging, setImaging] = useState('');
  const [others, setOthers] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Estado do Lab Scraper
  const [showLabLogin, setShowLabLogin] = useState(false);
  const [labUsuario, setLabUsuario] = useState('');
  const [labSenha, setLabSenha] = useState('');
  const [labLoading, setLabLoading] = useState(false);
  const [labError, setLabError] = useState('');
  const [labPedidos, setLabPedidos] = useState<PedidoLab[]>([]);
  const [labResultados, setLabResultados] = useState<string[]>([]);
  const [showLabResults, setShowLabResults] = useState(false);

  useEffect(() => {
    if (patient && isOpen) {
      setPathology(patient.exam_pathology || '');
      setImaging(patient.exam_imaging || '');
      setOthers(patient.exam_others || '');
      // Reset lab state when opening
      setShowLabLogin(false);
      setLabError('');
      setLabPedidos([]);
      setLabResultados([]);
      setShowLabResults(false);
    }
  }, [patient, isOpen]);

  if (!isOpen || !patient) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(patient.id, {
        exam_pathology: pathology,
        exam_imaging: imaging,
        exam_others: others,
      });
      onClose();
    } catch (error) {
      console.error('Erro ao salvar exames:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBuscarLab = async () => {
    if (!labUsuario || !labSenha) {
      setLabError('Informe usuário e senha do laboratório.');
      return;
    }
    setLabLoading(true);
    setLabError('');
    setLabPedidos([]);
    setLabResultados([]);

    try {
      const resultado = await buscarExamesPaciente({
        usuario: labUsuario,
        senha: labSenha,
        nomePaciente: patient.name,
      });

      if (!resultado.ok) {
        setLabError(resultado.erro || 'Erro ao buscar exames.');
        return;
      }

      if (resultado.pedidos.length === 0) {
        setLabError('Nenhum pedido encontrado para este paciente no laboratório.');
        return;
      }

      setLabPedidos(resultado.pedidos);

      // Formatar resultados para texto
      const textos: string[] = [];
      for (const res of resultado.resultados) {
        if (res.resultado?.formato === 'tabela' && res.resultado.linhas) {
          textos.push(`--- Pedido ${res.id} ---\n` + res.resultado.linhas.join('\n'));
        } else if (res.resultado?.texto) {
          textos.push(`--- Pedido ${res.id} ---\n` + res.resultado.texto);
        }
      }

      if (textos.length > 0) {
        const textoFormatado = textos.join('\n\n');
        // Adicionar ao campo "Outros Exames" automaticamente
        setOthers(prev => prev ? prev + '\n\n' + textoFormatado : textoFormatado);
        setLabResultados(textos);
        setShowLabResults(true);
      }
    } catch (err) {
      setLabError('Erro de conexão com o servidor do laboratório. Tente novamente.');
    } finally {
      setLabLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
        >
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <div>
              <h2 className="text-xl font-bold text-black">Exames e Resultados</h2>
              <p className="text-sm text-neutral-500 mt-1">Paciente: <span className="font-semibold text-black">{patient.name}</span></p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Seção: Buscar no Laboratório */}
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
              <button
                onClick={() => setShowLabLogin(!showLabLogin)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-blue-800 text-sm uppercase tracking-wider">Buscar Exames no Clinilab</span>
                </div>
                {showLabLogin ? <ChevronUp className="w-4 h-4 text-blue-500" /> : <ChevronDown className="w-4 h-4 text-blue-500" />}
              </button>

              {showLabLogin && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-blue-600">
                    Informe suas credenciais do portal Clinilab. Os resultados serão importados automaticamente para o campo "Outros Exames" abaixo.
                  </p>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Usuário (CRM ou login)"
                      value={labUsuario}
                      onChange={e => setLabUsuario(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="password"
                      placeholder="Senha"
                      value={labSenha}
                      onChange={e => setLabSenha(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleBuscarLab()}
                      className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={handleBuscarLab}
                      disabled={labLoading}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                    >
                      {labLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                      {labLoading ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>

                  {labError && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {labError}
                    </div>
                  )}

                  {labPedidos.length > 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-bold text-green-800">{labPedidos.length} pedido(s) encontrado(s)</span>
                      </div>
                      <div className="space-y-1">
                        {labPedidos.map(p => (
                          <div key={p.id} className="text-xs text-green-700 flex gap-2">
                            <span className="font-mono">{p.data}</span>
                            <span>{p.paciente}</span>
                            <span className="ml-auto font-semibold">{p.status}</span>
                          </div>
                        ))}
                      </div>
                      {showLabResults && (
                        <p className="text-xs text-green-600 mt-2 font-medium">
                          ✅ Resultados importados para o campo "Outros Exames" abaixo.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-black uppercase tracking-wider">
                Anátomo Patológico
              </label>
              <textarea
                value={pathology}
                onChange={(e) => setPathology(e.target.value)}
                placeholder="Cole aqui o resultado do exame anátomo patológico..."
                className="w-full h-40 p-4 border border-neutral-300 focus:border-black focus:ring-1 focus:ring-black resize-none text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-black uppercase tracking-wider">
                Exames de Imagem
              </label>
              <textarea
                value={imaging}
                onChange={(e) => setImaging(e.target.value)}
                placeholder="Cole aqui os laudos de exames de imagem (TC, RM, USG, etc)..."
                className="w-full h-40 p-4 border border-neutral-300 focus:border-black focus:ring-1 focus:ring-black resize-none text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-black uppercase tracking-wider">
                Outros Exames
              </label>
              <textarea
                value={others}
                onChange={(e) => setOthers(e.target.value)}
                placeholder="Cole aqui outros resultados relevantes (Laboratoriais, etc)..."
                className="w-full h-40 p-4 border border-neutral-300 focus:border-black focus:ring-1 focus:ring-black resize-none text-sm"
              />
            </div>
          </div>

          <div className="p-6 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-bold text-black uppercase tracking-wider border border-black/20 hover:bg-neutral-100 transition-colors"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-black text-white text-sm font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
