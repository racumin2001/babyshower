'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface EventConfig {
  date: string;
  time: string;
  locationName: string;
  locationAddress: string;
  locationMapUrl: string;
}

interface Gift {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
  reservedBy?: string | null;
  reservedAt?: string | null;
}

export default function Home() {
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'reserved'>('all');

  // RSVP Form state
  const [rsvpName, setRsvpName] = useState('');
  const [rsvpPhone, setRsvpPhone] = useState('');
  const [rsvpEmail, setRsvpEmail] = useState('');
  const [rsvpGuests, setRsvpGuests] = useState(1);
  const [rsvpAttending, setRsvpAttending] = useState(true);
  const [rsvpMessage, setRsvpMessage] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [submittingRsvp, setSubmittingRsvp] = useState(false);

  // Reservation Modal state
  const [reservingGift, setReservingGift] = useState<Gift | null>(null);
  const [reserveGuestName, setReserveGuestName] = useState('');
  const [reserveGuestEmail, setReserveGuestEmail] = useState('');
  const [reserveStatus, setReserveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [submittingReservation, setSubmittingReservation] = useState(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  // Tab control
  const [activeGiftTab, setActiveGiftTab] = useState<'surprise' | 'diapers' | 'catalog'>('surprise');

  // Surprise Gift states
  const [surpriseModalOpen, setSurpriseModalOpen] = useState(false);
  const [surpriseGiftName, setSurpriseGiftName] = useState('');
  const [surpriseGuestName, setSurpriseGuestName] = useState('');
  const [surpriseGuestEmail, setSurpriseGuestEmail] = useState('');
  const [submittingSurprise, setSubmittingSurprise] = useState(false);
  const [surpriseStatus, setSurpriseStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Guest Management states
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [lookupName, setLookupName] = useState('');
  const [myReservations, setMyReservations] = useState<Gift[]>([]);
  const [lookupPerformed, setLookupPerformed] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [releaseStatus, setReleaseStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      try {
        const [configRes, giftsRes] = await Promise.all([
          fetch('/api/config'),
          fetch('/api/gifts')
        ]);
        
        if (configRes.ok && giftsRes.ok) {
          const configData = await configRes.json();
          const giftsData = await giftsRes.json();
          setConfig(configData);
          setGifts(giftsData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Countdown effect
  useEffect(() => {
    if (!config?.date) {
      setTimeLeft(null);
      return;
    }

    const targetDate = new Date(config.date);
    if (isNaN(targetDate.getTime())) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
      } else {
        const d = Math.floor(difference / (1000 * 60 * 60 * 24));
        const h = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const m = Math.floor((difference / 1000 / 60) % 60);
        const s = Math.floor((difference / 1000) % 60);
        setTimeLeft({ days: d, hours: h, minutes: m, seconds: s });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [config?.date]);

  // Handle RSVP Submit
  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpName.trim()) return;

    setSubmittingRsvp(true);
    setRsvpStatus(null);

    try {
      const res = await fetch('/api/rsvps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rsvpName,
          phone: rsvpPhone,
          email: rsvpEmail,
          guestsCount: rsvpGuests,
          isAttending: rsvpAttending,
          message: rsvpMessage,
        }),
      });

      if (res.ok) {
        setRsvpStatus({
          type: 'success',
          message: rsvpAttending 
            ? '¡Gracias! Tu asistencia ha sido registrada con éxito.' 
            : 'Gracias por avisarnos. Registramos tu respuesta.',
        });
        // Clear form
        setRsvpName('');
        setRsvpPhone('');
        setRsvpEmail('');
        setRsvpGuests(1);
        setRsvpMessage('');
      } else {
        throw new Error('Response error');
      }
    } catch (err) {
      console.error(err);
      setRsvpStatus({ type: 'error', message: 'Hubo un error al registrar tu asistencia. Por favor, intenta de nuevo.' });
    } finally {
      setSubmittingRsvp(false);
    }
  };

  // Handle Gift Reservation Submit
  const handleReserveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservingGift || !reserveGuestName.trim() || !reserveGuestEmail.trim()) return;

    setSubmittingReservation(true);
    setReserveStatus(null);

    try {
      const res = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reserve',
          giftId: reservingGift.id,
          reservedBy: reserveGuestName.trim(),
          reservedEmail: reserveGuestEmail.trim(),
        }),
      });

      if (res.ok) {
        setReserveStatus({
          type: 'success',
          message: `¡Muchas gracias! Reservamos "${reservingGift.name}". Te enviamos una confirmación por correo.`,
        });
        // Update local gifts state
        setGifts(prevGifts => 
          prevGifts.map(g => 
            g.id === reservingGift.id 
              ? { ...g, reservedBy: reserveGuestName.trim(), reservedEmail: reserveGuestEmail.trim(), reservedAt: new Date().toISOString() } 
              : g
          )
        );
        setTimeout(() => {
          setReservingGift(null);
          setReserveGuestName('');
          setReserveGuestEmail('');
          setReserveStatus(null);
        }, 2500);
      } else {
        const errorData = await res.json();
        setReserveStatus({
          type: 'error',
          message: errorData.error || 'Este regalo ya ha sido reservado por alguien más. Elige otro por favor.',
        });
      }
    } catch (err) {
      console.error(err);
      setReserveStatus({ type: 'error', message: 'Ocurrió un error. Intenta reservar nuevamente.' });
    } finally {
      setSubmittingReservation(false);
    }
  };

  // Handle Surprise Gift submit
  const handleSurpriseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surpriseGuestName.trim() || !surpriseGiftName.trim() || !surpriseGuestEmail.trim()) return;

    setSubmittingSurprise(true);
    setSurpriseStatus(null);

    try {
      const res = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reserve_surprise',
          name: surpriseGiftName.trim(),
          reservedBy: surpriseGuestName.trim(),
          reservedEmail: surpriseGuestEmail.trim(),
        }),
      });

      if (res.ok) {
        setSurpriseStatus({
          type: 'success',
          message: '¡Muchas gracias! Registramos tu regalo sorpresa con éxito y te enviamos una confirmación por correo.',
        });
        
        // Re-fetch gifts to get the new custom surprise gift
        const giftsRes = await fetch('/api/gifts');
        if (giftsRes.ok) {
          setGifts(await giftsRes.json());
        }

        setTimeout(() => {
          setSurpriseModalOpen(false);
          setSurpriseGiftName('');
          setSurpriseGuestName('');
          setSurpriseGuestEmail('');
          setSurpriseStatus(null);
        }, 2500);
      } else {
        throw new Error('Response error');
      }
    } catch (err) {
      console.error(err);
      setSurpriseStatus({ type: 'error', message: 'Hubo un error al registrar el regalo sorpresa. Por favor intenta de nuevo.' });
    } finally {
      setSubmittingSurprise(false);
    }
  };

  // Handle Lookup Reservations
  const handleLookupReservations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupName.trim()) return;

    setLookupLoading(true);
    setLookupPerformed(false);
    setReleaseStatus(null);

    try {
      // Re-fetch gifts to get latest status
      const giftsRes = await fetch('/api/gifts');
      if (giftsRes.ok) {
        const latestGifts: Gift[] = await giftsRes.json();
        setGifts(latestGifts);
        
        // Filter those reserved by name
        const nameQuery = lookupName.trim().toLowerCase();
        const found = latestGifts.filter(g => g.reservedBy?.toLowerCase().trim() === nameQuery);
        setMyReservations(found);
        setLookupPerformed(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLookupLoading(false);
    }
  };

  // Handle Release Reservation
  const handleReleaseReservation = async (giftId: string, giftName: string) => {
    if (!confirm(`¿Estás seguro de liberar tu reserva para "${giftName}"? Volverá a estar disponible para otros invitados.`)) return;

    try {
      const res = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unreserve_by_guest',
          giftId,
          guestName: lookupName.trim(),
        }),
      });

      if (res.ok) {
        setReleaseStatus({
          type: 'success',
          message: `La reserva de "${giftName}" ha sido cancelada con éxito.`,
        });

        // Update local state: remove or unreserve in local list
        setGifts(prev => {
          const gift = prev.find(g => g.id === giftId);
          if (gift?.category === 'Sorpresa') {
            return prev.filter(g => g.id !== giftId);
          }
          return prev.map(g => g.id === giftId ? { ...g, reservedBy: null, reservedAt: null } : g);
        });

        // Update lookup list
        setMyReservations(prev => prev.filter(g => g.id !== giftId));
      } else {
        const errorData = await res.json();
        setReleaseStatus({
          type: 'error',
          message: errorData.error || 'No se pudo liberar la reserva. Verifica el nombre.',
        });
      }
    } catch (err) {
      console.error(err);
      setReleaseStatus({ type: 'error', message: 'Error de conexión.' });
    }
  };

  // Get categories list (excluding Pañales)
  const categories = ['Todos', ...Array.from(new Set(gifts.filter(g => g.category !== 'Pañales').map(g => g.category)))];

  // Filter gifts logic (excluding Pañales)
  const filteredGifts = gifts.filter(gift => {
    if (gift.category === 'Pañales') return false;
    const matchesSearch = gift.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          gift.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || gift.category === selectedCategory;
    const matchesStatus = statusFilter === 'all' ||
                          (statusFilter === 'available' && !gift.reservedBy) ||
                          (statusFilter === 'reserved' && gift.reservedBy);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Diaper tracker data
  const diaperData = [
    {
      code: 'rn',
      title: 'Talla RN (Recién Nacido)',
      description: 'RN: Vienen entre 34 y 40 pañales por paquete.',
      total: 8,
      prefix: 'diaper_rn_',
    },
    {
      code: 'p',
      title: 'Talla P (Pequeño)',
      description: 'Talla P: Vienen entre 50 y 56 pañales por paquete.',
      total: 12,
      prefix: 'diaper_p_',
    },
    {
      code: 'm',
      title: 'Talla M (Mediano)',
      description: 'Talla M: Vienen entre 68 y 72 pañales por paquete.',
      total: 12,
      prefix: 'diaper_m_',
    },
    {
      code: 'g',
      title: 'Talla G (Grande)',
      description: 'Talla G: Vienen entre 56 y 60 pañales por paquete.',
      total: 15,
      prefix: 'diaper_g_',
    },
    {
      code: 'wipes',
      title: 'Toallitas Húmedas',
      description: 'Toallitas húmedas: Formato de cajas Multipack (x12 paquetes).',
      total: 12,
      prefix: 'diaper_wipes_',
    },
  ];

  // Helper to get diaper stats
  const getDiaperStats = (prefix: string, total: number) => {
    const matchingGifts = gifts.filter(g => g.id.startsWith(prefix));
    const reservedGifts = matchingGifts.filter(g => g.reservedBy);
    const reservedNames = reservedGifts.map(g => g.reservedBy).filter(Boolean) as string[];

    const nameCounts: { [name: string]: number } = {};
    reservedNames.forEach(name => {
      nameCounts[name] = (nameCounts[name] || 0) + 1;
    });

    const formattedNames = Object.entries(nameCounts)
      .map(([name, count]) => `${name}${count > 1 ? ` (${count})` : ''}`)
      .join(', ');

    return {
      reservedCount: reservedGifts.length,
      percentage: Math.min(100, Math.round((reservedGifts.length / total) * 100)),
      formattedNames,
      firstAvailableGift: matchingGifts.find(g => !g.reservedBy) || null,
    };
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-gradient)' }}>
      {/* Header bar */}
      <header className="header container" style={{ borderBottom: '1px solid rgba(229, 152, 155, 0.1)' }}>
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--color-primary)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          <span style={{ fontWeight: 600 }}>Baby Shower</span>
        </div>
        <Link href="/admin" className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
          Panel Admin
        </Link>
      </header>

      {/* Hero Section */}
      <section className="container animate-fade-in" style={{ padding: '60px 24px 40px 24px' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '40px',
          flexWrap: 'wrap-reverse'
        }}>
          {/* Left Column: Text Content */}
          <div style={{ flex: '1.2', minWidth: '300px' }}>
            <span style={{ 
              fontSize: '0.85rem', 
              fontWeight: 600, 
              letterSpacing: '0.2em', 
              textTransform: 'uppercase', 
              color: 'var(--color-primary-dark)',
              display: 'block',
              marginBottom: '12px'
            }}>
              ¡Estamos de fiesta!
            </span>
            <h1 style={{ fontSize: '3.5rem', lineHeight: '1.1', color: 'var(--text-main)', marginBottom: '16px', fontFamily: 'var(--font-serif)' }}>
              Baby Shower
            </h1>
            <p style={{ 
              fontFamily: 'var(--font-serif)', 
              fontSize: '1.4rem', 
              color: 'var(--text-muted)', 
              marginBottom: '36px',
              fontStyle: 'italic',
              lineHeight: '1.5'
            }}>
              Esperando con amor y alegría la llegada de nuestro bebé
            </p>

            {/* Countdown component */}
            {loading ? (
              <div style={{ minHeight: '100px', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '30px', height: '30px', border: '3px solid var(--color-primary-light)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : timeLeft ? (
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', margin: '20px 0 40px 0', maxWidth: '500px' }}>
                {[
                  { label: 'Días', val: timeLeft.days },
                  { label: 'Horas', val: timeLeft.hours },
                  { label: 'Minutos', val: timeLeft.minutes },
                  { label: 'Segundos', val: timeLeft.seconds },
                ].map((item, idx) => (
                  <div key={idx} className="glass-card" style={{ flex: '1', minWidth: '80px', padding: '16px 12px', borderRadius: '16px', background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(229,152,155,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-primary-dark)', lineHeight: '1.1' }}>{item.val}</div>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginTop: '4px' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card" style={{ maxWidth: '500px', margin: '0 0 40px 0', padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.7)', border: '1px dashed var(--color-primary)', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.95rem' }}>
                  ✨ La fecha y hora exactas se confirmarán muy pronto. ¡Mantente atento! ✨
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Illustration Card */}
          <div style={{ flex: '0.8', display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: '280px' }}>
            <div 
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '360px',
                aspectRatio: '1',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(229, 152, 155, 0.22)',
                border: '8px solid white',
                background: 'white',
                transform: 'rotate(-2deg)',
                transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'rotate(2deg) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 30px 60px rgba(229, 152, 155, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'rotate(-2deg) scale(1)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(229, 152, 155, 0.22)';
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/cute_baby_animals.png" 
                alt="Bebé oso y león de peluche" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Event Details Section */}
      {!loading && config && (config.date || config.locationName) && (
        <section className="container" style={{ marginBottom: '60px' }}>
          <div className="grid-2">
            {config.date && (
              <div className="glass-card" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div style={{ background: 'var(--color-primary-light)', padding: '12px', borderRadius: '12px', color: 'var(--color-primary-dark)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '6px' }}>Fecha y Hora</h3>
                  <p style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                    {new Date(config.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                  </p>
                  {config.time && <p style={{ color: 'var(--text-muted)' }}>Hora: {config.time}</p>}
                </div>
              </div>
            )}

            {config.locationName && (
              <div className="glass-card" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div style={{ background: 'var(--color-primary-light)', padding: '12px', borderRadius: '12px', color: 'var(--color-primary-dark)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '6px' }}>Ubicación</h3>
                  <p style={{ color: 'var(--text-main)', fontWeight: 500 }}>{config.locationName}</p>
                  {config.locationAddress && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>{config.locationAddress}</p>}
                  {config.locationMapUrl && (
                    <a 
                      href={config.locationMapUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'inline-flex', gap: '6px', alignItems: 'center' }}
                    >
                      Ver en Google Maps
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* RSVP Section */}
      <section className="container" style={{ marginBottom: '60px' }}>
        <div className="glass-card" style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Confirmar Asistencia</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Por favor dinos si podrás acompañarnos en este día tan especial
            </p>
          </div>

          <form onSubmit={handleRsvpSubmit}>
            <div className="form-group">
              <label className="form-label">Nombre Completo</label>
              <input
                type="text"
                required
                placeholder="Ej. María López"
                className="form-control"
                value={rsvpName}
                onChange={e => setRsvpName(e.target.value)}
              />
            </div>

            <div className="grid-2" style={{ gap: '20px', marginBottom: '20px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Teléfono</label>
                <input
                  type="tel"
                  placeholder="Ej. +56 9 1234 5678"
                  className="form-control"
                  value={rsvpPhone}
                  onChange={e => setRsvpPhone(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="Ej. maria@correo.com"
                  className="form-control"
                  value={rsvpEmail}
                  onChange={e => setRsvpEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2" style={{ gap: '20px', alignItems: 'center', marginBottom: '24px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Acompañantes (Incluyéndote)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="form-control"
                  value={rsvpGuests}
                  onChange={e => setRsvpGuests(parseInt(e.target.value) || 1)}
                />
              </div>
              <div style={{ display: 'flex', gap: '24px', marginTop: '20px' }}>
                <label className="form-checkbox">
                  <input
                    type="radio"
                    name="attending"
                    checked={rsvpAttending === true}
                    onChange={() => setRsvpAttending(true)}
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <span>Sí asistiré</span>
                </label>
                <label className="form-checkbox">
                  <input
                    type="radio"
                    name="attending"
                    checked={rsvpAttending === false}
                    onChange={() => setRsvpAttending(false)}
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <span>No podré asistir</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mensaje para los padres (Opcional)</label>
              <textarea
                placeholder="Escribe un bonito deseo o nota aquí..."
                className="form-control"
                rows={3}
                value={rsvpMessage}
                onChange={e => setRsvpMessage(e.target.value)}
                style={{ resize: 'none' }}
              />
            </div>

            {rsvpStatus && (
              <div style={{ 
                padding: '12px 16px', 
                borderRadius: '12px', 
                marginBottom: '20px',
                fontSize: '0.9rem',
                backgroundColor: rsvpStatus.type === 'success' ? '#ebf6ed' : '#fdeded',
                color: rsvpStatus.type === 'success' ? '#2e7d32' : '#d32f2f',
                border: `1px solid ${rsvpStatus.type === 'success' ? '#c8e6c9' : '#ffcdd2'}`
              }}>
                {rsvpStatus.message}
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              <button type="submit" disabled={submittingRsvp} className="btn btn-primary" style={{ width: '220px' }}>
                {submittingRsvp ? 'Registrando...' : 'Confirmar Asistencia'}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Gift System Section */}
      <section className="container" style={{ marginBottom: '80px', flex: '1' }}>
        {/* Header and description */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span style={{ 
            fontSize: '0.85rem', 
            fontWeight: 600, 
            letterSpacing: '0.2em', 
            textTransform: 'uppercase', 
            color: 'var(--color-primary-dark)',
            display: 'block',
            marginBottom: '8px'
          }}>
            Mesa de Regalos
          </span>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '12px' }}>Lista de Regalos y Pañales</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '700px', margin: '0 auto' }}>
            Tu presencia es nuestro mayor regalo. Sin embargo, si deseas tener un detalle con nosotros, te compartimos algunas sugerencias y un control de pañales para organizarnos mejor.
          </p>
        </div>

        {/* Tabs navigation */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '40px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveGiftTab('surprise')}
            className={`btn ${activeGiftTab === 'surprise' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '12px 24px', borderRadius: '30px', flex: '1', minWidth: '220px', maxWidth: '280px' }}
          >
            🎁 Opción 1: Regalo Sorpresa
          </button>
          <button
            onClick={() => setActiveGiftTab('diapers')}
            className={`btn ${activeGiftTab === 'diapers' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '12px 24px', borderRadius: '30px', flex: '1', minWidth: '220px', maxWidth: '280px' }}
          >
            👶 Opción 2: Pañales y Toallitas
          </button>
          <button
            onClick={() => setActiveGiftTab('catalog')}
            className={`btn ${activeGiftTab === 'catalog' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '12px 24px', borderRadius: '30px', flex: '1', minWidth: '220px', maxWidth: '280px' }}
          >
            🧸 Opción 3: Ideas de Regalos
          </button>
        </div>

        {/* 1. Surprise Gift Tab (Opción 1) */}
        {activeGiftTab === 'surprise' && (
          <div className="glass-card" style={{ 
            background: 'rgba(255, 255, 255, 0.95)', 
            border: '2px solid var(--color-primary-light)', 
            padding: '40px 32px', 
            borderRadius: '24px', 
            textAlign: 'center',
            boxShadow: '0 12px 30px rgba(229, 152, 155, 0.1)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎁</div>
            <h3 style={{ fontSize: '1.6rem', marginBottom: '12px', color: 'var(--color-primary-dark)' }}>¿Prefieres traer un Regalo Sorpresa?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto 28px auto', lineHeight: '1.7' }}>
              Nuestras listas son solo sugerencias e ideas de cosas que nos podrían servir para la llegada del bebé. Si tienes en mente otro detalle especial o prefieres traer un regalo sorpresa de tu propia elección, ¡nos encantará! Regístralo haciendo clic aquí abajo.
            </p>
            <button 
              onClick={() => setSurpriseModalOpen(true)}
              className="btn btn-primary"
              style={{ padding: '12px 32px', fontSize: '0.95rem' }}
            >
              Registrar Regalo Sorpresa
            </button>
          </div>
        )}

        {/* 2. Diapers Tab (El Pañalómetro - Opción 2) */}
        {activeGiftTab === 'diapers' && (
          <div className="glass-card" style={{ padding: '28px', borderRadius: '24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h3 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>El Pañalómetro</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '550px', margin: '0 auto' }}>
                Los pañales son esenciales. Queremos reunir formatos grandes (Hiperpack / Mega). Selecciona una talla y regala un paquete para ayudarnos a completar la meta.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {diaperData.map(diaper => {
                const stats = getDiaperStats(diaper.prefix, diaper.total);
                const isCompleted = stats.reservedCount >= diaper.total;
                
                return (
                  <div key={diaper.code} style={{ 
                    padding: '20px', 
                    borderRadius: '16px', 
                    background: 'rgba(255,255,255,0.4)', 
                    border: '1px solid rgba(229,152,155,0.1)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>{diaper.title}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{diaper.description}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                          {stats.reservedCount} de {diaper.total} paquetes
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ 
                      width: '100%', 
                      height: '10px', 
                      borderRadius: '5px', 
                      background: 'rgba(114, 99, 98, 0.1)', 
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        width: `${stats.percentage}%`, 
                        height: '100%', 
                        background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)', 
                        borderRadius: '5px', 
                        transition: 'width 0.5s ease-in-out' 
                      }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginTop: '4px' }}>
                      <div style={{ flex: '1', minWidth: '200px' }}>
                        {stats.formattedNames ? (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            ❤️ Reservado por: <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{stats.formattedNames}</span>
                          </p>
                        ) : (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Aún no hay reservas para esta talla.
                          </p>
                        )}
                      </div>
                      <div>
                        {isCompleted ? (
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            padding: '6px 14px', 
                            borderRadius: '20px', 
                            backgroundColor: 'rgba(167, 201, 87, 0.12)', 
                            color: '#386641', 
                            fontSize: '0.8rem', 
                            fontWeight: 600 
                          }}>
                            ¡Completado! 🎉
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              if (stats.firstAvailableGift) {
                                setReservingGift(stats.firstAvailableGift);
                              }
                            }}
                            className="btn btn-primary"
                            style={{ padding: '8px 18px', fontSize: '0.8rem' }}
                          >
                            Regalar Paquete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Catalog Tab (Otros Regalos / Sugerencias) */}
        {activeGiftTab === 'catalog' && (
          <div>
            {/* Search & Filters */}
            <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', marginBottom: '30px' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                
                {/* Search Input */}
                <div style={{ flex: '1', minWidth: '240px', position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Buscar regalo..."
                    className="form-control"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '40px' }}
                  />
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>

                {/* Status Filter */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'available', label: 'Disponibles' },
                    { id: 'reserved', label: 'Reservados' },
                  ].map(btn => (
                    <button
                      key={btn.id}
                      onClick={() => setStatusFilter(btn.id as any)}
                      className={`btn ${statusFilter === btn.id ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '20px' }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Tabs */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '16px', paddingBottom: '4px' }}>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      border: 'none',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      backgroundColor: selectedCategory === cat ? 'var(--color-primary-light)' : 'rgba(114, 99, 98, 0.05)',
                      color: selectedCategory === cat ? 'var(--color-primary-dark)' : 'var(--text-muted)',
                      fontWeight: selectedCategory === cat ? 600 : 400,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Gift Grid */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid var(--color-primary-light)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }} />
                <p style={{ color: 'var(--text-muted)' }}>Cargando catálogo...</p>
              </div>
            ) : filteredGifts.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '60px 24px', borderRadius: '20px' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--color-primary-dark)', marginBottom: '16px', opacity: 0.6 }}>
                  <path d="M20 12v10H4V12m16-4v4H4V8m16 0a2 2 0 0 0-2-2h-3.382a2 2 0 0 0-3.236 0H5a2 2 0 0 0-2 2m17 0H3m9 14V8M12 4c-1.333 0-4 1-4 4h8c0-3-2.667-4-4-4z" />
                </svg>
                <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>No encontramos regalos con los filtros seleccionados.</p>
              </div>
            ) : (
              <div className="grid-3">
                {filteredGifts.map(gift => (
                  <div 
                    key={gift.id} 
                    className="glass-card" 
                    style={{ 
                      padding: '24px', 
                      borderRadius: '20px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      border: gift.reservedBy ? '1px solid rgba(114, 99, 98, 0.1)' : '1px solid var(--card-border)',
                      backgroundColor: gift.reservedBy ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.95)'
                    }}
                  >
                    <div>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        color: 'var(--color-primary-dark)',
                        background: 'rgba(229, 152, 155, 0.12)',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        display: 'inline-block',
                        marginBottom: '12px'
                      }}>
                        {gift.category}
                      </span>
                      
                      <h3 style={{ 
                        fontSize: '1.2rem', 
                        color: gift.reservedBy ? 'var(--text-muted)' : 'var(--text-main)', 
                        marginBottom: '8px',
                        textDecoration: gift.reservedBy ? 'line-through' : 'none'
                      }}>
                        {gift.name}
                      </h3>
                    </div>

                    <div style={{ marginTop: '24px' }}>
                      {gift.reservedBy ? (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          padding: '10px 14px', 
                          borderRadius: '30px', 
                          backgroundColor: 'rgba(181, 130, 140, 0.08)',
                          color: 'var(--color-primary-dark)',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                          </svg>
                          <span>Reservado por {gift.reservedBy}</span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setReservingGift(gift)}
                          className="btn btn-primary" 
                          style={{ width: '100%', padding: '10px 16px', fontSize: '0.85rem' }}
                        >
                          Regalar este
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Manage/Change Gift Section (Auto-servicio de liberación) */}
        <div style={{ textAlign: 'center', marginTop: '50px', borderTop: '1px dashed rgba(114, 99, 98, 0.2)', paddingTop: '30px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px' }}>
            ¿Ya reservaste un regalo y deseas cambiar tu selección o liberar la reserva?
          </p>
          <button
            onClick={() => {
              setManageModalOpen(true);
              setLookupName('');
              setMyReservations([]);
              setLookupPerformed(false);
              setReleaseStatus(null);
            }}
            className="btn btn-secondary"
            style={{ padding: '8px 24px', fontSize: '0.85rem' }}
          >
            Gestionar mis Regalos Reservados
          </button>
        </div>
      </section>

      {/* Reservation Modal */}
      {reservingGift && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button 
              onClick={() => { setReservingGift(null); setReserveStatus(null); setReserveGuestName(''); }}
              style={{ 
                position: 'absolute', 
                right: '20px', 
                top: '20px', 
                border: 'none', 
                background: 'none', 
                fontSize: '1.5rem', 
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              &times;
            </button>

            <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-primary)' }}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              Reservar Regalo
            </h3>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '20px' }}>
              Vas a reservar el regalo: <strong style={{ color: 'var(--text-main)' }}>{reservingGift.name}</strong>. Quedará bloqueado para que otros invitados no elijan el mismo.
            </p>

            <form onSubmit={handleReserveSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Tu Nombre y Apellido</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  className="form-control"
                  value={reserveGuestName}
                  onChange={e => setReserveGuestName(e.target.value)}
                  disabled={submittingReservation}
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Tu Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="Ej. juan.perez@email.com"
                  className="form-control"
                  value={reserveGuestEmail}
                  onChange={e => setReserveGuestEmail(e.target.value)}
                  disabled={submittingReservation}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  Te enviaremos un correo de confirmación y un recordatorio 2 semanas antes del evento.
                </span>
              </div>

              {reserveStatus && (
                <div style={{ 
                  padding: '12px 16px', 
                  borderRadius: '12px', 
                  marginBottom: '20px',
                  fontSize: '0.9rem',
                  backgroundColor: reserveStatus.type === 'success' ? '#ebf6ed' : '#fdeded',
                  color: reserveStatus.type === 'success' ? '#2e7d32' : '#d32f2f',
                  border: `1px solid ${reserveStatus.type === 'success' ? '#c8e6c9' : '#ffcdd2'}`
                }}>
                  {reserveStatus.message}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => { setReservingGift(null); setReserveStatus(null); setReserveGuestName(''); setReserveGuestEmail(''); }}
                  className="btn btn-secondary"
                  disabled={submittingReservation}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submittingReservation || !reserveGuestName.trim() || !reserveGuestEmail.trim()}
                >
                  {submittingReservation ? 'Reservando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Surprise Gift Modal */}
      {surpriseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button 
              onClick={() => { setSurpriseModalOpen(false); setSurpriseStatus(null); setSurpriseGiftName(''); setSurpriseGuestName(''); setSurpriseGuestEmail(''); }}
              style={{ 
                position: 'absolute', 
                right: '20px', 
                top: '20px', 
                border: 'none', 
                background: 'none', 
                fontSize: '1.5rem', 
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              &times;
            </button>

            <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              🎁 Registrar Regalo Sorpresa
            </h3>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '20px' }}>
              Dinos tu nombre y el regalo sorpresa que deseas traer. No es necesario que te cases con los de la lista; las sugerencias son solo ideas para guiarte.
            </p>

            <form onSubmit={handleSurpriseSubmit}>
              <div className="form-group">
                <label className="form-label">Tu Nombre y Apellido</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  className="form-control"
                  value={surpriseGuestName}
                  onChange={e => setSurpriseGuestName(e.target.value)}
                  disabled={submittingSurprise}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tu Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="Ej. juan.perez@email.com"
                  className="form-control"
                  value={surpriseGuestEmail}
                  onChange={e => setSurpriseGuestEmail(e.target.value)}
                  disabled={submittingSurprise}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">¿Qué regalo sorpresa tienes en mente?</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Ropa tejida a mano / Es sorpresa 🤫"
                  className="form-control"
                  value={surpriseGiftName}
                  onChange={e => setSurpriseGiftName(e.target.value)}
                  disabled={submittingSurprise}
                />
              </div>

              {surpriseStatus && (
                <div style={{ 
                  padding: '12px 16px', 
                  borderRadius: '12px', 
                  marginBottom: '20px',
                  fontSize: '0.9rem',
                  backgroundColor: surpriseStatus.type === 'success' ? '#ebf6ed' : '#fdeded',
                  color: surpriseStatus.type === 'success' ? '#2e7d32' : '#d32f2f',
                  border: `1px solid ${surpriseStatus.type === 'success' ? '#c8e6c9' : '#ffcdd2'}`
                }}>
                  {surpriseStatus.message}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => { setSurpriseModalOpen(false); setSurpriseStatus(null); setSurpriseGiftName(''); setSurpriseGuestName(''); setSurpriseGuestEmail(''); }}
                  className="btn btn-secondary"
                  disabled={submittingSurprise}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submittingSurprise || !surpriseGuestName.trim() || !surpriseGiftName.trim() || !surpriseGuestEmail.trim()}
                >
                  {submittingSurprise ? 'Registrando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Reservations Modal */}
      {manageModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <button 
              onClick={() => { setManageModalOpen(false); setLookupName(''); setMyReservations([]); setLookupPerformed(false); setReleaseStatus(null); }}
              style={{ 
                position: 'absolute', 
                right: '20px', 
                top: '20px', 
                border: 'none', 
                background: 'none', 
                fontSize: '1.5rem', 
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              &times;
            </button>

            <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              🛠️ Gestionar mis Reservas
            </h3>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Escribe el nombre con el que hiciste la reserva para listar tus regalos y poder liberarlos si deseas cambiar tu selección.
            </p>

            <form onSubmit={handleLookupReservations} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <input
                type="text"
                required
                placeholder="Nombre exacto con el que reservaste"
                className="form-control"
                value={lookupName}
                onChange={e => setLookupName(e.target.value)}
                disabled={lookupLoading}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary" disabled={lookupLoading || !lookupName.trim()} style={{ padding: '0 20px', height: '46px' }}>
                {lookupLoading ? 'Buscando...' : 'Buscar'}
              </button>
            </form>

            {releaseStatus && (
              <div style={{ 
                padding: '12px 16px', 
                borderRadius: '12px', 
                marginBottom: '20px',
                fontSize: '0.9rem',
                backgroundColor: releaseStatus.type === 'success' ? '#ebf6ed' : '#fdeded',
                color: releaseStatus.type === 'success' ? '#2e7d32' : '#d32f2f',
                border: `1px solid ${releaseStatus.type === 'success' ? '#c8e6c9' : '#ffcdd2'}`
              }}>
                {releaseStatus.message}
              </div>
            )}

            {lookupPerformed && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '10px', color: 'var(--text-main)' }}>
                  Regalos reservados por "{lookupName}"
                </h4>
                {myReservations.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '10px 0' }}>
                    No encontramos ningún regalo ni paquete de pañales reservado bajo este nombre. Asegúrate de escribirlo exactamente igual.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                    {myReservations.map(gift => (
                      <div key={gift.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '12px 16px', 
                        borderRadius: '12px', 
                        background: 'rgba(114, 99, 98, 0.05)',
                        border: '1px solid rgba(114, 99, 98, 0.1)'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{gift.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Categoría: {gift.category}</div>
                        </div>
                        <button 
                          onClick={() => handleReleaseReservation(gift.id, gift.name)}
                          className="btn btn-outline"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--danger-color)', borderColor: 'rgba(214, 40, 40, 0.3)' }}
                        >
                          Liberar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Footer */}
      <footer style={{ background: 'white', borderTop: '1px solid rgba(229, 152, 155, 0.1)', padding: '30px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Hecho con ♥ para celebrar este momento tan lindo.
        </p>
      </footer>

      {/* Simple spin animation for loader */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
