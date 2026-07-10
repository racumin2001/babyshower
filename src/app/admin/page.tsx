'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface EventConfig {
  date: string;
  time: string;
  locationName: string;
  locationAddress: string;
  locationMapUrl: string;
  organizerEmails?: string;
}

interface RSVP {
  id: string;
  name: string;
  phone: string;
  email: string;
  guestsCount: number;
  isAttending: boolean;
  message: string;
  createdAt: string;
}

interface Gift {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
  reservedBy?: string | null;
  reservedAt?: string | null;
}

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Config & Data state
  const [config, setConfig] = useState<EventConfig>({
    date: '',
    time: '',
    locationName: '',
    locationAddress: '',
    locationMapUrl: '',
    organizerEmails: '',
  });
  
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // New gift form state
  const [newGiftName, setNewGiftName] = useState('');
  const [newGiftCategory, setNewGiftCategory] = useState('');

  // Status messages
  const [configStatus, setConfigStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [giftStatus, setGiftStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Check saved password on mount
  useEffect(() => {
    const savedPassword = localStorage.getItem('admin_password');
    if (savedPassword) {
      verifyPassword(savedPassword);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyPassword = async (pwd: string) => {
    setLoadingData(true);
    setLoginError('');
    try {
      // Fetch RSVPs to verify password
      const res = await fetch('/api/rsvps', {
        headers: { 'x-admin-password': pwd },
      });

      if (res.ok) {
        const rsvpData = await res.json();
        setRsvps(rsvpData);
        localStorage.setItem('admin_password', pwd);
        setPassword(pwd);
        setIsAuthenticated(true);

        // Fetch config & gifts
        const [configRes, giftsRes] = await Promise.all([
          fetch('/api/config'),
          fetch('/api/gifts')
        ]);
        
        if (configRes.ok) setConfig(await configRes.json());
        if (giftsRes.ok) setGifts(await giftsRes.json());
      } else {
        setLoginError('Contraseña incorrecta');
        localStorage.removeItem('admin_password');
      }
    } catch (err) {
      console.error(err);
      setLoginError('Error de conexión');
    } finally {
      setLoadingData(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    verifyPassword(password);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_password');
    setIsAuthenticated(false);
    setPassword('');
    setRsvps([]);
    setGifts([]);
  };

  // Save Event Configuration
  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigStatus(null);

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setConfigStatus({ type: 'success', message: 'Configuración guardada con éxito.' });
      } else {
        setConfigStatus({ type: 'error', message: 'No se pudo guardar la configuración.' });
      }
    } catch (err) {
      console.error(err);
      setConfigStatus({ type: 'error', message: 'Error de red al guardar la configuración.' });
    }
  };

  // Add Gift to Catalog
  const handleAddGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGiftName.trim() || !newGiftCategory.trim()) return;
    setGiftStatus(null);

    try {
      const res = await fetch('/api/gifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({
          action: 'add',
          name: newGiftName.trim(),
          category: newGiftCategory.trim(),
        }),
      });

      if (res.ok) {
        const addedGift = await res.json();
        setGifts(prev => [...prev, addedGift]);
        setNewGiftName('');
        setNewGiftCategory('');
        setGiftStatus({ type: 'success', message: `Regalo "${addedGift.name}" agregado con éxito.` });
      } else {
        setGiftStatus({ type: 'error', message: 'No se pudo agregar el regalo.' });
      }
    } catch (err) {
      console.error(err);
      setGiftStatus({ type: 'error', message: 'Error de red.' });
    }
  };

  // Delete Gift from Catalog
  const handleDeleteGift = async (giftId: string, giftName: string) => {
    if (!confirm(`¿Estás seguro de eliminar el regalo "${giftName}" del catálogo?`)) return;
    setGiftStatus(null);

    try {
      const res = await fetch('/api/gifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({
          action: 'delete',
          giftId,
        }),
      });

      if (res.ok) {
        setGifts(prev => prev.filter(g => g.id !== giftId));
        setGiftStatus({ type: 'success', message: 'Regalo eliminado con éxito.' });
      } else {
        setGiftStatus({ type: 'error', message: 'No se pudo eliminar el regalo.' });
      }
    } catch (err) {
      console.error(err);
      setGiftStatus({ type: 'error', message: 'Error de red.' });
    }
  };

  // Unreserve/Release a Gift
  const handleUnreserveGift = async (giftId: string, giftName: string) => {
    if (!confirm(`¿Estás seguro de liberar la reserva de "${giftName}"? Volverá a aparecer como Disponible.`)) return;
    setGiftStatus(null);

    try {
      const res = await fetch('/api/gifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({
          action: 'unreserve',
          giftId,
        }),
      });

      if (res.ok) {
        setGifts(prev => 
          prev.map(g => g.id === giftId ? { ...g, reservedBy: null, reservedAt: null } : g)
        );
        setGiftStatus({ type: 'success', message: 'Reserva liberada con éxito.' });
      } else {
        setGiftStatus({ type: 'error', message: 'No se pudo liberar la reserva.' });
      }
    } catch (err) {
      console.error(err);
      setGiftStatus({ type: 'error', message: 'Error de red.' });
    }
  };

  // Export RSVPs to CSV
  const exportRsvpsToCsv = () => {
    if (rsvps.length === 0) return;
    
    // CSV headers
    const headers = ['Nombre', 'Teléfono', 'Correo', 'Invitados', 'Asistirá', 'Mensaje', 'Fecha Registro'];
    
    // Format rows
    const rows = rsvps.map(r => [
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.phone.replace(/"/g, '""')}"`,
      `"${r.email.replace(/"/g, '""')}"`,
      r.guestsCount,
      r.isAttending ? 'SÍ' : 'NO',
      `"${r.message.replace(/"/g, '""')}"`,
      new Date(r.createdAt).toLocaleString('es-ES'),
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    // Create download link
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `invitados_babyshower_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Delete RSVP
  const handleDeleteRsvp = async (rsvpId: string, guestName: string) => {
    if (!confirm(`¿Estás seguro de eliminar a "${guestName}" de la lista de invitados?`)) return;

    try {
      const res = await fetch(`/api/rsvps?id=${rsvpId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-password': password,
        },
      });

      if (res.ok) {
        setRsvps(prev => prev.filter(r => r.id !== rsvpId));
      } else {
        alert('No se pudo eliminar al invitado.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al intentar eliminar.');
    }
  };

  // Password Prompt screen (Not logged in)
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-gradient)', padding: '24px' }}>
        <div className="glass-card" style={{ maxWidth: '420px', width: '100%', padding: '36px', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ background: 'var(--color-primary-light)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: 'var(--color-primary-dark)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Panel de Control</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Ingresa la contraseña de administrador</p>
          </div>

          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <input
                type="password"
                required
                placeholder="Contraseña"
                className="form-control text-center"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ textAlign: 'center' }}
                disabled={loadingData}
              />
            </div>

            {loginError && (
              <p style={{ color: 'var(--danger-color)', fontSize: '0.85rem', marginBottom: '16px', fontWeight: 500 }}>
                {loginError}
              </p>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loadingData}>
              {loadingData ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>

          <Link href="/" className="btn btn-secondary" style={{ width: '100%', marginTop: '12px' }}>
            Volver a la Web
          </Link>
        </div>
      </div>
    );
  }

  // Admin Panel Dashboard (Logged in)
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-gradient)' }}>
      {/* Admin Navbar */}
      <header className="header container" style={{ borderBottom: '1px solid rgba(229, 152, 155, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--color-primary-dark)', fontWeight: 600 }}>Panel Admin</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(114, 99, 98, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
            Sesión Activa
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/" className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
            Ver Web
          </Link>
          <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
            Salir
          </button>
        </div>
      </header>

      <main className="container" style={{ padding: '40px 24px', flex: '1' }}>
        
        {/* Row 1: Event Configuration */}
        <section style={{ marginBottom: '40px' }}>
          <div className="glass-card">
            <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Datos del Evento
            </h3>

            <form onSubmit={handleConfigSubmit}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Fecha del Evento</label>
                  <input
                    type="date"
                    className="form-control"
                    value={config.date}
                    onChange={e => setConfig({ ...config, date: e.target.value })}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Deja vacío si aún no está definida.
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label">Hora</label>
                  <input
                    type="text"
                    placeholder="Ej. 16:00 Hrs"
                    className="form-control"
                    value={config.time}
                    onChange={e => setConfig({ ...config, time: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nombre del Lugar</label>
                <input
                  type="text"
                  placeholder="Ej. Salón de Eventos Bella Vista o Mi Casa"
                  className="form-control"
                  value={config.locationName}
                  onChange={e => setConfig({ ...config, locationName: e.target.value })}
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Dirección</label>
                  <input
                    type="text"
                    placeholder="Ej. Av. Siempreviva 742, Santiago"
                    className="form-control"
                    value={config.locationAddress}
                    onChange={e => setConfig({ ...config, locationAddress: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Enlace Google Maps (URL)</label>
                  <input
                    type="url"
                    placeholder="Ej. https://maps.google.com/?q=..."
                    className="form-control"
                    value={config.locationMapUrl}
                    onChange={e => setConfig({ ...config, locationMapUrl: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Correos de los Organizadores</label>
                <input
                  type="text"
                  placeholder="Ej. mama@email.com, papa@email.com (separados por coma)"
                  className="form-control"
                  value={config.organizerEmails || ''}
                  onChange={e => setConfig({ ...config, organizerEmails: e.target.value })}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  A estos correos les llegará una notificación automática cuando haya un registro (RSVP) o reserva de regalo.
                </p>
              </div>

              {configStatus && (
                <div style={{ 
                  padding: '12px 16px', 
                  borderRadius: '12px', 
                  marginBottom: '20px',
                  fontSize: '0.9rem',
                  backgroundColor: configStatus.type === 'success' ? '#ebf6ed' : '#fdeded',
                  color: configStatus.type === 'success' ? '#2e7d32' : '#d32f2f',
                  border: `1px solid ${configStatus.type === 'success' ? '#c8e6c9' : '#ffcdd2'}`
                }}>
                  {configStatus.message}
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ minWidth: '180px' }}>
                Guardar Cambios
              </button>
            </form>
          </div>
        </section>

        {/* Row 2: RSVPs list */}
        <section style={{ marginBottom: '40px' }}>
          <div className="glass-card" style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Lista de Invitados ({rsvps.length})
              </h3>
              {rsvps.length > 0 && (
                <button onClick={exportRsvpsToCsv} className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: '0.85rem', display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Exportar Excel/CSV
                </button>
              )}
            </div>

            {rsvps.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>
                Aún no se han registrado invitados.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(114, 99, 98, 0.1)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px' }}>Nombre</th>
                    <th style={{ padding: '12px' }}>Asistencia</th>
                    <th style={{ padding: '12px' }}>Acompañantes</th>
                    <th style={{ padding: '12px' }}>Contacto</th>
                    <th style={{ padding: '12px' }}>Mensaje</th>
                    <th style={{ padding: '12px' }}>Fecha Registro</th>
                    <th style={{ padding: '12px' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {rsvps.map((rsvp, idx) => (
                    <tr key={rsvp.id} style={{ borderBottom: '1px solid rgba(114, 99, 98, 0.05)', backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.3)' : 'transparent' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{rsvp.name}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          padding: '3px 10px', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem', 
                          fontWeight: 600,
                          backgroundColor: rsvp.isAttending ? 'rgba(167, 201, 87, 0.12)' : 'rgba(214, 40, 40, 0.12)',
                          color: rsvp.isAttending ? '#386641' : '#b22222'
                        }}>
                          {rsvp.isAttending ? 'SÍ' : 'NO'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{rsvp.guestsCount}</td>
                      <td style={{ padding: '12px', fontSize: '0.85rem' }}>
                        <div>{rsvp.phone}</div>
                        <div style={{ color: 'var(--text-muted)' }}>{rsvp.email}</div>
                      </td>
                      <td style={{ padding: '12px', fontStyle: 'italic', maxWidth: '250px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {rsvp.message || '-'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(rsvp.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => handleDeleteRsvp(rsvp.id, rsvp.name)}
                          className="btn btn-outline"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--danger-color)', borderColor: 'rgba(214, 40, 40, 0.3)' }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Row 3: Gifts Management */}
        <section>
          <div className="glass-card">
            <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 12v10H4V12" />
                <path d="M2 7h20v5H2z" />
                <path d="M12 22V7" />
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
              </svg>
              Gestión de Regalos ({gifts.length})
            </h3>

            {/* Form to Add Gift */}
            <form onSubmit={handleAddGift} style={{ 
              display: 'flex', 
              gap: '16px', 
              flexWrap: 'wrap', 
              alignItems: 'flex-end', 
              padding: '20px', 
              background: 'rgba(114, 99, 98, 0.03)', 
              borderRadius: '16px', 
              marginBottom: '24px',
              border: '1px dashed rgba(114, 99, 98, 0.15)'
            }}>
              <div className="form-group" style={{ flex: '2', minWidth: '220px', marginBottom: 0 }}>
                <label className="form-label">Nombre del Regalo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Tina de baño"
                  className="form-control"
                  value={newGiftName}
                  onChange={e => setNewGiftName(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ flex: '1', minWidth: '180px', marginBottom: 0 }}>
                <label className="form-label">Categoría</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Higiene, Alimentación"
                  className="form-control"
                  value={newGiftCategory}
                  onChange={e => setNewGiftCategory(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ height: '45px', padding: '0 24px' }}>
                Agregar Regalo
              </button>
            </form>

            {giftStatus && (
              <div style={{ 
                padding: '12px 16px', 
                borderRadius: '12px', 
                marginBottom: '20px',
                fontSize: '0.9rem',
                backgroundColor: giftStatus.type === 'success' ? '#ebf6ed' : '#fdeded',
                color: giftStatus.type === 'success' ? '#2e7d32' : '#d32f2f',
                border: `1px solid ${giftStatus.type === 'success' ? '#c8e6c9' : '#ffcdd2'}`
              }}>
                {giftStatus.message}
              </div>
            )}

            {/* Gifts Table */}
            {gifts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>
                No hay regalos registrados en el catálogo.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(114, 99, 98, 0.1)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '12px' }}>Regalo</th>
                      <th style={{ padding: '12px' }}>Categoría</th>
                      <th style={{ padding: '12px' }}>Estado</th>
                      <th style={{ padding: '12px' }}>Reservado por</th>
                      <th style={{ padding: '12px' }}>Fecha Reserva</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gifts.map((gift, idx) => (
                      <tr key={gift.id} style={{ borderBottom: '1px solid rgba(114, 99, 98, 0.05)', backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.3)' : 'transparent' }}>
                        <td style={{ padding: '12px', fontWeight: 600 }}>{gift.name}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ fontSize: '0.8rem', background: 'rgba(114,99,98,0.08)', padding: '2px 8px', borderRadius: '10px' }}>
                            {gift.category}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ 
                            padding: '3px 10px', 
                            borderRadius: '12px', 
                            fontSize: '0.75rem', 
                            fontWeight: 600,
                            backgroundColor: gift.reservedBy ? 'rgba(229, 152, 155, 0.12)' : 'rgba(167, 201, 87, 0.12)',
                            color: gift.reservedBy ? 'var(--color-primary-dark)' : '#386641'
                          }}>
                            {gift.reservedBy ? 'RESERVADO' : 'DISPONIBLE'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontWeight: 500 }}>{gift.reservedBy || '-'}</td>
                        <td style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {gift.reservedAt ? new Date(gift.reservedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            {gift.reservedBy && (
                              <button 
                                onClick={() => handleUnreserveGift(gift.id, gift.name)}
                                className="btn btn-secondary" 
                                style={{ padding: '4px 10px', fontSize: '0.75rem', color: 'var(--color-primary-dark)', borderColor: 'var(--color-primary)' }}
                              >
                                Liberar
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteGift(gift.id, gift.name)}
                              className="btn btn-outline" 
                              style={{ padding: '4px 10px', fontSize: '0.75rem', color: 'var(--danger-color)', borderColor: 'rgba(214, 40, 40, 0.3)' }}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer style={{ background: 'white', borderTop: '1px solid rgba(229, 152, 155, 0.1)', padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Panel de Administración de Babyshower
        </p>
      </footer>
    </div>
  );
}
