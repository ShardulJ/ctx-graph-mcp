export function double(value: number): number {
  return value * 2;
}

export function quadruple(value: number): number {
  return double(double(value));
}
