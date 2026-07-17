import React from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../../seo/Seo';

export default function NotFoundPage(): React.ReactElement {
  return (
    <>
      <Seo path="/404" title="Página no encontrada" noindex />
      <main
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
          color: '#0F172A',
        }}
      >
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
          404 — Página no encontrada
        </h1>
        <p style={{ margin: 0, color: '#475569' }}>
          La página que buscas no existe o fue movida.
        </p>
        <Link
          to="/"
          style={{
            color: '#2563EB',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Volver al inicio
        </Link>
      </main>
    </>
  );
}
