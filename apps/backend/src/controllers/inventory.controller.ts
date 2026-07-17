import type { Request, Response } from 'express';
import { InventoryRepository } from '@repositories/inventory.repository.js';

export async function searchInventory(req: Request, res: Response): Promise<void> {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const items = await InventoryRepository.listActive({ search, category });
    res.json({ success: true, data: { items } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function listInventory(_req: Request, res: Response): Promise<void> {
  try {
    const items = await InventoryRepository.listAll();
    res.json({ success: true, data: { items } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function createInventoryItem(req: Request, res: Response): Promise<void> {
  try {
    const { name, category, unit, price } = req.body;
    if (!name || !category || !unit || price === undefined) {
      res.status(400).json({ success: false, error: 'Faltan campos requeridos: name, category, unit, price' });
      return;
    }
    if (typeof price !== 'number' || price < 0) {
      res.status(400).json({ success: false, error: 'price debe ser un número mayor o igual a 0' });
      return;
    }
    const item = await InventoryRepository.create(req.body);
    res.status(201).json({ success: true, data: { item } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function updateInventoryItem(req: Request, res: Response): Promise<void> {
  try {
    if (req.body.price !== undefined && (typeof req.body.price !== 'number' || req.body.price < 0)) {
      res.status(400).json({ success: false, error: 'price debe ser un número mayor o igual a 0' });
      return;
    }
    const item = await InventoryRepository.update(req.params.id, req.body);
    if (!item) { res.status(404).json({ success: false, error: 'Ítem no encontrado' }); return; }
    res.json({ success: true, data: { item } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function deleteInventoryItem(req: Request, res: Response): Promise<void> {
  try {
    const deleted = await InventoryRepository.delete(req.params.id);
    if (!deleted) { res.status(404).json({ success: false, error: 'Ítem no encontrado o ya inactivo' }); return; }
    res.json({ success: true, data: null });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
