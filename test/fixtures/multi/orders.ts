import { isPositiveAmount, isValidEmail } from "./validators.js";
import { logTotal } from "./logger.js";

export interface Order {
  id: string;
  amount: number;
  customerEmail: string;
}

export function validateOrder(order: Order): boolean {
  if (!isPositiveAmount(order.amount)) {
    return false;
  }
  return isValidEmail(order.customerEmail);
}

export class OrderProcessor {
  private total = 0;

  process(order: Order): boolean {
    if (!validateOrder(order)) {
      return false;
    }
    this.recordTotal(order.amount);
    return true;
  }

  private recordTotal(amount: number): void {
    this.total = this.total + amount;
    logTotal(this.total);
  }
}
