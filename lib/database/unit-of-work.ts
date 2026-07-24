import { supabase } from '@/lib/supabase';

export interface WorkUnitTask {
  table: string;
  action: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  matchKey?: string;
  matchValue?: unknown;
}

export class UnitOfWork {
  private tasks: WorkUnitTask[] = [];

  registerInsert(table: string, data: Record<string, unknown>): this {
    this.tasks.push({ table, action: 'insert', data });
    return this;
  }

  registerUpdate(table: string, matchKey: string, matchValue: unknown, data: Record<string, unknown>): this {
    this.tasks.push({ table, action: 'update', matchKey, matchValue, data });
    return this;
  }

  async commit(): Promise<boolean> {
    if (this.tasks.length === 0) return true;

    try {
      for (const task of this.tasks) {
        if (task.action === 'insert') {
          await supabase.from(task.table).insert(task.data);
        } else if (task.action === 'update' && task.matchKey) {
          await supabase.from(task.table).update(task.data).eq(task.matchKey, task.matchValue);
        }
      }
      this.tasks = [];
      return true;
    } catch (err) {
      console.error('UnitOfWork commit failed:', err);
      return false;
    }
  }
}
