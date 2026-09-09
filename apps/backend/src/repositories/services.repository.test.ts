import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '@config/database.js';
import { ServiceCatalogRepository, ServiceOfferRepository } from './services.repository.js';

after(async () => {
  await pool.end();
});

async function createTestLocation(): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO locations (name, address) VALUES ($1, 'Dirección de prueba') RETURNING id`,
    [`Sede repo test ${Date.now()}`]
  );
  return rows[0].id;
}

async function createTestAdmin(): Promise<string> {
  const { rows } = await pool.query(`SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`);
  return rows[0].id;
}

test('findWithRepresentativeOffer: operativo sin ofertas → representativeOffer null', async (t) => {
  const catalog = await ServiceCatalogRepository.create({
    serviceName: 'Operativo sin ofertas', categoryGroup: '01 Consulta externa', basePrice: 70000, isActive: true,
  });
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [catalog.id]));

  const found = await ServiceCatalogRepository.findWithRepresentativeOffer(catalog.id);
  assert.ok(found);
  assert.equal(found!.serviceName, 'Operativo sin ofertas');
  assert.equal(found!.basePrice, 70000);
  assert.equal(found!.representativeOffer, null);
});

test('findWithRepresentativeOffer: con ofertas → trae duración y profesional de la más reciente', async (t) => {
  const catalog = await ServiceCatalogRepository.create({
    serviceName: 'Operativo con ofertas', categoryGroup: '02 Apoyo diagnóstico y complementación terapéutica', basePrice: 120000, isActive: true,
  });
  t.after(() => pool.query('DELETE FROM service_catalog WHERE id = $1', [catalog.id]));

  const locationId = await createTestLocation();
  t.after(() => pool.query('DELETE FROM locations WHERE id = $1', [locationId]));
  const adminId = await createTestAdmin();

  const offer1 = await ServiceOfferRepository.create({
    catalogId: catalog.id, locationId, offerType: 'appointment', title: 'Sesión 1',
    capacity: 1, durationMinutes: 30, scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
  } as any, adminId);
  await new Promise((r) => setTimeout(r, 10)); // asegura created_at distinto
  const offer2 = await ServiceOfferRepository.create({
    catalogId: catalog.id, locationId, offerType: 'appointment', title: 'Sesión 2',
    capacity: 1, durationMinutes: 45, scheduledAt: new Date(Date.now() + 7200_000).toISOString(),
  } as any, adminId);
  t.after(() => pool.query('DELETE FROM service_offers WHERE id = ANY($1)', [[offer1.id, offer2.id]]));

  const found = await ServiceCatalogRepository.findWithRepresentativeOffer(catalog.id);
  assert.ok(found!.representativeOffer);
  // La más reciente creada (offer2) es la representativa
  assert.equal(found!.representativeOffer!.durationMinutes, 45);
});

test('findWithRepresentativeOffer: operativoId inexistente → null', async () => {
  const found = await ServiceCatalogRepository.findWithRepresentativeOffer('00000000-0000-0000-0000-000000000000');
  assert.equal(found, null);
});
