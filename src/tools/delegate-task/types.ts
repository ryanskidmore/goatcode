export interface TaskInput {
  category: string;
  description: string;
  prompt: string;
  load_skills?: string[];
  run_in_background: boolean;
  session_id?: string;
}

export interface CategoryConfig {
  model: string;
  variant?: string;
  description?: string;
}

export interface CategoryResolver {
  resolve(categoryName: string): CategoryConfig | undefined;
  list(): string[];
}
