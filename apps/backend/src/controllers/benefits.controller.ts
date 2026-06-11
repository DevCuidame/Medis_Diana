import type { Request, Response } from 'express';
import { BenefitRepository } from '@repositories/benefit.repository.js';
import type { BenefitType, ServiceCategory } from '@repositories/benefit.repository.js';

const VALID_TYPES: BenefitType[] = ['informational', 'free_classes', 'discount_percent', 'unlimited_classes'];
const VALID_CATEGORIES: ServiceCategory[] = ['pole', 'complementary', 'general'];

export async function listBenefits(req: Request, res: Response): Promise<void> {
  try {
    const onlyActive = req.query.active === 'true';
    const benefits = onlyActive
      ? await BenefitRepository.listActive()
      : await BenefitRepository.listAll();
    res.json({ success: true, data: { benefits } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function createBenefit(req: Request, res: Response): Promise<void> {
  try {
    const { name, description, benefitType, benefitValue, serviceCategory } = req.body;
    if (!name?.trim()) { res.status(400).json({ success: false, error: 'name requerido' }); return; }
    const type: BenefitType = VALID_TYPES.includes(benefitType) ? benefitType : 'informational';
    const value = benefitValue !== undefined && benefitValue !== null ? Number(benefitValue) : null;
    const category: ServiceCategory | null = VALID_CATEGORIES.includes(serviceCategory) ? serviceCategory : null;
    const benefit = await BenefitRepository.create(name, description ?? null, type, value, category);
    res.status(201).json({ success: true, data: { benefit } });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ success: false, error: 'Ya existe un beneficio con ese nombre.' });
    } else {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export async function updateBenefit(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, description, benefitType, benefitValue, serviceCategory, isActive, sortOrder } = req.body;
    const type: BenefitType | undefined = VALID_TYPES.includes(benefitType) ? benefitType : undefined;
    const value = benefitValue !== undefined ? (benefitValue !== null ? Number(benefitValue) : null) : undefined;
    const category: ServiceCategory | null | undefined = serviceCategory !== undefined
      ? (VALID_CATEGORIES.includes(serviceCategory) ? serviceCategory : null)
      : undefined;
    const benefit = await BenefitRepository.update(id, {
      name, description, isActive, sortOrder,
      ...(type !== undefined ? { benefitType: type } : {}),
      ...(value !== undefined ? { benefitValue: value } : {}),
      ...(category !== undefined ? { serviceCategory: category } : {}),
    });
    if (!benefit) { res.status(404).json({ success: false, error: 'No encontrado' }); return; }
    res.json({ success: true, data: { benefit } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function deleteBenefit(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const ok = await BenefitRepository.delete(id);
    if (!ok) { res.status(404).json({ success: false, error: 'No encontrado' }); return; }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
