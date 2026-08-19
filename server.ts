import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'MISSING_SECRET';
if (JWT_SECRET === 'MISSING_SECRET') {
  console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables. Authentication will fail.");
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const prisma = new PrismaClient();
const app = express();

app.use(cors({ origin: [FRONTEND_URL, APP_URL] }));
app.use(express.json());

// Helper for generic API errors
const handleApiError = (res: Response, err: any, status = 500) => {
  console.error("API Error:", err);
  const errorMessage = err instanceof Error ? err.message : String(err);
  res.status(status).json({ error: 'Internal Server Error', details: errorMessage });
};

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string; name: string };
    }
  }
}

// Authentication Middleware
const authenticate = (roles?: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
      if (JWT_SECRET === 'MISSING_SECRET') {
        return res.status(500).json({ error: 'Server configuration error: Missing JWT_SECRET' });
      }
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string; name: string };
      req.user = decoded;

      if (roles && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient role' });
      }

      next();
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  };
};

// Rate Limiting for Login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: { error: 'Хэт олон нэвтрэх оролдлого хийсэн байна. 15 минутын дараа дахин оролдоно уу.' }
});

// Login API
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials or inactive user' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (JWT_SECRET === 'MISSING_SECRET') {
      return res.status(500).json({ error: 'Server configuration error: Missing JWT_SECRET' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    handleApiError(res, err);
  }
});

// Helper function to recalculate BOM costs and update unitPrice
async function recalculateFinishedGoodsCosts() {
  try {
    const boms = await prisma.bOM.findMany({
      include: { items: { include: { ingredient: true } } }
    });
    for (const bom of boms) {
      let totalCost = 0;
      for (const item of bom.items) {
        if (item.ingredient) {
           totalCost += Number(item.ingredient.costPrice) * Number(item.quantityPerUnit);
        }
      }
      if (totalCost > 0) {
        const product = await prisma.product.findUnique({ where: { id: bom.finishedProductId } });
        if (product) {
          const profit = Number(product.profitPercent || 0);
          const comm = Number(product.commissionPercent || 0);
          const vat = Number(product.vatPercent || 0);
          
          // Formula requested by user: unitPrice = costPrice * (1 + (profit + comm + vat) / 100)
          const newUnitPrice = totalCost * (1 + (profit + comm + vat) / 100);
          
          await prisma.product.update({
            where: { id: bom.finishedProductId },
            data: { 
              costPrice: totalCost,
              unitPrice: newUnitPrice
            }
          });
        }
      }
    }
  } catch (error) {
    console.error("Error recalculating finished goods costs:", error);
  }
}

// Users
app.get('/api/users', authenticate(['ADMIN', 'WAREHOUSE_WORKER', 'DELIVERY_DRIVER', 'FINANCE', 'DATA_ADMIN']), async (req, res) => {
  const whereClause: any = { isActive: true };
  if (req.user?.role !== 'DATA_ADMIN') {
    whereClause.role = { not: 'DATA_ADMIN' };
  }
  const users = await prisma.user.findMany({
    where: whereClause,
    select: { id: true, name: true, email: true, role: true, permissions: true, isActive: true } // Exclude password
  });
  res.json(users);
});

app.post('/api/users', authenticate(['ADMIN']), async (req, res) => {
  const { name, email, password, role, permissions } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);
    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword, role, permissions: permissions || [] }
    });
    const { password: _, ...userWithoutPassword } = newUser;
    res.json(userWithoutPassword);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.put('/api/users/:id', authenticate(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { name, email, role, password, permissions } = req.body;
  try {
    const data: any = { name, email, role };
    if (permissions !== undefined) {
      data.permissions = permissions;
    }
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    const updated = await prisma.user.update({
      where: { id },
      data
    });
    const { password: _, ...userWithoutPassword } = updated;
    res.json(userWithoutPassword);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.put('/api/users/:id/deactivate', authenticate(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  if (id === req.user?.id) {
    return res.status(400).json({ error: 'Cannot deactivate yourself' });
  }
  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });
    res.json({ success: true });
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.post('/api/seed', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await prisma.user.createMany({
        data: [
          { id: 'usr_admin1', name: 'Sarah Jenkins', email: 'sarah.jenkins@wms.logistics.io', password: hashedPassword, role: 'ADMIN' },
          { id: 'usr_worker1', name: 'Carlos Ruiz', email: 'carlos.ruiz@wms.logistics.io', password: hashedPassword, role: 'WAREHOUSE_WORKER' },
          { id: 'usr_driver1', name: 'David Miller', email: 'david.miller@wms.logistics.io', password: hashedPassword, role: 'DELIVERY_DRIVER' },
          { id: 'usr_driver2', name: 'Elena Vance', email: 'elena.vance@wms.logistics.io', password: hashedPassword, role: 'DELIVERY_DRIVER' }
        ]
      });
      await prisma.branch.createMany({
        data: [
          { id: 'br_metro', name: 'Metro Downtown Logistics', location: 'Sector 4, Central District, Bldg 12', contactPerson: 'Marcus Vance', email: 'marcus@metro-logistics.com', phone: '+1 (555) 019-2831' },
          { id: 'br_eastside', name: 'Eastside Distribution Hub', location: 'Logistics Park, Block B-4', contactPerson: 'Elena Rostova', email: 'elena@eastside-hub.com', phone: '+1 (555) 018-9942' }
        ]
      });
      await prisma.product.createMany({
        data: [
          { id: 'prod_1', sku: 'SKU-IND-101', name: 'Industrial Servo Motor 500W', description: 'Precision brushless motor', unitPrice: 850000, stockQuantity: 42 },
          { id: 'prod_2', sku: 'SKU-BOX-202', name: 'Heavy Duty Corrugated Pallet Box', description: 'Triple-wall reinforced shipping container', unitPrice: 120000, stockQuantity: 180 }
        ]
      });
      res.json({ success: true, message: 'Database seeded' });
    } else {
      res.json({ success: true, message: 'Already seeded' });
    }
  } catch (err) {
    handleApiError(res, err);
  }
});
// ------------------------------------------
// Real-time Events (SSE)
// ------------------------------------------
let clients: { id: string, res: any }[] = [];

export function sendSSEEvent(type: string, data: any) {
  clients.forEach(c => {
    try {
      c.res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    } catch (err) {
      // ignore
    }
  });
}

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const clientId = Date.now().toString();
  const newClient = { id: clientId, res };
  clients.push(newClient);

  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
  });
});


