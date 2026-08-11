import { pool } from '@config/database.js';
import type { ExpensePublic, CreateExpenseDto, UpdateExpenseDto } from '../types/expense.types.js';

const SELECT_COLUMNS = `
  id, description, amount, category,
  TO_CHAR(expense_date, 'YYYY-MM-DD') AS "expenseDate"
`;

export const ExpenseRepository = {
  async listAll(): Promise<ExpensePublic[]> {
    const { rows } = await pool.query(
      `SELECT ${SELECT_COLUMNS} FROM expenses ORDER BY expense_date DESC, created_at DESC`
    );
    return rows;
  },

  async create(dto: CreateExpenseDto): Promise<ExpensePublic> {
    const { rows } = await pool.query(
      `INSERT INTO expenses (description, amount, category, expense_date, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${SELECT_COLUMNS}`,
      [dto.description, dto.amount, dto.category, dto.expenseDate, dto.createdBy ?? null]
    );
    return rows[0];
  },

  async update(id: string, dto: UpdateExpenseDto): Promise<ExpensePublic | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (dto.description !== undefined) { sets.push(`description = $${i++}`); values.push(dto.description); }
    if (dto.amount !== undefined)      { sets.push(`amount = $${i++}`);      values.push(dto.amount); }
    if (dto.category !== undefined)    { sets.push(`category = $${i++}`);    values.push(dto.category); }
    if (dto.expenseDate !== undefined) { sets.push(`expense_date = $${i++}`); values.push(dto.expenseDate); }
    if (sets.length === 0) return null;

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query(
      `UPDATE expenses SET ${sets.join(', ')} WHERE id = $${i} RETURNING ${SELECT_COLUMNS}`,
      values
    );
    return rows[0] ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(`DELETE FROM expenses WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  },
};
