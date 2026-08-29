export async function calculator({ operation, a, b }) {
  const ops = {
    add: () => a + b,
    subtract: () => a - b,
    multiply: () => a * b,
    divide: () => (b === 0 ? "Error: Division by zero" : a / b),
    percentage: () => (a * b) / 100,
  };

  const fn = ops[operation];
  if (!fn) return { error: `Unknown operation: ${operation}` };

  const result = fn();
  return { operation, a, b, result };
}
