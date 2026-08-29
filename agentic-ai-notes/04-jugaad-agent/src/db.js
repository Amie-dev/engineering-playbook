import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db(process.env.DB_NAME || "jugaaddesk");

export async function connectDB() {
  await client.connect();
  console.log("Connected to MongoDB");

  await seedIfEmpty();
  return db;
}

async function seedIfEmpty() {
  const count = await db.collection("inventory").countDocuments();
  if (count > 0) return;

  await db.collection("inventory").insertMany([
    { name: "Laptop Stand", sku: "LS-001", price: 1499, stock: 45, category: "accessories" },
    { name: "USB-C Hub", sku: "UH-002", price: 2999, stock: 120, category: "accessories" },
    { name: "Mechanical Keyboard", sku: "MK-003", price: 4599, stock: 30, category: "peripherals" },
    { name: "Monitor Arm", sku: "MA-004", price: 3499, stock: 18, category: "accessories" },
    { name: "Webcam HD", sku: "WC-005", price: 1999, stock: 60, category: "peripherals" },
    { name: "Desk Mat XL", sku: "DM-006", price: 899, stock: 200, category: "accessories" },
  ]);

  await db.collection("customers").insertMany([
    { name: "Rajesh Sharma", email: "rajesh@example.com", city: "Pune", totalOrders: 12, tier: "gold" },
    { name: "Priya Patel", email: "priya@example.com", city: "Mumbai", totalOrders: 3, tier: "silver" },
    { name: "Amit Kumar", email: "amit@example.com", city: "Delhi", totalOrders: 25, tier: "platinum" },
    { name: "Sneha Reddy", email: "sneha@example.com", city: "Hyderabad", totalOrders: 7, tier: "gold" },
  ]);

  console.log("Seeded inventory and customers");
}

export { db, client };
