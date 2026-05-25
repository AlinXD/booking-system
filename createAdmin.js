import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import argon2 from "argon2";

// Inițializăm Prisma exact așa cum o faci în srv.js
const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL),
});

async function main() {
  try {
    // Generăm hash-ul exact așa cum îl așteaptă serverul tău
    const hashedPassword = await argon2.hash("root", { type: argon2.argon2id });
    
    // Inserăm utilizatorul
    const admin = await prisma.adminAccount.create({
      data: {
        name: "admin",
        password: hashedPassword,
      },
    });
    
    console.log("✅ Contul a fost creat cu succes!");
    console.log("Hash-ul salvat este:", admin.password);
  } catch (error) {
    console.error("❌ Eroare:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();