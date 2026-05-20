'use client';

import { useState, useEffect } from 'react';
import {
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Paper, IconButton, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import TopicIcon from '@mui/icons-material/Topic';
import StyleIcon from '@mui/icons-material/Style';

interface Tema { id: number; nome: string; disciplina_id: number; disciplina_nome: string; }
interface Disciplina { id: number; nome: string; }
interface Carta { id: number; tema_id: number; }

const API = 'http://localhost:3001/api';

const DISC_COLORS = [
  { bg: 'rgba(124,58,237,0.18)', text: '#A78BFA', border: 'rgba(124,58,237,0.3)' },
  { bg: 'rgba(6,182,212,0.15)', text: '#67E8F9', border: 'rgba(6,182,212,0.3)' },
  { bg: 'rgba(245,158,11,0.15)', text: '#FCD34D', border: 'rgba(245,158,11,0.3)' },
  { bg: 'rgba(236,72,153,0.15)', text: '#F9A8D4', border: 'rgba(236,72,153,0.3)' },
  { bg: 'rgba(16,185,129,0.15)', text: '#6EE7B7', border: 'rgba(16,185,129,0.3)' },
  { bg: 'rgba(239,68,68,0.15)', text: '#FCA5A5', border: 'rgba(239,68,68,0.3)' },
];

export function TemasTab() {
  const [temas, setTemas] = useState<Tema[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [cartas, setCartas] = useState<Carta[]>([]);
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Tema | null>(null);
  const [nome, setNome] = useState('');
  const [disciplinaId, setDisciplinaId] = useState<number>(0);

  const fetchData = async () => {
    const [tRes, dRes, cRes] = await Promise.all([
      fetch(`${API}/temas`), fetch(`${API}/disciplinas`), fetch(`${API}/cartas`),
    ]);
    setTemas(await tRes.json());
    setDisciplinas(await dRes.json());
    setCartas(await cRes.json());
  };

  useEffect(() => { fetchData(); }, []);

  const handleSalvar = async () => {
    if (!nome.trim() || !disciplinaId) return;
    const method = editando ? 'PUT' : 'POST';
    const url = editando ? `${API}/temas/${editando.id}` : `${API}/temas`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, disciplinaId }) });
    setOpen(false); setNome(''); setDisciplinaId(0); setEditando(null); fetchData();
  };

  const handleExcluir = async (id: number) => {
    if (confirm('Excluir este tema? Todas as cartas vinculadas serão removidas.')) {
      await fetch(`${API}/temas/${id}`, { method: 'DELETE' }); fetchData();
    }
  };

  const abrirNovo = () => {
    setEditando(null); setNome(''); setDisciplinaId(disciplinas[0]?.id || 0); setOpen(true);
  };

  const countCartas = (id: number) => cartas.filter(c => c.tema_id === id).length;

  const discColorMap = Object.fromEntries(
    disciplinas.map((d, i) => [d.id, DISC_COLORS[i % DISC_COLORS.length]])
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.06em', color: '#fff' }}>
            Temas
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>
            {temas.length} {temas.length === 1 ? 'tema cadastrado' : 'temas cadastrados'}
          </p>
        </div>
        <Button
          variant="contained" startIcon={<AddIcon />} onClick={abrirNovo}
          sx={{ bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' }, fontFamily: 'var(--font-body)', fontWeight: 700, borderRadius: '10px', textTransform: 'none', fontSize: '0.85rem' }}
        >
          Novo Tema
        </Button>
      </div>

      {temas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.18)' }}>
          <TopicIcon sx={{ fontSize: 52, display: 'block', margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Nenhum tema cadastrado ainda</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
          {temas.map((t) => {
            const discColor = discColorMap[t.disciplina_id] || DISC_COLORS[0];
            const nCartas = countCartas(t.id);
            return (
              <Paper key={t.id} sx={{
                background: 'rgba(14,14,26,0.97)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px', overflow: 'hidden',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                '&:hover': { borderColor: 'rgba(124,58,237,0.4)', boxShadow: '0 0 28px rgba(124,58,237,0.11)' },
              }}>
                <div style={{ height: 3, background: `linear-gradient(90deg, ${discColor.text}88, ${discColor.text}44)` }} />
                <div style={{ padding: '18px 18px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em',
                      padding: '4px 10px', borderRadius: 20,
                      background: discColor.bg, border: `1px solid ${discColor.border}`, color: discColor.text,
                      textTransform: 'uppercase', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {t.disciplina_nome}
                    </span>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <IconButton size="small" onClick={() => { setEditando(t); setNome(t.nome); setDisciplinaId(t.disciplina_id); setOpen(true); }}
                        sx={{ color: 'rgba(255,255,255,0.28)', '&:hover': { color: '#C4B5FD', background: 'rgba(196,181,253,0.08)' } }}>
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleExcluir(t.id)}
                        sx={{ color: 'rgba(255,255,255,0.28)', '&:hover': { color: '#F87171', background: 'rgba(248,113,113,0.08)' } }}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </div>
                  </div>

                  <p style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', letterSpacing: '0.02em', lineHeight: 1.3 }}>
                    {t.nome}
                  </p>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(167,139,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <StyleIcon sx={{ fontSize: 14, color: '#A78BFA' }} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#A78BFA', lineHeight: 1 }}>{nCartas}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.62rem', color: 'rgba(255,255,255,0.32)', lineHeight: 1, letterSpacing: '0.03em' }}>
                        carta{nCartas !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </Paper>
            );
          })}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ color: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(255,255,255,0.07)', pb: 2, fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
          {editando ? 'Editar' : 'Novo'} Tema
        </DialogTitle>
        <DialogContent sx={{ pt: '20px !important' }}>
          <TextField autoFocus fullWidth label="Nome do tema" value={nome}
            onChange={(e) => setNome(e.target.value)} sx={{ mb: 2 }}
            onKeyDown={(e) => e.key === 'Enter' && handleSalvar()} />
          <FormControl fullWidth>
            <InputLabel>Disciplina</InputLabel>
            <Select value={disciplinaId} label="Disciplina" onChange={(e) => setDisciplinaId(e.target.value as number)}>
              {disciplinas.map((d) => <MenuItem key={d.id} value={d.id}>{d.nome}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.07)', px: 3, py: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ color: 'rgba(255,255,255,0.45)', textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={handleSalvar} variant="contained" sx={{ bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' }, textTransform: 'none', borderRadius: '8px' }}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
