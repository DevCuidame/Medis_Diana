// ============================================================
// apps/backend/src/controllers/cups.controller.ts
// Controlador: Clasificación RIPS -> CUPS
// ============================================================

import type { Request, Response } from 'express';
import { CupsRepository } from '@repositories/cups.repository.js';

export async function lookupCups(req: Request, res: Response): Promise<void> {
  const { serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory } = req.query;
  if (!serviceGroup || !serviceSubgroup || !serviceCategory || !serviceSubcategory) {
    res.status(400).json({ success: false, error: 'Faltan parámetros de clasificación.' });
    return;
  }
  const result = await CupsRepository.findByClassification(
    String(serviceGroup), String(serviceSubgroup), String(serviceCategory), String(serviceSubcategory)
  );
  if (!result) {
    res.status(404).json({ success: false, error: 'No existe un mapeo CUPS para esta clasificación.' });
    return;
  }
  res.status(200).json({ success: true, data: result });
}

export async function listClassificationCategories(req: Request, res: Response): Promise<void> {
  const { serviceGroup, serviceSubgroup } = req.query;
  if (!serviceGroup || !serviceSubgroup) {
    res.status(400).json({ success: false, error: 'Faltan parámetros.' });
    return;
  }
  const categories = await CupsRepository.listCategories(String(serviceGroup), String(serviceSubgroup));
  res.status(200).json({ success: true, data: categories });
}

export async function listClassificationSubcategories(req: Request, res: Response): Promise<void> {
  const { serviceGroup, serviceSubgroup, serviceCategory } = req.query;
  if (!serviceGroup || !serviceSubgroup || !serviceCategory) {
    res.status(400).json({ success: false, error: 'Faltan parámetros.' });
    return;
  }
  const subcategories = await CupsRepository.listSubcategories(String(serviceGroup), String(serviceSubgroup), String(serviceCategory));
  res.status(200).json({ success: true, data: subcategories });
}

export async function listCupsCatalog(_req: Request, res: Response): Promise<void> {
  const catalog = await CupsRepository.listCatalog();
  res.status(200).json({ success: true, data: catalog });
}

export async function createCupsMapping(req: Request, res: Response): Promise<void> {
  const { serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory, cupsCode } = req.body;
  if (!serviceGroup || !serviceSubgroup || !serviceCategory || !serviceSubcategory || !cupsCode) {
    res.status(400).json({ success: false, error: 'Faltan campos obligatorios.' });
    return;
  }
  const created = await CupsRepository.createMapping({ serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory, cupsCode });
  res.status(201).json({ success: true, data: created });
}
