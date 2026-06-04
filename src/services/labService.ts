const LAB_API = (import.meta as any).env?.VITE_LAB_API_URL || 'https://lab-scraper-production.up.railway.app';

export interface PedidoLab {
  id: string; data: string; paciente: string; status: string; href?: string;
}

export interface ResultadoLab {
  ok: boolean; id: string;
  resultado: { linhas?: string[]; texto?: string; formato: 'tabela' | 'texto_livre' };
  pdfUrl?: string;
}

// Agora stateless: login + busca em uma única chamada
export async function labBuscarPaciente(params: {
  usuario: string;
  senha: string;
  tipo?: string;
  nome?: string;
  cpf?: string;
}) {
  const res = await fetch(`${LAB_API}/buscar-paciente`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usuario: params.usuario,
      senha: params.senha,
      tipo: params.tipo || 'Convenio',
      nome: params.nome,
      cpf: params.cpf,
    }),
  });
  return res.json() as Promise<{
    ok: boolean;
    pedidos: PedidoLab[];
    erro?: string;
    debug?: Record<string, any>;
  }>;
}

// Busca resultado de um pedido específico (stateless: faz login internamente)
export async function labGetResultado(params: {
  usuario: string;
  senha: string;
  pedidoId: string;
  tipo?: string;
}) {
  const res = await fetch(`${LAB_API}/resultado`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usuario: params.usuario,
      senha: params.senha,
      tipo: params.tipo || 'Convenio',
      pedidoId: params.pedidoId,
    }),
  });
  return res.json() as Promise<ResultadoLab>;
}

// Função principal: busca + resultados dos últimos pedidos do paciente
export async function buscarExamesPaciente(params: {
  usuario: string;
  senha: string;
  nomePaciente?: string;
  cpfPaciente?: string;
}) {
  const busca = await labBuscarPaciente({
    usuario: params.usuario,
    senha: params.senha,
    nome: params.nomePaciente,
    cpf: params.cpfPaciente,
  });

  if (!busca.ok) {
    return { ok: false, pedidos: [], resultados: [], erro: busca.erro || 'Erro ao buscar pedidos' };
  }

  if (!busca.pedidos || busca.pedidos.length === 0) {
    const debugMsg = busca.debug
      ? ` (página: ${busca.debug.url}, tabelas: ${busca.debug.tabelasEncontradas})`
      : '';
    return { ok: true, pedidos: [], resultados: [], erro: `Nenhum pedido encontrado para este paciente.${debugMsg}` };
  }

  // Busca os resultados dos últimos 5 pedidos (em paralelo, cada um faz login próprio)
  const resultados = await Promise.all(
    busca.pedidos.slice(0, 5).map(p =>
      labGetResultado({
        usuario: params.usuario,
        senha: params.senha,
        pedidoId: p.id,
      })
    )
  );

  return {
    ok: true,
    pedidos: busca.pedidos,
    resultados: resultados.filter(r => r.ok),
  };
}