// Branches
app.get('/api/branches', authenticate(), async (req, res) => {
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    include: { inventory: { include: { product: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(branches);
});

// Create new branch/customer
app.post('/api/branches', authenticate(['ADMIN']), async (req, res) => {
  const { name, location, contactPerson, email, phone, type, marginPercent, profitPercent } = req.body;
  try {
    const newBranch = await prisma.branch.create({
      data: { 
        name, 
        location, 
        contactPerson, 
        email, 
        phone, 
        type, 
        marginPercent: Number(marginPercent || 0),
        profitPercent: Number(profitPercent || 0)
      },
    });
    res.json(newBranch);
  } catch (error: any) {
    handleApiError(res, error, 400);
  }
});

// Update branch/customer
app.put('/api/branches/:id', authenticate(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { name, location, contactPerson, email, phone, type, isActive, marginPercent, profitPercent } = req.body;
  try {
    const updated = await prisma.branch.update({
      where: { id },
      data: { 
        name, 
        location, 
        contactPerson, 
        email, 
        phone, 
        type, 
        isActive, 
        marginPercent: Number(marginPercent || 0),
        profitPercent: Number(profitPercent || 0)
      },
    });
    res.json(updated);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

// Branch Inventory
app.get('/api/branches/:id/inventory', authenticate(), async (req, res) => {
  const { id } = req.params;
  try {
    const inventory = await prisma.branchInventory.findMany({
      where: { branchId: id },
      include: { product: true }
    });
    res.json(inventory);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/branches/:id/inventory/adjust', authenticate(['ADMIN', 'WAREHOUSE_WORKER']), async (req, res) => {
  const { id } = req.params;
  const { productId, quantityToDeduct, type, notes } = req.body; // type: 'SALE' or 'RETURN'
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const branchInv = await tx.branchInventory.findUnique({
        where: { branchId_productId: { branchId: id, productId } }
      });
      if (!branchInv || branchInv.quantity < quantityToDeduct) {
        throw new Error('Салбар дээр барааны үлдэгдэл хүрэлцэхгүй байна');
      }

      // Deduct from branch
      const newInv = await tx.branchInventory.update({
        where: { id: branchInv.id },
        data: { quantity: branchInv.quantity - quantityToDeduct }
      });

      // If it's a return, we add it back to main inventory
      if (type === 'RETURN') {
        const product = await tx.product.findUnique({ where: { id: productId }});
        if (product) {
          const newStock = product.stockQuantity + quantityToDeduct;
          await tx.product.update({
            where: { id: productId },
            data: { stockQuantity: newStock }
          });
          const priceToUse = Number(product.costPrice) > 0 ? Number(product.costPrice) : Number(product.unitPrice);
          await tx.inventoryTransaction.create({
            data: {
              productId,
              type: 'ADJUSTMENT',
              quantity: quantityToDeduct,
              previousStock: product.stockQuantity,
              newStock,
              unitPrice: priceToUse,
              totalPrice: quantityToDeduct * priceToUse,
              userId: req.user!.id,
              notes: notes || `Салбарын буцаалт (Branch ID: ${id})`
            }
          });
        }
      } else {
        // If it's a sale, we might just log it somewhere if we had a Sales model. 
        // For now, it just removes it from the branch inventory.
      }
      return newInv;
    }, { maxWait: 10000, timeout: 20000 });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// Soft delete branch
app.put('/api/branches/:id/deactivate', authenticate(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  try {
    const branch = await prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });
    res.json(branch);
  } catch (error: any) {
    handleApiError(res, error, 400);
  }
});

// ------------------------------------------
// API Routes
// ------------------------------------------

// Categories
app.get('/api/categories', authenticate(), async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  const categories = await prisma.category.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(categories);
});

app.post('/api/categories', authenticate(['ADMIN']), async (req, res) => {
  try {
    const newCategory = await prisma.category.create({
      data: {
        name: req.body.name,
        description: req.body.description
      }
    });
    res.json(newCategory);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.put('/api/categories/:id', authenticate(['ADMIN']), async (req, res) => {
  try {
    const updated = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        description: req.body.description
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.put('/api/categories/:id/deactivate', authenticate(['ADMIN']), async (req, res) => {
  try {
    const updated = await prisma.category.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.put('/api/categories/:id/reactivate', authenticate(['ADMIN']), async (req, res) => {
  try {
    const updated = await prisma.category.update({
      where: { id: req.params.id },
      data: { isActive: true }
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// Products
// Inventory Batches (FEFO Tracking)
app.get('/api/inventory/expiring-batches', authenticate(), async (req, res) => {
  try {
    const procurements = await prisma.procurementItem.findMany({
      where: { expiryDate: { not: null } },
      include: { product: true }
    });
    
    const production = await prisma.productionBatch.findMany({
      where: { expiryDate: { not: null } },
      include: { finishedProduct: true }
    });

    // Map to unified structure
    const batches = [
      ...procurements.map(p => ({
        id: p.id,
        productId: p.productId,
        productName: p.product.name,
        batchNumber: `PROC-${p.procurementId.slice(-4)}`,
        quantity: p.quantity,
        expiryDate: p.expiryDate,
        type: 'PROCUREMENT'
      })),
      ...production.map(p => ({
        id: p.id,
        productId: p.finishedProductId,
        productName: p.finishedProduct.name,
        batchNumber: p.batchNumber,
        quantity: p.quantityProduced,
        expiryDate: p.expiryDate,
        type: 'PRODUCTION'
      }))
    ];

    // Sort by expiry ascending (FEFO)
    batches.sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());
    
    res.json(batches);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.get('/api/products', authenticate(), async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  const products = await prisma.product.findMany({
    where: includeInactive ? undefined : { isActive: true },
    include: { category: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(products);
});

app.post('/api/products', authenticate(['ADMIN', 'WAREHOUSE_WORKER', 'FINANCE']), async (req, res) => {
  try {
    const data = req.body;
    
    const newProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sku: data.sku,
          name: data.name,
          description: data.description,
          unitPrice: data.unitPrice || 0,
          costPrice: data.costPrice || 0,
          unit: data.unit || 'ш',
          materialType: data.materialType || 'FINISHED_GOOD',
          stockQuantity: data.stockQuantity,
          initialStock: data.stockQuantity || 0,
          minStockLevel: data.minStockLevel || 5,
          categoryId: data.categoryId || null,
          profitPercent: data.profitPercent || 0,
          commissionPercent: data.commissionPercent || 0,
          vatPercent: data.vatPercent || 0
        },
        include: { category: true }
      });

      if (product.stockQuantity > 0) {
        const priceToUse = Number(product.costPrice) > 0 ? Number(product.costPrice) : Number(product.unitPrice);
        await tx.inventoryTransaction.create({
          data: {
            productId: product.id,
            type: 'ADJUSTMENT',
            quantity: product.stockQuantity,
            previousStock: 0,
            newStock: product.stockQuantity,
            unitPrice: priceToUse,
            totalPrice: product.stockQuantity * priceToUse,
            userId: req.user!.id,
            notes: 'Эхний үлдэгдэл бүртгэв'
          }
        });
      }
      
      return product;
    });

    res.json(newProduct);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.put('/api/products/:id', authenticate(['ADMIN', 'WAREHOUSE_WORKER', 'FINANCE']), async (req, res) => {
  try {
    const data = req.body;
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name: data.name,
        description: data.description,
        unitPrice: data.unitPrice !== undefined ? data.unitPrice : undefined,
        costPrice: data.costPrice !== undefined ? data.costPrice : undefined,
        unit: data.unit,
        materialType: data.materialType,
        minStockLevel: data.minStockLevel,
        categoryId: data.categoryId || null,
        profitPercent: data.profitPercent !== undefined ? data.profitPercent : undefined,
        commissionPercent: data.commissionPercent !== undefined ? data.commissionPercent : undefined,
        vatPercent: data.vatPercent !== undefined ? data.vatPercent : undefined
      },
      include: { category: true }
    });
    // Auto recalculate all finished goods costs to ensure accuracy after ingredient prices change
    await recalculateFinishedGoodsCosts();

    res.json(updated);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.put('/api/products/:id/deactivate', authenticate(['ADMIN']), async (req, res) => {
  try {
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.put('/api/products/:id/reactivate', authenticate(['ADMIN']), async (req, res) => {
  try {
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: true }
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.post('/api/products/replenish', authenticate(['ADMIN', 'WAREHOUSE_WORKER', 'FINANCE']), async (req, res) => {
  const { productId, quantityToAdd, secondaryQuantityToAdd, userId, notes, isAdjustment } = req.body;
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('Product not found');
      
      const newStock = product.stockQuantity + quantityToAdd;
      const newSecondaryStock = secondaryQuantityToAdd !== undefined
          ? (product.stockSecondaryQuantity || 0) + secondaryQuantityToAdd
          : undefined;
      
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { 
          stockQuantity: newStock,
          ...(newSecondaryStock !== undefined ? { stockSecondaryQuantity: newSecondaryStock } : {})
        },
      });
      
      if (userId) {
        const priceToUse = Number(product.costPrice) > 0 ? Number(product.costPrice) : Number(product.unitPrice);
        await tx.inventoryTransaction.create({
          data: {
            productId,
            type: isAdjustment ? 'ADJUSTMENT' : 'INBOUND',
            quantity: quantityToAdd,
            secondaryQuantity: secondaryQuantityToAdd,
            previousStock: product.stockQuantity,
            newStock,
            previousSecondaryStock: product.stockSecondaryQuantity,
            newSecondaryStock: newSecondaryStock,
            unitPrice: priceToUse,
            totalPrice: Math.abs(quantityToAdd) * priceToUse,
            userId,
            notes: notes || (isAdjustment ? 'Барааны тохируулга' : 'Бараа татан авалт')
          }
        });
      }
      
      return updatedProduct;
    }, { maxWait: 10000, timeout: 20000 });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// Manual Material Issue to Production / Other Outbound
app.post('/api/inventory/issue', authenticate(['ADMIN', 'WAREHOUSE_WORKER', 'FINANCE']), async (req, res) => {
  const { items, notes, issueType } = req.body;
  try {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Зарлагадах бараа сонгоогүй байна.' });
    }

    const updatedProducts = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`Бараа олдсонгүй (ID: ${item.productId})`);
        
        if (product.stockQuantity < item.quantity) {
          throw new Error(`'${product.name}' үлдэгдэл хүрэхгүй байна. (Үлдэгдэл: ${product.stockQuantity})`);
        }
        
        const newStock = product.stockQuantity - item.quantity;
        const newSecondaryStock = item.secondaryQuantity !== undefined
            ? (product.stockSecondaryQuantity || 0) - item.secondaryQuantity
            : undefined;
        
        const updatedProduct = await tx.product.update({
          where: { id: item.productId },
          data: { 
            stockQuantity: newStock,
            ...(newSecondaryStock !== undefined ? { stockSecondaryQuantity: newSecondaryStock } : {})
          },
        });
        
        const priceToUse = Number(product.costPrice) > 0 ? Number(product.costPrice) : Number(product.unitPrice);
        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            type: issueType === 'ADJUSTMENT' ? 'ADJUSTMENT' : 'OUTBOUND',
            quantity: -Math.abs(item.quantity),
            secondaryQuantity: item.secondaryQuantity !== undefined ? -Math.abs(item.secondaryQuantity) : undefined,
            previousStock: product.stockQuantity,
            newStock,
            previousSecondaryStock: product.stockSecondaryQuantity,
            newSecondaryStock: newSecondaryStock,
            unitPrice: priceToUse,
            totalPrice: Math.abs(item.quantity) * priceToUse,
            userId: req.user!.id,
            notes: notes || 'Гараар зарлагадсан'
          }
        });
        
        results.push(updatedProduct);
      }
      return results;
    }, { maxWait: 15000, timeout: 30000 });
    
    res.json({ success: true, updatedCount: updatedProducts.length });
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

// Reports
app.get('/api/reports/transactions', authenticate(['ADMIN', 'WAREHOUSE_WORKER', 'FINANCE']), async (req, res) => {
  try {
    const transactions = await prisma.inventoryTransaction.findMany({
      include: {
        product: { select: { sku: true, name: true } },
        user: { select: { name: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(transactions);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.get('/api/reports/transactions/paginated', authenticate(['ADMIN', 'WAREHOUSE_WORKER', 'FINANCE']), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const { search, type, startDate, endDate } = req.query;
    
    const where: any = {};
    if (type && type !== 'ALL') {
      where.type = type;
    }
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    if (search) {
      where.OR = [
        { product: { name: { contains: search as string, mode: 'insensitive' } } },
        { product: { sku: { contains: search as string, mode: 'insensitive' } } },
        { notes: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [total, transactions] = await Promise.all([
      prisma.inventoryTransaction.count({ where }),
      prisma.inventoryTransaction.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: { select: { sku: true, name: true, costPrice: true, unitPrice: true } },
          user: { select: { name: true, role: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    res.json({
      data: transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    handleApiError(res, err);
  }
});

// Orders
app.get('/api/orders', authenticate(), async (req, res) => {
  // Lightweight orders for global dashboard stats
  const orders = await prisma.order.findMany({
    include: {
      branch: { select: { name: true, location: true } },
      createdBy: { select: { name: true } },
      deliveredBy: { select: { name: true } },
      items: { include: { product: true } }
    },
    orderBy: { createdAt: 'desc' },
  });
  
  const formattedOrders = orders.map(o => ({
    id: o.id,
    orderNumber: o.orderNumber,
    branchId: o.branchId,
    branchName: o.branch?.name,
    branchLocation: o.branch?.location,
    status: o.status,
    totalAmount: Number(o.totalAmount),
    baseTotalAmount: Number(o.baseTotalAmount || 0),
    marginProfit: Number(o.marginProfit || 0),
    createdById: o.createdById,
    createdByName: o.createdBy?.name,
    deliveredById: o.deliveredById,
    deliveredByName: o.deliveredBy?.name,
    deliveredAt: o.deliveredAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    items: o.items.map(i => ({
      id: i.id,
      orderId: i.orderId,
      productId: i.productId,
      productName: i.product?.name || 'Тодорхойгүй',
      sku: i.product?.sku || '',
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice)
    })),
    history: []
  }));
  
  res.json(formattedOrders);
});

app.get('/api/orders/paginated', authenticate(), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [total, orders] = await Promise.all([
      prisma.order.count(),
      prisma.order.findMany({
        skip,
        take: limit,
        include: {
          branch: true,
          createdBy: true,
          deliveredBy: true,
          items: { include: { product: true } },
          // Note: history is still omitted for list view
        },
        orderBy: { createdAt: 'desc' },
      })
    ]);

    const formattedOrders = orders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      branchId: o.branchId,
      branchName: o.branch?.name,
      branchLocation: o.branch?.location,
      status: o.status,
      totalAmount: Number(o.totalAmount),
      baseTotalAmount: Number(o.baseTotalAmount || 0),
      marginProfit: Number(o.marginProfit || 0),
      createdById: o.createdById,
      createdByName: o.createdBy?.name,
      deliveredById: o.deliveredById,
      deliveredByName: o.deliveredBy?.name,
      deliveredAt: o.deliveredAt,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      items: o.items.map(i => ({
        id: i.id,
        orderId: i.orderId,
        productId: i.productId,
        productName: i.product?.name,
        sku: i.product?.sku,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
      history: []
    }));

    res.json({
      data: formattedOrders,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.get('/api/orders/:id/history', authenticate(), async (req, res) => {
  try {
    const { id } = req.params;
    const history = await prisma.orderHistory.findMany({
      where: { orderId: id },
      include: { changedBy: true },
      orderBy: { createdAt: 'asc' }
    });
    
    const formatted = history.map(h => ({
      id: h.id,
      orderId: h.orderId,
      changedById: h.changedById,
      changedByName: h.changedBy?.name,
      changedByRole: h.changedBy?.role,
      status: h.status,
      notes: h.notes,
      itemsSnapshot: h.itemsSnapshot,
      createdAt: h.createdAt,
    }));
    
    res.json(formatted);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.get('/api/order-histories/paginated', authenticate(['ADMIN', 'WAREHOUSE_WORKER', 'FINANCE']), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [total, history] = await Promise.all([
      prisma.orderHistory.count(),
      prisma.orderHistory.findMany({
        skip,
        take: limit,
        include: { 
          order: { include: { branch: true } }, 
          changedBy: true 
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const formatted = history.map(h => ({
      id: h.id,
      orderId: h.orderId,
      orderNumber: h.order?.orderNumber,
      branchName: h.order?.branch?.name,
      changedById: h.changedById,
      changedByName: h.changedBy?.name,
      changedByRole: h.changedBy?.role,
      status: h.status,
      notes: h.notes,
      itemsSnapshot: h.itemsSnapshot,
      createdAt: h.createdAt,
    }));

    res.json({
      data: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    handleApiError(res, err);
  }
});


app.post('/api/orders', authenticate(['ADMIN', 'WAREHOUSE_WORKER']), async (req, res) => {
  const { branchId, createdById, itemsInput, notes } = req.body;
  try {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    const creator = await prisma.user.findUnique({ where: { id: createdById } });
    if (!branch || !creator) return res.status(404).json({ error: 'Branch or user not found' });

    let totalAmount = 0;
    let baseTotalAmount = 0;
    let profitTotalAmount = 0;
    let commissionTotalAmount = 0;
    let vatTotalAmount = 0;
    let marginProfit = 0;
    const itemsData = [];
    
    const profitPercent = branch.profitPercent || 0;
    
    for (const item of itemsInput) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) return res.status(404).json({ error: `Product ${item.productId} not found` });
      
      const commissionPercent = product.commissionPercent || 0;
      const vatPercent = product.vatPercent || 0;
      
      const baseCost = Number(product.costPrice) > 0 ? Number(product.costPrice) : Number(product.unitPrice);
      
      const profitAmt = baseCost * (profitPercent / 100);
      const costPlusProfit = baseCost + profitAmt;
      
      const commissionAmt = costPlusProfit * (commissionPercent / 100);
      const costPlusProfitPlusComm = costPlusProfit + commissionAmt;
      
      const vatAmt = costPlusProfitPlusComm * (vatPercent / 100);
      
      const effectivePrice = costPlusProfitPlusComm + vatAmt;
      
      const itemBaseTotal = baseCost * item.quantity;
      const itemProfitTotal = profitAmt * item.quantity;
      const itemCommTotal = commissionAmt * item.quantity;
      const itemVatTotal = vatAmt * item.quantity;
      const itemEffectiveTotal = effectivePrice * item.quantity;
      
      totalAmount += itemEffectiveTotal;
      baseTotalAmount += itemBaseTotal;
      profitTotalAmount += itemProfitTotal;
      commissionTotalAmount += itemCommTotal;
      vatTotalAmount += itemVatTotal;
      marginProfit += (itemEffectiveTotal - itemBaseTotal);
      
      itemsData.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: effectivePrice,
        totalPrice: itemEffectiveTotal,
        sku: product.sku,
      });
    }

    const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          branchId,
          createdById,
          totalAmount,
          baseTotalAmount,
          profitTotalAmount,
          commissionTotalAmount,
          vatTotalAmount,
          marginProfit,
          status: 'PENDING',
          items: {
            create: itemsData.map(i => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.totalPrice
            }))
          },
          history: {
            create: {
              changedById: createdById,
              status: 'PENDING',
              notes: notes || 'Order initialized',
              itemsSnapshot: JSON.stringify(itemsData.map(i => ({ sku: i.sku, qty: i.quantity, price: Number(i.unitPrice) })))
            }
          }
        },
        include: { items: true, history: true, branch: true, createdBy: true }
      });
      
      await tx.branch.update({
        where: { id: branchId },
        data: { lastActivityAt: new Date() }
      });
      
      return order;
    }, { maxWait: 10000, timeout: 20000 });

    sendSSEEvent('order_created', { orderNumber: newOrder.orderNumber, branchName: newOrder.branch.name });

    res.json(newOrder);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/orders/:id/deliver', authenticate(['ADMIN', 'DELIVERY_DRIVER']), async (req, res) => {
  const { id } = req.params;
  const { driverId, notes } = req.body;
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } }
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'DELIVERED') return res.status(400).json({ error: 'Order already delivered' });

    await prisma.$transaction(async (tx) => {
      // Deduct inventory
      for (const item of order.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${product?.sku}`);
        }
        
        const newStock = product.stockQuantity - item.quantity;
        await tx.product.update({
          where: { id: product.id },
          data: { stockQuantity: newStock }
        });
        
        const priceToUse = Number(product.costPrice) > 0 ? Number(product.costPrice) : Number(product.unitPrice);
        await tx.inventoryTransaction.create({
          data: {
            productId: product.id,
            type: 'OUTBOUND',
            quantity: -item.quantity,
            previousStock: product.stockQuantity,
            newStock,
            unitPrice: priceToUse,
            totalPrice: item.quantity * priceToUse,
            userId: driverId,
            referenceId: order.orderNumber,
            notes: `Захиалгын хүргэлт (${order.orderNumber})`
          }
        });

        // Add to Branch Inventory
        const existingBranchInv = await tx.branchInventory.findUnique({
          where: { branchId_productId: { branchId: order.branchId, productId: product.id } }
        });
        
        if (existingBranchInv) {
          await tx.branchInventory.update({
            where: { id: existingBranchInv.id },
            data: { quantity: existingBranchInv.quantity + item.quantity }
          });
        } else {
          await tx.branchInventory.create({
            data: {
              branchId: order.branchId,
              productId: product.id,
              quantity: item.quantity
            }
          });
        }
      }

      // Update order
      await tx.order.update({
        where: { id },
        data: {
          status: 'DELIVERED',
          deliveredById: driverId,
          deliveredAt: new Date(),
          history: {
            create: {
              changedById: driverId,
              status: 'DELIVERED',
              notes: notes || 'Order delivered',
              itemsSnapshot: JSON.stringify(order.items.map(i => ({ sku: i.product?.sku, qty: i.quantity })))
            }
          }
        }
      });
      
      // Update branch activity
      await tx.branch.update({
        where: { id: order.branchId },
        data: { lastActivityAt: new Date() }
      });
    }, { maxWait: 10000, timeout: 20000 });

    sendSSEEvent('order_status_updated', { orderNumber: order.orderNumber, status: 'DELIVERED' });

    res.json({ success: true });
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.put('/api/orders/:id/status', authenticate(['ADMIN', 'WAREHOUSE_WORKER', 'DELIVERY_DRIVER']), async (req, res) => {
  const { id } = req.params;
  const { newStatus, changedById, notes } = req.body;
  try {
    if (newStatus === 'DELIVERED') {
      return res.status(400).json({ error: 'Төлөвийг DELIVERED болгохын тулд /api/orders/:id/deliver API-г ашиглана уу (Үлдэгдэл хасагдах шаардлагатай)' });
    }

    const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: true } } } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: newStatus,
        history: {
          create: {
            changedById,
            status: newStatus,
            notes: notes || `Status changed to ${newStatus}`,
            itemsSnapshot: JSON.stringify(order.items.map(i => ({ sku: i.product?.sku, qty: i.quantity })))
          }
        }
      },
      include: { history: { include: { changedBy: true }, orderBy: { createdAt: 'asc' } }, branch: true, createdBy: true, deliveredBy: true, items: { include: { product: true } } }
    });
    
    sendSSEEvent('order_status_updated', { orderNumber: updated.orderNumber, status: updated.status });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// ------------------------------------------
// Task Management
// ------------------------------------------
app.get('/api/tasks', authenticate(), async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        assignee: { select: { id: true, name: true, role: true } },
        creator: { select: { id: true, name: true, role: true } },
        comments: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/tasks', authenticate(), async (req: Request, res: Response) => {
  try {
    const { title, description, priority, assigneeId, dueDate, branchId, productId, orderId, subtasks, attachments } = req.body;
    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || 'NORMAL',
        assigneeId,
        creatorId: req.user!.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        branchId,
        productId,
        orderId,
        subtasks,
        attachments
      },
      include: {
        assignee: { select: { id: true, name: true, role: true } },
        creator: { select: { id: true, name: true, role: true } },
        comments: true
      }
    });
    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/api/tasks/:id', authenticate(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, title, description, priority, assigneeId, dueDate, subtasks, attachments } = req.body;
    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(title && { title }),
        ...(description && { description }),
        ...(priority && { priority }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(subtasks !== undefined && { subtasks }),
        ...(attachments !== undefined && { attachments })
      },
      include: {
        assignee: { select: { id: true, name: true, role: true } },
        creator: { select: { id: true, name: true, role: true } },
        comments: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } }
      }
    });
    res.json(task);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.post('/api/tasks/:id/comments', authenticate(), async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  try {
    const newComment = await prisma.taskComment.create({
      data: {
        taskId: id,
        userId: req.user!.id,
        content
      },
      include: { user: { select: { id: true, name: true } } }
    });
    res.json(newComment);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

// ==========================================
// Audit Logs API Routes
// ==========================================

app.get('/api/audit/order-history', authenticate(['ADMIN']), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 500;
    const history = await prisma.orderHistory.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: { orderNumber: true, branch: { select: { name: true } } }
        },
        changedBy: {
          select: { name: true, role: true }
        }
      }
    });
    res.json(history);
  } catch (err) {
    handleApiError(res, err);
  }
});

// ==========================================
// BOM (Bill of Materials / Жор) API Routes
// ==========================================

app.get('/api/boms', authenticate(['ADMIN', 'FINANCE', 'WAREHOUSE_WORKER', 'PRODUCTION']), async (req, res) => {
  try {
    const boms = await prisma.bOM.findMany({
      include: {
        finishedProduct: true,
        items: {
          include: { ingredient: true }
        },
        steps: {
          orderBy: { stepNumber: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(boms);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/boms', authenticate(['ADMIN', 'WAREHOUSE_WORKER', 'FINANCE']), async (req, res) => {
  try {
    const {
      finishedProductId,
      name,
      description,
      laborNormCost,
      overheadAllocationCost,
      targetProfitMargin,
      vatRate,
      retailMarginRate,
      calculatedUnitCost,
      suggestedRetailPrice,
      items,
      version,
      isApproved,
      preparationTimeMinutes,
      cookingTimeMinutes,
      shelfLifeDays,
      instructions,
      mediaUrls,
      allergens,
      nutritionInfo,
      steps
    } = req.body;
    
    // Check if BOM exists for finishedProduct
    const existing = await prisma.bOM.findFirst({
      where: { finishedProductId }
    });

    const bomData = {
      name: name || 'Стандарт Жор',
      description,
      laborNormCost: Number(laborNormCost || 0),
      overheadAllocationCost: Number(overheadAllocationCost || 0),
      targetProfitMargin: Number(targetProfitMargin || 30),
      vatRate: Number(vatRate || 10),
      retailMarginRate: Number(retailMarginRate || 32),
      calculatedUnitCost: Number(calculatedUnitCost || 0),
      suggestedRetailPrice: Number(suggestedRetailPrice || 0),
      version: version || 'v1.0',
      isApproved: Boolean(isApproved),
      preparationTimeMinutes: Number(preparationTimeMinutes || 0),
      cookingTimeMinutes: Number(cookingTimeMinutes || 0),
      shelfLifeDays: Number(shelfLifeDays || 0),
      instructions,
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
      allergens: Array.isArray(allergens) ? allergens : [],
      nutritionInfo,
    };

    let bom;
    if (existing) {
      // Update BOM items and steps
      await prisma.bOMItem.deleteMany({ where: { bomId: existing.id } });
      await prisma.techCardStep.deleteMany({ where: { bomId: existing.id } });
      bom = await prisma.bOM.update({
        where: { id: existing.id },
        data: {
          ...bomData,
          items: {
            create: (items || []).map((item: any) => ({
              ingredientId: item.ingredientId,
              quantityPerUnit: Number(item.quantityPerUnit || 0),
              grossQuantity: Number(item.grossQuantity || 0),
              shrinkagePercent: Number(item.shrinkagePercent || 0),
              itemCategory: item.itemCategory || 'RAW_MATERIAL'
            }))
          },
          steps: {
            create: (steps || []).map((step: any, idx: number) => ({
              stepNumber: Number(step.stepNumber || idx + 1),
              title: step.title || `Алхам ${idx + 1}`,
              description: step.description,
              timeMinutes: Number(step.timeMinutes || 0),
              temperature: step.temperature ? Number(step.temperature) : null,
              equipmentNeeded: Array.isArray(step.equipmentNeeded) ? step.equipmentNeeded : []
            }))
          }
        },
        include: {
          finishedProduct: true,
          items: { include: { ingredient: true } },
          steps: { orderBy: { stepNumber: 'asc' } }
        }
      });
    } else {
      bom = await prisma.bOM.create({
        data: {
          finishedProductId,
          ...bomData,
          items: {
            create: (items || []).map((item: any) => ({
              ingredientId: item.ingredientId,
              quantityPerUnit: Number(item.quantityPerUnit || 0),
              grossQuantity: Number(item.grossQuantity || 0),
              shrinkagePercent: Number(item.shrinkagePercent || 0),
              itemCategory: item.itemCategory || 'RAW_MATERIAL'
            }))
          },
          steps: {
            create: (steps || []).map((step: any, idx: number) => ({
              stepNumber: Number(step.stepNumber || idx + 1),
              title: step.title || `Алхам ${idx + 1}`,
              description: step.description,
              timeMinutes: Number(step.timeMinutes || 0),
              temperature: step.temperature ? Number(step.temperature) : null,
              equipmentNeeded: Array.isArray(step.equipmentNeeded) ? step.equipmentNeeded : []
            }))
          }
        },
        include: {
          finishedProduct: true,
          items: { include: { ingredient: true } },
          steps: { orderBy: { stepNumber: 'asc' } }
        }
      });
    }

    // Also update costPrice of finishedProduct if calculatedUnitCost > 0
    if (calculatedUnitCost && Number(calculatedUnitCost) > 0) {
      await prisma.product.update({
        where: { id: finishedProductId },
        data: { costPrice: Number(calculatedUnitCost) }
      });
    }

    // Auto recalculate all finished goods costs to ensure accuracy
    await recalculateFinishedGoodsCosts();

    res.json(bom);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.delete('/api/boms/:id', authenticate(['ADMIN']), async (req, res) => {
  try {
    await prisma.bOM.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

// Deboning Logs (Шулаа ба Анхан шатны боловсруулалт)
app.get('/api/deboning-logs', authenticate(['ADMIN', 'FINANCE', 'WAREHOUSE_WORKER']), async (req, res) => {
  try {
    const logs = await prisma.deboningLog.findMany({
      orderBy: { date: 'desc' }
    });
    res.json(logs);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/deboning-logs', authenticate(['ADMIN', 'WAREHOUSE_WORKER', 'FINANCE']), async (req, res) => {
  try {
    const { date, animalType, grossWeight, boneWasteWeight, netMeatWeight, yieldPercentage, notes } = req.body;
    const log = await prisma.deboningLog.create({
      data: {
        date: date ? new Date(date) : new Date(),
        animalType,
        grossWeight: Number(grossWeight),
        boneWasteWeight: Number(boneWasteWeight),
        netMeatWeight: Number(netMeatWeight),
        yieldPercentage: Number(yieldPercentage),
        notes
      }
    });
    res.json(log);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

// Livestock Ledgers (Малын тооцоо & Бой)
app.get('/api/livestock-ledgers', authenticate(['ADMIN', 'FINANCE', 'WAREHOUSE_WORKER']), async (req, res) => {
  try {
    const ledgers = await prisma.livestockLedger.findMany({
      orderBy: { date: 'desc' }
    });
    res.json(ledgers);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/livestock-ledgers', authenticate(['ADMIN', 'WAREHOUSE_WORKER', 'FINANCE']), async (req, res) => {
  try {
    const { date, receivedCount, slaughteredCount, staffFoodCount, deadCount, soldCount, returnedCount, endingCount, notes } = req.body;
    const ledger = await prisma.livestockLedger.create({
      data: {
        date: date ? new Date(date) : new Date(),
        receivedCount: Number(receivedCount || 0),
        slaughteredCount: Number(slaughteredCount || 0),
        staffFoodCount: Number(staffFoodCount || 0),
        deadCount: Number(deadCount || 0),
        soldCount: Number(soldCount || 0),
        returnedCount: Number(returnedCount || 0),
        endingCount: Number(endingCount || 0),
        notes
      }
    });
    res.json(ledger);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

// ==========================================
// Procurement (Татан авалт) API Routes
// ==========================================

app.get('/api/procurements', authenticate(['ADMIN', 'FINANCE', 'WAREHOUSE_WORKER']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    const procurements = await prisma.procurement.findMany({
      where,
      include: {
        items: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(procurements);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/procurements', authenticate(['ADMIN', 'WAREHOUSE_WORKER']), async (req, res) => {
  try {
    const { supplierName, notes, items } = req.body; // items: [{ productId, quantity, unitPrice }]
    
    const procurementNo = `PROC-${Date.now().toString().slice(-6)}`;
    
    let totalAmount = 0;
    const itemsData = (items || []).map((item: any) => {
      const q = Number(item.quantity || 0);
      const p = Number(item.unitPrice || 0);
      const sq = item.secondaryQuantity ? Number(item.secondaryQuantity) : undefined;
      const total = q * p;
      totalAmount += total;
      return {
        productId: item.productId,
        quantity: q,
        secondaryQuantity: sq,
        unitPrice: p,
        totalPrice: total
      };
    });

    const productIds = itemsData.map(i => i.productId);
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });
    const productMap = new Map(existingProducts.map(p => [p.id, p]));

    let proc;
    try {
      proc = await prisma.$transaction(async (tx) => {
        const createdProc = await tx.procurement.create({
          data: {
            procurementNo,
            supplierName,
            notes,
            totalAmount,
            items: { create: itemsData }
          },
          include: { items: { include: { product: true } } }
        });

        for (const item of itemsData) {
          const prod = productMap.get(item.productId);
          if (prod) {
            const newStock = prod.stockQuantity + item.quantity;
            const newSecondaryStock = item.secondaryQuantity !== undefined 
                ? (prod.stockSecondaryQuantity || 0) + item.secondaryQuantity
                : undefined;
                
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: newStock,
                costPrice: item.unitPrice,
                ...(newSecondaryStock !== undefined ? { stockSecondaryQuantity: newSecondaryStock } : {})
              }
            });
            await tx.inventoryTransaction.create({
              data: {
                productId: item.productId,
                type: 'INBOUND',
                quantity: item.quantity,
                secondaryQuantity: item.secondaryQuantity ? item.secondaryQuantity : undefined,
                previousStock: prod.stockQuantity,
                newStock: newStock,
                previousSecondaryStock: prod.stockSecondaryQuantity,
                newSecondaryStock: newSecondaryStock !== undefined ? newSecondaryStock : undefined,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                userId: req.user!.id,
                notes: `Татан авалт #${procurementNo} (${supplierName || 'Нэгдсэн татан авалт'})`
              }
            });
          }
        }
        return createdProc;
      }, { maxWait: 15000, timeout: 30000 });
    } catch (txErr: any) {
      console.warn("Transaction failed, using direct sequence fallback:", txErr.message);
      proc = await prisma.procurement.create({
        data: {
          procurementNo,
          supplierName,
          notes,
          totalAmount,
          items: { create: itemsData }
        },
        include: { items: { include: { product: true } } }
      });

      for (const item of itemsData) {
        const prod = productMap.get(item.productId) || await prisma.product.findUnique({ where: { id: item.productId } });
        if (prod) {
          const newStock = prod.stockQuantity + item.quantity;
          const newSecondaryStock = item.secondaryQuantity !== undefined 
              ? (prod.stockSecondaryQuantity || 0) + item.secondaryQuantity
              : undefined;

          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: newStock,
              costPrice: item.unitPrice,
              ...(newSecondaryStock !== undefined ? { stockSecondaryQuantity: newSecondaryStock } : {})
            }
          });
          await prisma.inventoryTransaction.create({
            data: {
              productId: item.productId,
              type: 'INBOUND',
              quantity: item.quantity,
              secondaryQuantity: item.secondaryQuantity ? item.secondaryQuantity : undefined,
              previousStock: prod.stockQuantity,
              newStock: newStock,
              previousSecondaryStock: prod.stockSecondaryQuantity,
              newSecondaryStock: newSecondaryStock !== undefined ? newSecondaryStock : undefined,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              userId: req.user!.id,
              notes: `Татан авалт #${procurementNo} (${supplierName || 'Нэгдсэн татан авалт'})`
            }
          });
        }
      }
    }

    // Auto recalculate all finished goods costs to ensure accuracy after ingredient prices change
    await recalculateFinishedGoodsCosts();

    res.status(201).json(proc);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

// ==========================================
// Production Batch & Costing API Routes
// ==========================================

app.get('/api/production-batches', authenticate(['ADMIN', 'FINANCE', 'WAREHOUSE_WORKER', 'PRODUCTION']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    const batches = await prisma.productionBatch.findMany({
      where,
      include: {
        finishedProduct: true,
        items: { include: { ingredient: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(batches);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.get('/api/production-batches/paginated', authenticate(), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [total, batches] = await Promise.all([
      prisma.productionBatch.count(),
      prisma.productionBatch.findMany({
        skip,
        take: limit,
        include: {
          finishedProduct: true,
          items: { include: { ingredient: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);
    
    res.json({
      data: batches,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/production-batches', authenticate(['ADMIN', 'WAREHOUSE_WORKER', 'PRODUCTION']), async (req, res) => {
  try {
    const {
      finishedProductId,
      quantityProduced,
      fixedOverheadCost,
      normalScrapAmount,
      abnormalScrapAmount,
      notes,
      customIngredients,
      checklistStatus,
      scrapAnalysisAlert
    } = req.body;

    const qProduced = Number(quantityProduced || 0);
    if (qProduced <= 0) {
      return res.status(400).json({ error: 'Үйлдвэрлэсэн хэмжээ 0-ээс их байх ёстой' });
    }

    const batchNumber = `BATCH-${Date.now().toString().slice(-6)}`;

    let ingredientsToUse: { ingredientId: string; quantityUsed: number }[] = [];

    if (customIngredients && Array.isArray(customIngredients) && customIngredients.length > 0) {
      ingredientsToUse = customIngredients.map((i: any) => ({
        ingredientId: i.ingredientId,
        quantityUsed: Number(i.quantityUsed || 0),
        secondaryQuantityUsed: i.secondaryQuantityUsed ? Number(i.secondaryQuantityUsed) : undefined
      }));
    } else {
      const bom = await prisma.bOM.findFirst({
        where: { finishedProductId },
        include: { items: true }
      });
      if (bom && bom.items.length > 0) {
        ingredientsToUse = bom.items.map(item => ({
          ingredientId: item.ingredientId,
          quantityUsed: item.quantityPerUnit * qProduced,
          secondaryQuantityUsed: undefined
        }));
      }
    }

    const ingredientIds = ingredientsToUse.map(i => i.ingredientId);
    const existingIngredients = await prisma.product.findMany({
      where: { id: { in: ingredientIds } }
    });
    const ingredientMap = new Map(existingIngredients.map(p => [p.id, p]));

    const finishedProd = await prisma.product.findUnique({ where: { id: finishedProductId } });
    if (!finishedProd) return res.status(404).json({ error: 'Бэлэн бүтээгдэхүүн олдсонгүй' });

    let totalMaterialCost = 0;
    const batchItemsData = [];

    for (const item of ingredientsToUse) {
      const prod = ingredientMap.get(item.ingredientId);
      if (!prod) throw new Error(`Материал олдсонгүй (ID: ${item.ingredientId})`);
      
      if (prod.stockQuantity < item.quantityUsed) {
        throw new Error(`Материал '${prod.name}' агуулахын үлдэгдэл хүрэлцэхгүй байна. Хэрэгцээт: ${item.quantityUsed}, Үлдэгдэл: ${prod.stockQuantity}`);
      }

      const price = Number(prod.costPrice) > 0 ? Number(prod.costPrice) : Number(prod.unitPrice);
      const itemTotalCost = item.quantityUsed * price;
      totalMaterialCost += itemTotalCost;

      batchItemsData.push({
        ingredientId: item.ingredientId,
        quantityUsed: item.quantityUsed,
        secondaryQuantityUsed: (item as any).secondaryQuantityUsed,
        unitPrice: price,
        totalPrice: itemTotalCost
      });
    }

    const overhead = Number(fixedOverheadCost || 0);
    const normalScrap = Number(normalScrapAmount || 0);
    const abnormalScrap = Number(abnormalScrapAmount || 0);

    const totalProductionCost = totalMaterialCost + overhead + normalScrap + abnormalScrap;
    const calculatedUnitCost = totalProductionCost / qProduced;

    let batch;
    try {
      batch = await prisma.$transaction(async (tx) => {
        for (const item of batchItemsData) {
          const prod = ingredientMap.get(item.ingredientId)!;
          const newStock = prod.stockQuantity - item.quantityUsed;
          const newSecondaryStock = item.secondaryQuantityUsed !== undefined
              ? (prod.stockSecondaryQuantity || 0) - item.secondaryQuantityUsed
              : undefined;

          await tx.product.update({
            where: { id: item.ingredientId },
            data: { 
              stockQuantity: newStock,
              ...(newSecondaryStock !== undefined ? { stockSecondaryQuantity: newSecondaryStock } : {})
            }
          });
          await tx.inventoryTransaction.create({
            data: {
              productId: item.ingredientId,
              type: 'OUTBOUND',
              quantity: -item.quantityUsed,
              secondaryQuantity: item.secondaryQuantityUsed ? -item.secondaryQuantityUsed : undefined,
              previousStock: prod.stockQuantity,
              newStock: newStock,
              previousSecondaryStock: prod.stockSecondaryQuantity,
              newSecondaryStock: newSecondaryStock !== undefined ? newSecondaryStock : undefined,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              userId: req.user!.id,
              notes: `Үйлдвэрлэлд олгосон ТЭМ/Материал #${batchNumber}`
            }
          });
        }

        const newFinishedStock = finishedProd.stockQuantity + qProduced;
        await tx.product.update({
          where: { id: finishedProductId },
          data: {
            stockQuantity: newFinishedStock,
            costPrice: calculatedUnitCost
          }
        });

        await tx.inventoryTransaction.create({
          data: {
            productId: finishedProductId,
            type: 'INBOUND',
            quantity: qProduced,
            previousStock: finishedProd.stockQuantity,
            newStock: newFinishedStock,
            unitPrice: calculatedUnitCost,
            totalPrice: qProduced * calculatedUnitCost,
            userId: req.user!.id,
            notes: `Үйлдвэрлэлээс хүлээн авсан бэлэн бүтээгдэхүүн #${batchNumber} (Өртөг: ₮${calculatedUnitCost.toLocaleString()}/нэгж)`
          }
        });

        return await tx.productionBatch.create({
          data: {
            batchNumber,
            finishedProductId,
            quantityProduced: qProduced,
            fixedOverheadCost: overhead,
            normalScrapAmount: normalScrap,
            abnormalScrapAmount: abnormalScrap,
            totalMaterialCost,
            totalProductionCost,
            calculatedUnitCost,
            notes,
            items: { create: batchItemsData }
          },
          include: {
            finishedProduct: true,
            items: { include: { ingredient: true } }
          }
        });
      }, { maxWait: 15000, timeout: 30000 });
    } catch (txErr: any) {
      console.warn("Production Batch transaction failed, using direct sequence fallback:", txErr.message);

      for (const item of batchItemsData) {
        const prod = ingredientMap.get(item.ingredientId)!;
        const newStock = prod.stockQuantity - item.quantityUsed;
        await prisma.product.update({
          where: { id: item.ingredientId },
          data: { stockQuantity: newStock }
        });
        await prisma.inventoryTransaction.create({
          data: {
            productId: item.ingredientId,
            type: 'OUTBOUND',
            quantity: -item.quantityUsed,
            previousStock: prod.stockQuantity,
            newStock: newStock,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            userId: req.user!.id,
            notes: `Үйлдвэрлэлд олгосон ТЭМ/Материал #${batchNumber}`
          }
        });
      }

      const newFinishedStock = finishedProd.stockQuantity + qProduced;
      await prisma.product.update({
        where: { id: finishedProductId },
        data: {
          stockQuantity: newFinishedStock,
          costPrice: calculatedUnitCost
        }
      });

      await prisma.inventoryTransaction.create({
        data: {
          productId: finishedProductId,
          type: 'INBOUND',
          quantity: qProduced,
          previousStock: finishedProd.stockQuantity,
          newStock: newFinishedStock,
          unitPrice: calculatedUnitCost,
          totalPrice: qProduced * calculatedUnitCost,
          userId: req.user!.id,
          notes: `Үйлдвэрлэлээс хүлээн авсан бэлэн бүтээгдэхүүн #${batchNumber} (Өртөг: ₮${calculatedUnitCost.toLocaleString()}/нэгж)`
        }
      });

      batch = await prisma.productionBatch.create({
        data: {
          batchNumber,
          finishedProductId,
          quantityProduced: qProduced,
          fixedOverheadCost: overhead,
          normalScrapAmount: normalScrap,
          abnormalScrapAmount: abnormalScrap,
          totalMaterialCost,
          totalProductionCost,
          calculatedUnitCost,
          notes,
          checklistStatus: checklistStatus ? JSON.stringify(checklistStatus) : null,
          scrapAnalysisAlert: Boolean(scrapAnalysisAlert),
          items: { create: batchItemsData }
        },
        include: {
          finishedProduct: true,
          items: { include: { ingredient: true } }
        }
      });
    }

    res.status(201).json(batch);
  } catch (err: any) {
    handleApiError(res, err, 400);
  }
});

// ==========================================
// Financial Summary & Analytics API Route
// ==========================================

app.get('/api/analytics/forecast', authenticate(['ADMIN', 'FINANCE', 'WAREHOUSE_WORKER']), async (req, res) => {
  try {
    // 30 days back
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deliveredOrders = await prisma.order.findMany({
      where: { 
        status: 'DELIVERED',
        createdAt: { gte: thirtyDaysAgo }
      },
      include: { items: { include: { product: true } } }
    });

    const salesByProduct = new Map<string, { id: string, name: string, totalSold: number, dailyAverage: number, forecast7Days: number }>();

    deliveredOrders.forEach(order => {
      order.items.forEach(item => {
        if (!item.product) return;
        const pId = item.product.id;
        const existing = salesByProduct.get(pId) || { id: pId, name: item.product.name, totalSold: 0, dailyAverage: 0, forecast7Days: 0 };
        existing.totalSold += item.quantity;
        salesByProduct.set(pId, existing);
      });
    });

    const results = Array.from(salesByProduct.values()).map(p => {
      p.dailyAverage = Number((p.totalSold / 30).toFixed(2));
      p.forecast7Days = Math.ceil(p.dailyAverage * 7);
      return p;
    }).sort((a, b) => b.forecast7Days - a.forecast7Days);

    res.json(results);
  } catch (err) {
    handleApiError(res, err);
  }
});

// ==========================================
// Expenses API Routes
// ==========================================

app.get('/api/expenses', authenticate(['ADMIN', 'FINANCE']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = {};
    if (startDate && endDate) {
      where.expenseDate = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    const expenses = await prisma.operatingExpense.findMany({
      where,
      include: {
        recordedBy: { select: { id: true, name: true, role: true } }
      },
      orderBy: { expenseDate: 'desc' }
    });
    res.json(expenses);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/expenses', authenticate(['ADMIN', 'FINANCE']), async (req, res) => {
  try {
    const { type, amount, expenseDate, notes } = req.body;
    const expense = await prisma.operatingExpense.create({
      data: {
        type,
        amount: Number(amount),
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        notes,
        recordedById: req.user!.id
      },
      include: {
        recordedBy: { select: { id: true, name: true, role: true } }
      }
    });
    res.status(201).json(expense);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.delete('/api/expenses/:id', authenticate(['ADMIN', 'FINANCE']), async (req, res) => {
  try {
    await prisma.operatingExpense.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.get('/api/financial-summary', authenticate(['ADMIN', 'FINANCE']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const expenseDateFilter: any = {};
    if (startDate && endDate) {
      expenseDateFilter.expenseDate = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    // Fetch aggregates instead of full records for orders, procurements, and batches
    const [
      procurementAgg,
      batchAgg,
      orderAgg,
      expenseAgg
    ] = await Promise.all([
      prisma.procurement.aggregate({
        _sum: { totalAmount: true },
        where: dateFilter
      }),
      prisma.productionBatch.aggregate({
        _sum: {
          totalMaterialCost: true,
          fixedOverheadCost: true,
          normalScrapAmount: true,
          abnormalScrapAmount: true,
          totalProductionCost: true
        },
        where: dateFilter
      }),
      prisma.order.aggregate({
        _sum: {
          totalAmount: true,
          baseTotalAmount: true,
          marginProfit: true
        },
        where: { status: 'DELIVERED', ...dateFilter }
      }),
      prisma.operatingExpense.aggregate({
        _sum: { amount: true },
        where: expenseDateFilter
      })
    ]);

    // For products, only select needed fields for valuation and analysis to reduce payload size
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        sku: true,
        name: true,
        unit: true,
        materialType: true,
        stockQuantity: true,
        costPrice: true,
        unitPrice: true,
      }
    });

    const finishedGoodsIds = products.filter(p => p.materialType === 'FINISHED_GOOD' || !p.materialType).map(p => p.id);

    // Only fetch BOMs for finished goods
    const boms = await prisma.bOM.findMany({
      where: { finishedProductId: { in: finishedGoodsIds } },
      include: {
        items: {
          include: {
            ingredient: { select: { id: true, name: true, sku: true, unit: true, materialType: true, costPrice: true, unitPrice: true } }
          }
        }
      }
    });
    const bomMap = new Map(boms.map(b => [b.finishedProductId, b]));

    // Fetch minimal data for manual outbounds and adjustments
    const adjustments = await prisma.inventoryTransaction.findMany({
      where: { type: 'ADJUSTMENT', ...dateFilter },
      select: { previousStock: true, newStock: true, unitPrice: true, totalPrice: true, product: { select: { costPrice: true, unitPrice: true } } }
    });

    const manualOutbounds = await prisma.inventoryTransaction.findMany({
      where: { 
        type: 'OUTBOUND', 
        ...dateFilter,
        OR: [
          { notes: null },
          { NOT: { notes: { startsWith: 'Хүргэлт' } } }
        ]
      },
      select: { quantity: true, unitPrice: true, totalPrice: true, product: { select: { costPrice: true, unitPrice: true } } }
    });

    // 1. Inventory Valuation by Material Type
    const inventoryValuation = {
      RAW_MATERIAL: { count: 0, totalQuantity: 0, totalValue: 0 },
      PACKAGING: { count: 0, totalQuantity: 0, totalValue: 0 },
      AUXILIARY: { count: 0, totalQuantity: 0, totalValue: 0 },
      SUPPLY: { count: 0, totalQuantity: 0, totalValue: 0 },
      FINISHED_GOOD: { count: 0, totalQuantity: 0, totalValue: 0 },
    };

    products.forEach(p => {
      const mType = (p.materialType || 'FINISHED_GOOD') as keyof typeof inventoryValuation;
      const price = Number(p.costPrice) > 0 ? Number(p.costPrice) : Number(p.unitPrice);
      if (inventoryValuation[mType]) {
        inventoryValuation[mType].count += 1;
        inventoryValuation[mType].totalQuantity += p.stockQuantity;
        inventoryValuation[mType].totalValue += p.stockQuantity * price;
      }
    });

    // 2. Per-Product Financial Analysis (Finished Goods)
    const finishedGoodsAnalysis = products
      .filter(p => p.materialType === 'FINISHED_GOOD' || !p.materialType)
      .map(p => {
        const bom = bomMap.get(p.id);

        let rawMaterialCost = 0;
        let packagingCost = 0;
        let auxiliaryCost = 0;
        const bomDetails: any[] = [];

        if (bom && bom.items) {
          bom.items.forEach(bItem => {
            const ing = bItem.ingredient;
            if (ing) {
              const ingPrice = Number(ing.costPrice) > 0 ? Number(ing.costPrice) : Number(ing.unitPrice);
              const lineCost = bItem.quantityPerUnit * ingPrice;
              const mType = ing.materialType || 'RAW_MATERIAL';

              if (mType === 'RAW_MATERIAL') rawMaterialCost += lineCost;
              else if (mType === 'PACKAGING') packagingCost += lineCost;
              else auxiliaryCost += lineCost;

              bomDetails.push({
                ingredientId: ing.id,
                name: ing.name,
                sku: ing.sku,
                unit: ing.unit || 'ш',
                materialType: mType,
                quantityPerUnit: bItem.quantityPerUnit,
                unitCost: ingPrice,
                lineCost
              });
            }
          });
        }

        const bomMaterialTotal = rawMaterialCost + packagingCost + auxiliaryCost;
        const cost = Number(p.costPrice) > 0 ? Number(p.costPrice) : (bomMaterialTotal > 0 ? bomMaterialTotal : Number(p.unitPrice) * 0.7);
        const sellingPrice = Number(p.unitPrice);
        const unitMarginProfit = sellingPrice - cost;
        const marginPercent = sellingPrice > 0 ? (unitMarginProfit / sellingPrice) * 100 : 0;
        const totalStockValue = p.stockQuantity * cost;
        const totalStockRevenuePotential = p.stockQuantity * sellingPrice;
        const totalStockMarginPotential = p.stockQuantity * unitMarginProfit;

        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          unit: p.unit || 'ш',
          stockQuantity: p.stockQuantity,
          unitCostPrice: cost,
          unitSellingPrice: sellingPrice,
          unitMarginProfit,
          marginPercent,
          totalStockValue,
          totalStockRevenuePotential,
          totalStockMarginPotential,
          rawMaterialCost,
          packagingCost,
          auxiliaryCost,
          bomMaterialTotal,
          bomDetails
        };
      });

    // 3. Consolidated Totals
    const totalProcurementAmount = Number(procurementAgg._sum.totalAmount || 0);
    const totalMaterialsIssuedCost = Number(batchAgg._sum.totalMaterialCost || 0);
    const totalFixedOverheadCost = Number(batchAgg._sum.fixedOverheadCost || 0);
    const totalNormalScrapLoss = Number(batchAgg._sum.normalScrapAmount || 0);
    const totalAbnormalScrapLoss = Number(batchAgg._sum.abnormalScrapAmount || 0);
    const totalScrapLoss = totalNormalScrapLoss + totalAbnormalScrapLoss;
    const totalProductionCost = Number(batchAgg._sum.totalProductionCost || 0);
    
    // Calculate Manual Outbound Cost (Internal Issue)
    const totalManualOutboundCost = manualOutbounds.reduce((sum, tx) => {
      const price = Number(tx.unitPrice) > 0 ? Number(tx.unitPrice) : (Number(tx.product.costPrice) > 0 ? Number(tx.product.costPrice) : Number(tx.product.unitPrice));
      const total = Number(tx.totalPrice) > 0 ? Number(tx.totalPrice) : (Math.abs(tx.quantity) * price);
      return sum + total;
    }, 0);
    
    // Calculate Adjustment impact (negative is loss, positive is gain)
    const totalAdjustmentImpact = adjustments.reduce((sum, adj) => {
      const price = Number(adj.unitPrice) > 0 ? Number(adj.unitPrice) : (Number(adj.product.costPrice) > 0 ? Number(adj.product.costPrice) : Number(adj.product.unitPrice));
      const total = Number(adj.totalPrice) > 0 ? Number(adj.totalPrice) : (Math.abs(adj.newStock - adj.previousStock) * price);
      const diff = adj.newStock - adj.previousStock;
      return sum + (diff < 0 ? -total : total);
    }, 0);

    const totalDeliveredRevenue = Number(orderAgg._sum.totalAmount || 0);
    const totalDeliveredBaseCost = Number(orderAgg._sum.baseTotalAmount || 0);
    const totalDeliveredNetProfit = Number(orderAgg._sum.marginProfit || 0);
    const totalOperatingExpense = Number(expenseAgg._sum.amount || 0);

    res.json({
      inventoryValuation,
      finishedGoodsAnalysis,
      summary: {
        totalProcurementAmount,
        totalMaterialsIssuedCost,
        totalManualOutboundCost,
        totalFixedOverheadCost,
        totalNormalScrapLoss,
        totalAbnormalScrapLoss,
        totalScrapLoss,
        totalOperatingExpense,
        totalProductionCost,
        totalDeliveredRevenue,
        totalDeliveredBaseCost,
        totalDeliveredNetProfit,
        totalAdjustmentImpact
      }
    });
  } catch (err) {
    handleApiError(res, err);
  }
});

// ------------------------------------------
// Order Status Configuration
// ------------------------------------------

app.get('/api/order-statuses', authenticate(), async (req, res) => {
  try {
    const statuses = await prisma.orderStatusConfig.findMany({
      orderBy: { orderIndex: 'asc' }
    });
    res.json(statuses);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/order-statuses', authenticate(['ADMIN']), async (req, res) => {
  try {
    const { code, label, colorClass, orderIndex, isSystem } = req.body;
    const status = await prisma.orderStatusConfig.create({
      data: { code, label, colorClass, orderIndex, isSystem: isSystem || false }
    });
    res.status(201).json(status);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.put('/api/order-statuses/:id', authenticate(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { label, colorClass, orderIndex } = req.body;
    
    // Check if system
    const existing = await prisma.orderStatusConfig.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Status not found' });

    const status = await prisma.orderStatusConfig.update({
      where: { id },
      data: { label, colorClass, orderIndex }
    });
    res.json(status);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.delete('/api/order-statuses/:id', authenticate(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.orderStatusConfig.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Status not found' });
    if (existing.isSystem) return res.status(400).json({ error: 'Cannot delete system status' });

    // Check if in use
    const ordersInUse = await prisma.order.count({ where: { status: existing.code } });
    if (ordersInUse > 0) return res.status(400).json({ error: `Cannot delete status in use by ${ordersInUse} orders` });

    await prisma.orderStatusConfig.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.get('/api/manufacturing-report', authenticate(['ADMIN', 'FINANCE', 'WAREHOUSE_WORKER']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    // Fetch all production batches in range with their finished product
    const batches = await prisma.productionBatch.findMany({
      where: dateFilter,
      include: {
        finishedProduct: true
      }
    });

    // Aggregate by finishedProductId
    const reportMap = new Map<string, any>();

    let totalProducedQuantity = 0;
    let totalMaterialCost = 0;
    let totalOverheadCost = 0;
    let totalScrapCost = 0;
    let totalProductionCost = 0;

    for (const batch of batches) {
      if (!batch.finishedProductId || !batch.finishedProduct) continue;

      const pid = batch.finishedProductId;
      if (!reportMap.has(pid)) {
        reportMap.set(pid, {
          productId: pid,
          productName: batch.finishedProduct.name,
          sku: batch.finishedProduct.sku,
          unit: batch.finishedProduct.unit || 'ш',
          quantityProduced: 0,
          materialCost: 0,
          overheadCost: 0,
          scrapCost: 0,
          totalCost: 0
        });
      }

      const item = reportMap.get(pid);
      item.quantityProduced += batch.quantityProduced;
      item.materialCost += Number(batch.totalMaterialCost || 0);
      item.overheadCost += Number(batch.fixedOverheadCost || 0);
      const batchScrap = Number(batch.normalScrapAmount || 0) + Number(batch.abnormalScrapAmount || 0);
      item.scrapCost += batchScrap;
      item.totalCost += Number(batch.totalProductionCost || 0);

      // Global totals
      totalProducedQuantity += batch.quantityProduced;
      totalMaterialCost += Number(batch.totalMaterialCost || 0);
      totalOverheadCost += Number(batch.fixedOverheadCost || 0);
      totalScrapCost += batchScrap;
      totalProductionCost += Number(batch.totalProductionCost || 0);
    }

    // Calculate unit costs
    const details = Array.from(reportMap.values()).map(item => ({
      ...item,
      avgUnitCost: item.quantityProduced > 0 ? item.totalCost / item.quantityProduced : 0
    }));

    res.json({
      summary: {
        totalProducedQuantity,
        totalMaterialCost,
        totalOverheadCost,
        totalScrapCost,
        totalProductionCost
      },
      details
    });
  } catch (err) {
      handleApiError(res, err);
  }
});

// ==========================================
// DATA_ADMIN API Endpoints
// ==========================================

// Get Full Backup
app.get('/api/data-admin/backup', authenticate(['DATA_ADMIN']), async (req, res) => {
  try {
    const backupData = {
      users: await prisma.user.findMany(),
      branches: await prisma.branch.findMany(),
      products: await prisma.product.findMany(),
      categories: await prisma.category.findMany(),
      productionBatches: await prisma.productionBatch.findMany(),
      tasks: await prisma.task.findMany()
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="wms_backup.json"');
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    handleApiError(res, err);
  }
});

// Clear Data (Except Users)
app.post('/api/data-admin/clear', authenticate(['DATA_ADMIN']), async (req, res) => {
  try {
    await prisma.$transaction([
      prisma.taskComment.deleteMany(),
      prisma.task.deleteMany(),
      prisma.productionBatchItem.deleteMany(),
      prisma.productionBatch.deleteMany(),
      prisma.procurementItem.deleteMany(),
      prisma.procurement.deleteMany(),
      prisma.operatingExpense.deleteMany(),
      prisma.deboningLog.deleteMany(),
      prisma.livestockLedger.deleteMany(),
      prisma.orderHistory.deleteMany(),
      prisma.orderItem.deleteMany(),
      prisma.order.deleteMany(),
      prisma.inventoryTransaction.deleteMany(),
      prisma.branchInventory.deleteMany(),
      prisma.notification.deleteMany(),
      prisma.techCardStep.deleteMany(),
      prisma.bOMItem.deleteMany(),
      prisma.bOM.deleteMany(),
      prisma.product.deleteMany(),
      prisma.category.deleteMany(),
      prisma.branch.deleteMany()
    ]);
    res.json({ success: true, message: 'All data cleared except users' });
  } catch (err) {
    handleApiError(res, err);
  }
});

// Start Server conditionally (for local development or VPS)
if (process.env.VERCEL_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel Serverless
export default app;
