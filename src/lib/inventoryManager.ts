// FILE: src/lib/inventoryManager.ts

import mongoose from 'mongoose';
import Product, { IProduct } from '@/models/Product';
import ServiceItem from '@/models/ServiceItem';
import Setting from '@/models/Setting';
import { Gender } from '@/types/gender';

export interface InventoryUpdate {
  productId: string;
  productName?: string;
  quantityToDeduct: number;
  unit: string;
}

export interface InventoryImpact {
  productId: string;
  productName: string;
  currentQuantity: number;
  usageQuantity: number;
  remainingAfterUsage: number;
  unit: string;
  alertLevel: 'ok' | 'low' | 'critical' | 'insufficient';
}

export class InventoryManager {
  static async calculateServiceInventoryUsage(
    serviceId: string,
    customerGender: 'male' | 'female' | 'other' = 'other'
  ): Promise<InventoryUpdate[]> {
    const service = await ServiceItem.findById(serviceId).populate('consumables.product', 'name sku unit');
    if (!service || !service.consumables?.length) return [];

    return service.consumables.map(consumable => {
      const product = consumable.product as IProduct;
      let quantityToUse = consumable.quantity.default || 0;
      if (customerGender === Gender.Male && typeof consumable.quantity.male === 'number') {
        quantityToUse = consumable.quantity.male;
      } else if (customerGender === Gender.Female && typeof consumable.quantity.female === 'number') {
        quantityToUse = consumable.quantity.female;
      }

      return {
        productId: product._id.toString(),
        productName: product.name,
        quantityToDeduct: quantityToUse,
        unit: consumable.unit || product.unit,
      };
    });
  }

  // --- THIS IS THE FULLY CORRECTED FUNCTION ---
  static async applyInventoryUpdates(
    updates: InventoryUpdate[],
    session?: mongoose.ClientSession
  ): Promise<{
    success: boolean;
    errors: string[];
    lowStockProducts: IProduct[];
  }> {
    
    // Create a list of all database update "promises"
   const updatePromises = updates.map(async (update) => { // LINE 1: Added 'async'
  
  // LINE 2: Added this IF statement to handle retail items differently
  if (update.unit === 'piece') {
    // LINE 3 (NEW): First, we must fetch the product to get its properties
    const product = await Product.findById(update.productId).session(session);
    if (!product) {
      throw new Error(`Product with ID ${update.productId} not found during inventory update.`);
    }

    // LINE 4 (NEW): We calculate the new values for BOTH fields
    const newNumberOfItems = product.numberOfItems - update.quantityToDeduct;
    const newTotalQuantity = newNumberOfItems * product.quantityPerItem;

    // LINE 5 (NEW): We use '$set' to update both fields to their new, correct values
    return Product.updateOne(
      { _id: update.productId },
      { 
        $set: { 
          numberOfItems: newNumberOfItems, 
          totalQuantity: newTotalQuantity 
        } 
      },
      { session }
    );
  } 
  // LINE 6: Added this ELSE to handle the other cases
  else {
    // This is the original logic, now only used for in-house items (ml, g, etc.)
    return Product.updateOne(
      { _id: update.productId },
      { $inc: { totalQuantity: -update.quantityToDeduct } },
      { session }
    );
  }
});

// We now await the new 'updatePromises' array
await Promise.all(updatePromises);

    // If we get here, all updates were successful. Now check for low stock.
    const lowStockProducts: IProduct[] = [];
    const productIds = updates.map(u => u.productId);

    const updatedProducts = await Product.find({ _id: { $in: productIds } })
      .select('name numberOfItems lowStockThreshold')
      .session(session);

    for (const product of updatedProducts) {
      if (product.numberOfItems > 0 && product.numberOfItems <= product.lowStockThreshold) {
        lowStockProducts.push(product);
      }
    }

    return {
      success: true,
      errors: [],
      lowStockProducts
    };
  }
  // --- END OF THE FULLY CORRECTED FUNCTION ---


  static async calculateMultipleServicesInventoryImpact(
    serviceIds: string[],
    customerGender: 'male' | 'female' | 'other' = 'other'
  ): Promise<{ impactSummary: InventoryImpact[], totalUpdates: InventoryUpdate[] }> {
    const consolidatedUpdates = new Map<string, InventoryUpdate>();

    for (const serviceId of serviceIds) {
      const updates = await this.calculateServiceInventoryUsage(serviceId, customerGender);
      for (const update of updates) {
        const existing = consolidatedUpdates.get(update.productId);
        if (existing) {
          existing.quantityToDeduct += update.quantityToDeduct;
        } else {
          consolidatedUpdates.set(update.productId, { ...update });
        }
      }
    }

    const impactSummary: InventoryImpact[] = [];
    for (const [productId, update] of consolidatedUpdates) {
      const product = await Product.findById(productId);
      if (!product) continue;
      const isPiece = product.unit === 'piece';
      const current = isPiece ? product.numberOfItems : product.totalQuantity;
      const remaining = current - update.quantityToDeduct;
      const initialCapacity = product.numberOfItems * product.quantityPerItem;
      const percentageRemaining = initialCapacity > 0 ? ((isPiece ? remaining * product.quantityPeritem : remaining) / initialCapacity) * 100 : 0;

      let alertLevel: 'ok' | 'low' | 'critical' | 'insufficient' = 'ok';
      if (remaining < 0) alertLevel = 'insufficient';
      else if (percentageRemaining <= 10) alertLevel = 'critical';
      else if (percentageRemaining <= 20) alertLevel = 'low';

      impactSummary.push({
        productId: product._id.toString(),
        productName: product.name,
        currentQuantity: current,
        usageQuantity: update.quantityToDeduct,
        remainingAfterUsage: remaining,
        unit: product.unit,
        alertLevel,
      });
    }

    return {
      impactSummary,
      totalUpdates: Array.from(consolidatedUpdates.values()),
    };
  }
}