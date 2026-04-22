import { Router } from "express";
import { z } from "zod";
import { failure, success } from "../lib/api-response.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { getSocketIO } from "../socket/io.js";

const router = Router();

router.get("/", async (_req, res) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: { isAvailable: true, deletedAt: null },
        orderBy: { sortOrder: "asc" }
      }
    }
  });
  return success(res, categories);
});

router.get("/categories", async (_req, res) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" }
  });
  return success(res, categories);
});

const createCategory = z.object({ name: z.string().min(2), sortOrder: z.number().int().default(0) });
router.post("/categories", requireAuth(["VENDOR"]), validateBody(createCategory), async (req, res) => {
  const category = await prisma.category.create({ data: req.body });
  return success(res, category, 201);
});

const updateCategory = z.object({
  name: z.string().min(2).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional()
});

router.put("/categories/:id", requireAuth(["VENDOR"]), validateBody(updateCategory), async (req, res) => {
  const category = await prisma.category.update({
    where: { id: String(req.params.id) },
    data: req.body
  });
  return success(res, category);
});

router.delete("/categories/:id", requireAuth(["VENDOR"]), async (req, res) => {
  const id = String(req.params.id);
  const linkedItems = await prisma.menuItem.count({ where: { categoryId: id, deletedAt: null } });
  if (linkedItems > 0) {
    return failure(
      res,
      { code: "CATEGORY_NOT_EMPTY", message: "Cannot delete category with active menu items." },
      409
    );
  }

  await prisma.category.delete({ where: { id } });
  return success(res, { message: "Category deleted." });
});

const createItemSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(2),
  description: z.string().min(3),
  pricePaise: z.number().int().positive(),
  imageUrl: z.string().url().optional(),
  currentStock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(10),
  preparationTimeMinutes: z.number().int().min(1).default(10),
  isVeg: z.boolean().default(true),
  tags: z.array(z.string()).default([])
});

router.post("/items", requireAuth(["VENDOR"]), validateBody(createItemSchema), async (req, res) => {
  const body = req.body as z.infer<typeof createItemSchema>;
  const item = await prisma.menuItem.create({
    data: {
      categoryId: body.categoryId,
      name: body.name,
      description: body.description,
      pricePaise: body.pricePaise,
      currentStock: body.currentStock,
      lowStockThreshold: body.lowStockThreshold,
      preparationTimeMinutes: body.preparationTimeMinutes,
      isVeg: body.isVeg,
      tags: body.tags,
      ...(body.imageUrl ? { imageUrl: body.imageUrl } : {})
    }
  });
  return success(res, item, 201);
});

router.get("/items", requireAuth(["VENDOR"]), async (_req, res) => {
  const items = await prisma.menuItem.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      category: {
        select: { id: true, name: true }
      }
    }
  });
  return success(res, items);
});

const updateItemSchema = z.object({
  categoryId: z.string().min(1).optional(),
  name: z.string().min(2).optional(),
  description: z.string().min(3).optional(),
  pricePaise: z.number().int().positive().optional(),
  imageUrl: z.string().url().optional(),
  isAvailable: z.boolean().optional(),
  currentStock: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  preparationTimeMinutes: z.number().int().min(1).optional(),
  isVeg: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional()
});

router.put("/items/:id", requireAuth(["VENDOR"]), validateBody(updateItemSchema), async (req, res) => {
  const id = String(req.params.id);
  const updates = req.body as z.infer<typeof updateItemSchema>;
  const updateData = {
    ...(updates.name ? { name: updates.name } : {}),
    ...(updates.description ? { description: updates.description } : {}),
    ...(typeof updates.pricePaise === "number" ? { pricePaise: updates.pricePaise } : {}),
    ...(updates.imageUrl ? { imageUrl: updates.imageUrl } : {}),
    ...(typeof updates.isAvailable === "boolean" ? { isAvailable: updates.isAvailable } : {}),
    ...(typeof updates.currentStock === "number"
      ? { currentStock: updates.currentStock, isAvailable: updates.currentStock > 0 }
      : {}),
    ...(typeof updates.lowStockThreshold === "number" ? { lowStockThreshold: updates.lowStockThreshold } : {}),
    ...(typeof updates.preparationTimeMinutes === "number"
      ? { preparationTimeMinutes: updates.preparationTimeMinutes }
      : {}),
    ...(typeof updates.isVeg === "boolean" ? { isVeg: updates.isVeg } : {}),
    ...(Array.isArray(updates.tags) ? { tags: updates.tags } : {}),
    ...(typeof updates.sortOrder === "number" ? { sortOrder: updates.sortOrder } : {}),
    ...(updates.categoryId ? { category: { connect: { id: updates.categoryId } } } : {})
  };
  const item = await prisma.menuItem.update({
    where: { id },
    data: updateData
  });
  return success(res, item);
});

router.delete("/items/:id", requireAuth(["VENDOR"]), async (req, res) => {
  const id = String(req.params.id);
  await prisma.menuItem.update({
    where: { id },
    data: { deletedAt: new Date(), isAvailable: false }
  });
  return success(res, { message: "Menu item deleted." });
});

router.patch("/items/:id/toggle", requireAuth(["VENDOR"]), async (req, res) => {
  const id = String(req.params.id);
  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    return failure(res, { code: "NOT_FOUND", message: "Menu item not found." }, 404);
  }
  const toggled = await prisma.menuItem.update({
    where: { id },
    data: {
      isAvailable: !existing.isAvailable
    }
  });
  return success(res, toggled);
});

const bulkToggleSchema = z.object({
  isAvailable: z.boolean()
});

router.patch("/items/bulk-toggle", requireAuth(["VENDOR"]), validateBody(bulkToggleSchema), async (req, res) => {
  const result = await prisma.menuItem.updateMany({
    where: { deletedAt: null },
    data: { isAvailable: req.body.isAvailable }
  });
  return success(res, { updatedCount: result.count, isAvailable: req.body.isAvailable });
});

router.patch("/items/:id/stock", requireAuth(["VENDOR"]), async (req, res) => {
  const parsed = z.object({ currentStock: z.number().int().min(0) }).safeParse(req.body);
  if (!parsed.success) {
    return failure(res, { code: "VALIDATION_ERROR", message: "Invalid stock value." }, 422);
  }

  const item = await prisma.menuItem.update({
    where: { id: String(req.params.id) },
    data: {
      currentStock: parsed.data.currentStock,
      isAvailable: parsed.data.currentStock > 0
    }
  });

  if (item.currentStock <= item.lowStockThreshold) {
    getSocketIO()?.to("vendor").emit("menu:stock_alert", {
      menuItemId: item.id,
      currentStock: item.currentStock
    });
  }

  return success(res, item);
});

export default router;
