import type { Request, Response } from 'express';
import { ExpenseRepository } from '@repositories/expense.repository.js';

export async function listExpenses(_req: Request, res: Response): Promise<void> {
  try {
    const expenses = await ExpenseRepository.listAll();
    res.json({ success: true, data: { expenses } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function createExpense(req: Request, res: Response): Promise<void> {
  try {
    const { description, amount, category, expenseDate } = req.body;
    if (!description || amount === undefined || !category || !expenseDate) {
      res.status(400).json({ success: false, error: 'Faltan campos requeridos: description, amount, category, expenseDate' });
      return;
    }
    if (typeof amount !== 'number' || amount < 0) {
      res.status(400).json({ success: false, error: 'amount debe ser un número mayor o igual a 0' });
      return;
    }
    const expense = await ExpenseRepository.create({ description, amount, category, expenseDate, createdBy: req.user?.id });
    res.status(201).json({ success: true, data: { expense } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function updateExpense(req: Request, res: Response): Promise<void> {
  try {
    if (req.body.amount !== undefined && (typeof req.body.amount !== 'number' || req.body.amount < 0)) {
      res.status(400).json({ success: false, error: 'amount debe ser un número mayor o igual a 0' });
      return;
    }
    const expense = await ExpenseRepository.update(req.params.id, req.body);
    if (!expense) { res.status(404).json({ success: false, error: 'Gasto no encontrado' }); return; }
    res.json({ success: true, data: { expense } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function deleteExpense(req: Request, res: Response): Promise<void> {
  try {
    const deleted = await ExpenseRepository.delete(req.params.id);
    if (!deleted) { res.status(404).json({ success: false, error: 'Gasto no encontrado' }); return; }
    res.json({ success: true, data: null });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
