export interface Job {
  name: string;
  retries: number;
  timeout: number;
  concurrency: number;
  execute(): Promise<void>;
}
