export function isPositiveAmount(amount: number): boolean {
  return amount > 0;
}

export function isValidEmail(email: string): boolean {
  return email.includes("@");
}
