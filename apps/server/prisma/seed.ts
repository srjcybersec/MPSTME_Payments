import bcrypt from "bcryptjs";
import { PrismaClient, UserRole, WalletTransactionSource, WalletTransactionType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const vendorPasswordHash = await bcrypt.hash("Vendor@1234", 12);
  const studentPasswordHash = await bcrypt.hash("Student@1234", 12);

  const vendor = await prisma.user.upsert({
    where: { email: "canteen@mpstme.edu" },
    update: {},
    create: {
      name: "MPSTME Canteen Vendor",
      email: "canteen@mpstme.edu",
      phoneNumber: "9000000000",
      passwordHash: vendorPasswordHash,
      role: UserRole.VENDOR,
      isEmailVerified: true,
      isPhoneVerified: true
    }
  });

  const categories = ["Snacks", "Meals", "Beverages", "Combos"];
  const categoryMap = new Map<string, string>();

  for (const [index, category] of categories.entries()) {
    const created = await prisma.category.upsert({
      where: { name: category },
      update: { sortOrder: index },
      create: { name: category, sortOrder: index }
    });
    categoryMap.set(category, created.id);
  }

  const menuItems = [
    { name: "Samosa", pricePaise: 1500, category: "Snacks" },
    { name: "Vada Pav", pricePaise: 2000, category: "Snacks" },
    { name: "Misal Pav", pricePaise: 5000, category: "Meals" },
    { name: "Pav Bhaji", pricePaise: 6000, category: "Meals" },
    { name: "Paneer Roll", pricePaise: 8000, category: "Meals" },
    { name: "Rajma Rice", pricePaise: 7000, category: "Meals" },
    { name: "Masala Chai", pricePaise: 1500, category: "Beverages" },
    { name: "Cold Coffee", pricePaise: 4000, category: "Beverages" },
    { name: "Thali", pricePaise: 9000, category: "Combos" },
    { name: "Sandwich", pricePaise: 3500, category: "Snacks" }
  ];

  for (const [index, item] of menuItems.entries()) {
    await prisma.menuItem.upsert({
      where: { id: `seed-${item.name.toLowerCase().replace(" ", "-")}` },
      update: {},
      create: {
        id: `seed-${item.name.toLowerCase().replace(" ", "-")}`,
        categoryId: categoryMap.get(item.category)!,
        name: item.name,
        description: `${item.name} freshly prepared for MPSTME canteen.`,
        pricePaise: item.pricePaise,
        isAvailable: true,
        currentStock: 50,
        lowStockThreshold: 10,
        preparationTimeMinutes: 10,
        isVeg: true,
        tags: ["canteen", "popular"],
        sortOrder: index
      }
    });
  }

  for (let i = 1; i <= 5; i += 1) {
    const email = `student${i}@nmims.edu`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `Student ${i}`,
        email,
        phoneNumber: `900000000${i}`,
        studentId: `MPSTME${1000 + i}`,
        passwordHash: studentPasswordHash,
        role: UserRole.STUDENT,
        isEmailVerified: true,
        isPhoneVerified: true
      }
    });

    const wallet = await prisma.wallet.upsert({
      where: { userId: user.id },
      update: { balancePaise: 50000 },
      create: {
        userId: user.id,
        balancePaise: 50000
      }
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.CREDIT,
        amountPaise: 50000,
        description: "Seed opening balance",
        source: WalletTransactionSource.MANUAL,
        referenceId: "seed-opening-balance"
      }
    });
  }

  console.log(`Seeded vendor: ${vendor.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
