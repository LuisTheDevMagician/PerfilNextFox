'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Paper, IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SchoolIcon from '@mui/icons-material/School';
import TopicIcon from '@mui/icons-material/Topic';
import StyleIcon from '@mui/icons-material/Style';

interface Disciplina { id: number; nome: string; }
interface Tema { id: number; disciplina_id: number; }
interface Carta { id: number; disciplina_id: number; }

const API = 'http://localhost:3001/api';

export function DisciplinasTab() {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [cartas, setCartas] = useState<Carta[]>([]);
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Disciplina | null>(null);
  const [nome, setNome] = useState('');

  const fetchData = useCallback(async () => {
    const [dRes, tRes, cRes] = await Promise.all([
      fetch(`${API}/disciplinas`), fetch(`${API}/temas`), fetch(`${API}/cartas`),
    ]);
    setDisciplinas(await dRes.json());
    setTemas(await tRes.json());
    setCartas(await cRes.json());
  }, []);

  useEffect(() => { void (async () => { await fetchData(); })(); }, [fetchData]);

  const handleSalvar = async () => {
    if (!nome.trim()) return;
    const method = editando ? 'PUT' : 'POST';
    const url = editando ? `${API}/disciplinas/${editando.id}` : `${API}/disciplinas`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome }) });
    setOpen(false); setNome(''); setEditando(null); fetchData();
  };

  const handleExcluir = async (id: number) => {
    if (confirm('Excluir esta disciplina? Todos os temas e cartas vinculados serão removidos.')) {
      await fetch(`${API}/disciplinas/${id}`, { method: 'DELETE' }); fetchData();
    }
  };

  const countTemas = (id: number) => temas.filter(t => t.disciplina_id === id).length;
  const countCartas = (id: number) => cartas.filter(c => c.disciplina_id === id).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.06em', color: '#fff' }}>
            Matérias
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>
            {disciplinas.length} {disciplinas.length === 1 ? 'disciplina cadastrada' : 'disciplinas cadastradas'}
          </p>
        </div>
        <Button
          variant="contained" startIcon={<AddIcon />}
          onClick={() => { setEditando(null); setNome(''); setOpen(true); }}
          sx={{ bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' }, fontFamily: 'var(--font-body)', fontWeight: 700, borderRadius: '10px', textTransform: 'none', fontSize: '0.85rem' }}
        >
          Nova Matéria
        </Button>
      </div>

      {disciplinas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.18)' }}>
          <SchoolIcon sx={{ fontSize: 52, display: 'block', margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Nenhuma disciplina cadastrada ainda</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {disciplinas.map((d) => (
            <Paper
              key={d.id}
              sx={{
                background: 'rgba(14,14,26,0.97)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px',
                overflow: 'hidden',
                position: 'relative',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                '&:hover': {
                  borderColor: 'rgba(124,58,237,0.45)',
                  boxShadow: '0 0 28px rgba(124,58,237,0.13)',
                  '& .stripe': { opacity: 1 },
                },
              }}
            >
              <div className="stripe" style={{
                height: 3, background: 'linear-gradient(90deg, #7C3AED 0%, #A78BFA 100%)',
                opacity: 0.5, transition: 'opacity 0.2s',
              }} />
              <div style={{ padding: '18px 18px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 11,
                    background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.22)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <SchoolIcon sx={{ fontSize: 21, color: '#A78BFA' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <IconButton size="small" onClick={() => { setEditando(d); setNome(d.nome); setOpen(true); }}
                      sx={{ color: 'rgba(255,255,255,0.28)', '&:hover': { color: '#C4B5FD', background: 'rgba(196,181,253,0.08)' } }}>
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleExcluir(d.id)}
                      sx={{ color: 'rgba(255,255,255,0.28)', '&:hover': { color: '#F87171', background: 'rgba(248,113,113,0.08)' } }}>
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </div>
                </div>

                <p style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', letterSpacing: '0.02em', lineHeight: 1.3 }}>
                  {d.nome}
                </p>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14, display: 'flex', gap: 14 }}>
                  <Stat icon={<TopicIcon sx={{ fontSize: 14, color: '#C4B5FD' }} />} value={countTemas(d.id)} label="tema" color="#C4B5FD" />
                  <div style={{ width: 1, background: 'rgba(255,255,255,0.07)' }} />
                  <Stat icon={<StyleIcon sx={{ fontSize: 14, color: '#A78BFA' }} />} value={countCartas(d.id)} label="carta" color="#A78BFA" />
                </div>
              </div>
            </Paper>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ color: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(255,255,255,0.07)', pb: 2, fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
          {editando ? 'Editar' : 'Nova'} Disciplina
        </DialogTitle>
        <DialogContent sx={{ pt: '20px !important' }}>
          <TextField autoFocus fullWidth label="Nome da disciplina" value={nome}
            onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSalvar()} />
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.07)', px: 3, py: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ color: 'rgba(255,255,255,0.45)', textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={handleSalvar} variant="contained" sx={{ bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' }, textTransform: 'none', borderRadius: '8px' }}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

function Stat({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
        <p style={{ margin: '2px 0 0', fontSize: '0.62rem', color: 'rgba(255,255,255,0.32)', lineHeight: 1, letterSpacing: '0.03em' }}>
          {label}{value !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
