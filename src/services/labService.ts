const LAB_API = (import.meta as any).env?.VITE_LAB_API_URL || 'https://lab-scraper-production.up.railway.app';

export interface PedidoLab {
  id: string; data: string; paciente: string; status: string; href?: string;
}

export interface ResultadoLab {
  ok: boolean; id: string;
  resultado: { linhas?: string[]; texto?: string; formato: 'tabela' | 'texto_livre' };
  pdfUrl?: string;
}

export async function labLogin(usuario: string, senha: string, tipo = 'Médico / Solicitante') {
  const res = await fetch(`${LAB_API}/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, senha, tipo }),
  });
  return res.json() as Promise<{ ok: boolean; erro?: string }>;
}

export async function labBuscarPaciente(filtro: { nome?: string; cpf?: string }) {
  const res = await fetch(`${LAB_API}/buscar-paciente`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filtro),
  });
  return res.json() as Promise<{ ok: boolean; pedidos: PedidoLab[]; erro?: string }>;
}

export async function labGetResultado(id: string) {
  const res = await fetch(`${LAB_API}/resultado/${id}`);
  return res.json() as Promise<ResultadoLab>;
}

export async function buscarExamesPaciente(params: {
  usuario: string; senha: string; nomePaciente?: string; cpfPaciente?: string;
}) {
  const login = await labLogin(params.usuario, params.senha);
  if (!login.ok) return { ok: false, pedidos: [], resultados: [], erro: login.erro };

  const busca = await labBuscarPaciente({ nome: params.nomePaciente, cpf: params.cpfPaciente });
  if (!busca.ok || busca.pedidos.length === 0)
    return { ok: true, pedidos: [], resultados: [], erro: 'Nenhum pedido encontrado' };

  const resultados = await Promise.all(busca.pedidos.slice(0, 5).map(p => labGetResultado(p.id)));
  return { ok: true, pedidos: busca.pedidos, resultados: resultados.filter(r => r.ok) };
}
