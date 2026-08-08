export interface Application {
  id: string;
  code: string;
  name: string;
  description: string | null;
  modules: unknown[];
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
