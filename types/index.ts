// Shared TypeScript types for the inventory app

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}
