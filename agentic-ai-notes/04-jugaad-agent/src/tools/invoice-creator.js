let invoiceCounter = 1000;

export async function invoiceCreator({ customerName, items, gstPercent = 18 }) {
  invoiceCounter++;

  const lineItems = items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.price,
    total: item.quantity * item.price,
  }));

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const gstAmount = (subtotal * gstPercent) / 100;
  const grandTotal = subtotal + gstAmount;

  return {
    invoiceNumber: `JD-${invoiceCounter}`,
    date: new Date().toISOString().split("T")[0],
    customer: customerName,
    items: lineItems,
    subtotal,
    gstPercent,
    gstAmount,
    grandTotal,
    currency: "INR",
  };
}
