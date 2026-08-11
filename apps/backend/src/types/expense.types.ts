export interface ExpenseRecord {
  id: string;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ExpensePublic {
  id: string;
  description: string;
  amount: number;
  category: string;
  expenseDate: string;
}

export interface CreateExpenseDto {
  description: string;
  amount: number;
  category: string;
  expenseDate: string;
  createdBy?: string;
}

export type UpdateExpenseDto = Partial<CreateExpenseDto>;
