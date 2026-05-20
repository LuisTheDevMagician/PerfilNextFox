'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Paper, IconButton, Select, MenuItem, FormControl, InputLabel, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import StyleIcon from '@mui/icons-material/Style';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchOffIcon from '@mui/icons-material/SearchOff';

interface Carta {
  id: number; nome: string; tema_id: number; tema_nome: string;
  disciplina_nome: string; disciplina_id: number; dicas: string;
}
interface Tema { id: number; nome: string; disciplina_id: number; disciplina_nome: string; }
interface Disciplina { id: number; nome: string; }

const API = 'http://localhost:3001/api';

export function CartasTab() {
  const [cartas, setCartas] = useState<Carta[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Carta | null>(null);
  const [nome, setNome] = useState('');
  const [disciplinaId, setDisciplinaId] = useState<number>(0);
  const [temaId, setTemaId] = useState<number>(0);
  const [dicas, setDicas] = useState<string[]>(Array(10).fill(''));
  const [filterDisc, setFilterDisc] = useState<number>(0);
  const [filterTema, setFilterTema] = useState<number>(0);

  const temasFiltradosForm = temas.filter(t => t.disciplina_id === disciplinaId);
  const temasFiltradosFilter = filterDisc ? temas.filter(t => t.disciplina_id === filterDisc) : temas;

  const cartasFiltradas = useMemo(() => {
    return cartas.filter(c => {
      if (filterDisc && c.disciplina_id !== filterDisc) return false;
      if (filterTema && c.tema_id !== filterTema) return false;
      return true;
    });
  }, [cartas, filterDisc, filterTema]);

  const fetchData = async () => {
    const [cRes, tRes, dRes] = await Promise.all([
      fetch(`${API}/cartas`), fetch(`${API}/temas`), fetch(`${API}/disciplinas`),
    ]);
    const cartasData = await cRes.json();
    setCartas(cartasData.map((c: Carta) => ({
      ...c, dicas: typeof c.dicas === 'string' ? c.dicas : JSON.stringify(c.dicas || []),
    })));
    setTemas(await tRes.json());
    setDisciplinas(await dRes.json());
  };

  useEffect(() => { fetchData(); }, []);

  const handleAbrirEditor = (carta?: Carta) => {
    if (carta) {
      setEditando(carta); setNome(carta.nome); setDisciplinaId(carta.disciplina_id); setTemaId(carta.tema_id);
      try { const p = JSON.parse(carta.dicas); setDicas(Array.isArray(p) ? p : Array(10).fill('')); }
      catch { setDicas(Array(10).fill('')); }
    } else {
      setEditando(null); setNome(''); setDisciplinaId(disciplinas[0]?.id || 0); setTemaId(0); setDicas(Array(10).fill(''));
    }
    setOpen(true);
  };

  const handleDisciplinaChange = (id: number) => { setDisciplinaId(id); setTemaId(0); };

  const handleSalvar = async () => {
    if (!nome.trim()) { alert('Nome é obrigatório'); return; }
    if (!temaId) { alert('Tema é obrigatório'); return; }
    if (dicas.some(d => !d.trim())) { alert('Todas as 10 dicas devem ser preenchidas'); return; }
    const method = editando ? 'PUT' : 'POST';
    const url = editando ? `${API}/cartas/${editando.id}` : `${API}/cartas`;
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, temaId, dicas }) });
    if (res.ok) { setOpen(false); fetchData(); }
    else { const e = await res.json(); alert(e.error || 'Erro ao salvar'); }
  };

  const handleExcluir = async (id: number) => {
    if (confirm('Excluir esta carta?')) { await fetch(`${API}/cartas/${id}`, { method: 'DELETE' }); fetchData(); }
  };

  const handleFilterDisc = (id: number) => { setFilterDisc(id); setFilterTema(0); };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.06em', color: '#fff' }}>Cartas</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>
            {cartasFiltradas.length} {cartasFiltradas.length === cartas.length ? `de ${cartas.length}` : `filtrada${cartasFiltradas.length !== 1 ? 's' : ''} de ${cartas.length}`} {cartas.length === 1 ? 'carta' : 'cartas'}
          </p>
        </div>
        <Button
          variant="contained" startIcon={<AddIcon />} onClick={() => handleAbrirEditor()}
          sx={{ bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' }, fontFamily: 'var(--font-body)', fontWeight: 700, borderRadius: '10px', textTransform: 'none', fontSize: '0.85rem' }}
        >
          Nova Carta
        </Button>
      </div>

      {/* Filtros */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 24, padding: '14px 16px',
        background: 'rgba(14,14,26,0.8)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, alignItems: 'center',
      }}>
        <FilterListIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel sx={{ fontSize: '0.8rem' }}>Matéria</InputLabel>
          <Select value={filterDisc} label="Matéria" onChange={(e) => handleFilterDisc(Number(e.target.value))}
            sx={{ fontSize: '0.85rem' }}>
            <MenuItem value={0}>Todas as matérias</MenuItem>
            {disciplinas.map(d => <MenuItem key={d.id} value={d.id}>{d.nome}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }} disabled={!filterDisc}>
          <InputLabel sx={{ fontSize: '0.8rem' }}>Tema</InputLabel>
          <Select value={filterTema} label="Tema" onChange={(e) => setFilterTema(Number(e.target.value))}
            sx={{ fontSize: '0.85rem' }}>
            <MenuItem value={0}>Todos os temas</MenuItem>
            {temasFiltradosFilter.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}
          </Select>
        </FormControl>
        {(filterDisc || filterTema) ? (
          <button onClick={() => { setFilterDisc(0); setFilterTema(0); }} style={{
            marginLeft: 'auto', padding: '5px 12px', background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.45)',
            cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'var(--font-body)', fontWeight: 600,
          }}>
            Limpar filtros
          </button>
        ) : null}
      </div>

      {/* Grid de cartas */}
      {cartasFiltradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.18)' }}>
          <SearchOffIcon sx={{ fontSize: 52, display: 'block', margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            {cartas.length === 0 ? 'Nenhuma carta cadastrada ainda' : 'Nenhuma carta encontrada para os filtros selecionados'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
          {cartasFiltradas.map((c) => (
            <CartaCard key={c.id} carta={c}
              onEdit={() => handleAbrirEditor(c)} onDelete={() => handleExcluir(c.id)} />
          ))}
        </div>
      )}

      {/* Dialog editor */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(255,255,255,0.07)', pb: 2, fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
          {editando ? 'Editar' : 'Nova'} Carta
          <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.3)', mt: 0.5, fontFamily: 'var(--font-body)', letterSpacing: '0.03em' }}>
            Preencha todas as 10 dicas
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: '20px !important' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <TextField fullWidth label="Nome da carta" value={nome} onChange={(e) => setNome(e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Disciplina</InputLabel>
                <Select value={disciplinaId} label="Disciplina" onChange={(e) => handleDisciplinaChange(e.target.value as number)}>
                  {disciplinas.map(d => <MenuItem key={d.id} value={d.id}>{d.nome}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Tema</InputLabel>
                <Select value={temaId} label="Tema" onChange={(e) => setTemaId(e.target.value as number)} disabled={!disciplinaId}>
                  {temasFiltradosForm.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}
                </Select>
              </FormControl>
            </div>

            <div>
              <p style={{ margin: '0 0 10px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
                10 Dicas — da mais difícil para a mais fácil
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {dicas.map((dica, i) => (
                  <TextField key={i} fullWidth label={`Dica ${i + 1}`} value={dica} size="small"
                    onChange={(e) => { const n = [...dicas]; n[i] = e.target.value; setDicas(n); }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontWeight: 700, marginRight: 6, minWidth: 14 }}>
                            {i + 1}
                          </span>
                        ),
                      },
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.07)', px: 3, py: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ color: 'rgba(255,255,255,0.45)', textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={handleSalvar} variant="contained" sx={{ bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' }, textTransform: 'none', borderRadius: '8px' }}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

function CartaCard({ carta, onEdit, onDelete }: { carta: Carta; onEdit: () => void; onDelete: () => void }) {
  const dicasArr = useMemo(() => {
    try { const p = JSON.parse(carta.dicas); return Array.isArray(p) ? p : []; } catch { return []; }
  }, [carta.dicas]);

  const previewDica = dicasArr[0] || '—';

  return (
    <Paper sx={{
      background: 'rgba(14,14,26,0.97)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '14px', overflow: 'hidden',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      '&:hover': { borderColor: 'rgba(124,58,237,0.4)', boxShadow: '0 0 28px rgba(124,58,237,0.11)' },
    }}>
      <div style={{ height: 2, background: 'linear-gradient(90deg, #7C3AED 0%, transparent 100%)' }} />
      <div style={{ padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <StyleIcon sx={{ fontSize: 17, color: '#A78BFA' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            <IconButton size="small" onClick={onEdit}
              sx={{ color: 'rgba(255,255,255,0.28)', '&:hover': { color: '#C4B5FD', background: 'rgba(196,181,253,0.08)' } }}>
              <EditIcon sx={{ fontSize: 15 }} />
            </IconButton>
            <IconButton size="small" onClick={onDelete}
              sx={{ color: 'rgba(255,255,255,0.28)', '&:hover': { color: '#F87171', background: 'rgba(248,113,113,0.08)' } }}>
              <DeleteIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </div>
        </div>

        <p style={{ margin: '0 0 10px', fontSize: '0.95rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', letterSpacing: '0.02em', lineHeight: 1.3 }}>
          {carta.nome}
        </p>

        <p style={{ margin: '0 0 12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.32)', lineHeight: 1.45, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          "{previewDica}"
        </p>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', color: '#A78BFA', letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
            {carta.disciplina_nome}
          </span>
          <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
            {carta.tema_nome}
          </span>
        </div>
      </div>
    </Paper>
  );
}
