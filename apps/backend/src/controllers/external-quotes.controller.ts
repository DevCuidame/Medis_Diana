import type { Request, Response } from 'express';
import { ExternalQuoteRepository } from '@repositories/external-quote.repository.js';
import type { ExternalQuoteItem, ExternalQuoteStatus } from '../types/external-quote.types.js';

function isValidItems(items: unknown): items is ExternalQuoteItem[] {
  return Array.isArray(items) && items.every((it) =>
    it && typeof it === 'object' &&
    (it.type === 'inventory' || it.type === 'plan') &&
    typeof it.refId === 'string' &&
    typeof it.name === 'string' &&
    typeof it.unitPrice === 'number' &&
    typeof it.quantity === 'number' &&
    typeof it.subtotal === 'number'
  );
}

export async function createExternalQuote(req: Request, res: Response): Promise<void> {
  try {
    const { patientName, items, totalAmount } = req.body;
    if (!patientName || typeof patientName !== 'string') {
      res.status(400).json({ success: false, error: 'patientName es requerido' });
      return;
    }
    if (!isValidItems(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'items debe ser un arreglo no vacío con la forma { type, refId, name, unitPrice, quantity, subtotal }' });
      return;
    }
    if (typeof totalAmount !== 'number' || totalAmount < 0) {
      res.status(400).json({ success: false, error: 'totalAmount debe ser un número mayor o igual a 0' });
      return;
    }

    const quote = await ExternalQuoteRepository.create(req.body);
    res.status(201).json({ success: true, data: { quote } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function listExternalQuotes(req: Request, res: Response): Promise<void> {
  try {
    const status = typeof req.query.status === 'string' ? (req.query.status as ExternalQuoteStatus) : undefined;
    const quotes = await ExternalQuoteRepository.listByStatus(status);
    res.json({ success: true, data: { quotes } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

async function resolveQuote(req: Request, res: Response, status: 'confirmed' | 'rejected'): Promise<void> {
  try {
    const resolvedBy = req.user?.email ?? 'admin';
    const quote = await ExternalQuoteRepository.resolve(req.params.id, status, resolvedBy);
    if (!quote) {
      res.status(409).json({ success: false, error: 'La cotización no existe o ya fue resuelta' });
      return;
    }
    res.json({ success: true, data: { quote } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function confirmExternalQuote(req: Request, res: Response): Promise<void> {
  await resolveQuote(req, res, 'confirmed');
}

export async function rejectExternalQuote(req: Request, res: Response): Promise<void> {
  await resolveQuote(req, res, 'rejected');
}
