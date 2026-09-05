export function double(value: number): number {
  return value + value;
}

export function scaleByFour(value: number): number {
  return double(value) + double(value);
}
