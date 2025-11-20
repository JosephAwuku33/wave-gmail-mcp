import * as fs from "fs/promises";
import * as path from "path";
import { CustomerData } from "./types.js";
import { ROOT_DIR } from "./config.js";

const CACHE_FILE = path.join(ROOT_DIR, ".customer-cache.json");

export class CustomerStore {
  private data: CustomerData[] = [];

  constructor() {
    this.load();
  }

  async load(): Promise<void> {
    try {
      const fileContent = await fs.readFile(CACHE_FILE, "utf-8");
      this.data = JSON.parse(fileContent);
    } catch (error) {
      // File doesn't exist yet, ignore
      this.data = [];
    }
  }

  async save(data: CustomerData[]): Promise<void> {
    this.data = data;
    await fs.writeFile(CACHE_FILE, JSON.stringify(data, null, 2));
  }

  getAll(): CustomerData[] {
    return this.data;
  }

  clear(): void {
    this.data = [];
    // Optional: delete file
  }
}