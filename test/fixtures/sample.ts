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

function isPositiveAmount(amount: number): boolean {
  return amount > 0;
}

function isValidEmail(email: string): boolean {
  return email.includes("@");
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

function logTotal(total: number): void {
  console.log(`Running total: ${total}`);
}
