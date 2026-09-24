import { apiRequest } from "./api";
import type { Category } from "../types/ticket";

export function getCategories(): Promise<{ categories: Category[] }> {
  return apiRequest<{ categories: Category[] }>("/categories");
}
