// app/api/billing/search-items/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ServiceItem from '@/models/ServiceItem';
import Product from '@/models/Product';
import Setting from '@/models/Setting'; // --- ADDED: Import the Setting model ---

// --- ADDED: A constant for the special ID ---
const MEMBERSHIP_FEE_ITEM_ID = 'MEMBERSHIP_FEE_PRODUCT_ID';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');
    
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ success: true, items: [] });
    }

    const searchRegex = new RegExp(query, 'i');

    // Search both services and products in parallel (Your existing logic is great)
    const [services, products] = await Promise.all([
      ServiceItem.find({
        name: { $regex: searchRegex }
      })
      .select('name price membershipRate')
      .limit(5)
      .lean(),
      
      Product.find({
        name: { $regex: searchRegex },
        type: 'Retail'
      })
      .populate('brand', 'name')
      .populate('subCategory', 'name')
      // Ensure 'brand' is selected so we can access it
      .select('name price sku unit brand numberOfItems') 
      .limit(5)
      .lean()
    ]);

    // Format the results into a mutable array
    let items = [ // --- MODIFIED: Changed from const to let ---
      ...services.map(service => ({
        id: service._id.toString(),
        name: service.name,
        price: service.price,
        membershipRate: service.membershipRate,
        type: 'service' as const
      })),
      // THIS IS THE CORRECTED SECTION
      ...products.map(product => ({
        id: product._id.toString(),
        name: product.name, // Send the raw name
        price: product.price,
        type: 'product' as const,
        sku: product.sku,
        unit: product.unit, // Send the unit separately
        // Use the populated brand name, with a fallback
        categoryName: (product.brand as any)?.name || 'Product', 
        stock: (product as any).numberOfItems
      }))
    ];

    // --- THIS IS THE NEW LOGIC TO INJECT THE MEMBERSHIP FEE ---
    // Check if the search query is relevant to "membership"
    const lowerCaseQuery = query.toLowerCase();
    if ('membership fee'.includes(lowerCaseQuery)) {
      const feeSetting = await Setting.findOne({ key: 'membershipFee' }).lean();
      
      // Ensure the setting exists and has a valid price
      if (feeSetting && feeSetting.value) {
        const feePrice = parseFloat(feeSetting.value);
        if (!isNaN(feePrice) && feePrice > 0) {
          
          const membershipFeeItem = {
            id: MEMBERSHIP_FEE_ITEM_ID,
            name: 'New Membership Fee',
            price: feePrice,
            type: 'fee' as const, // Use the special 'fee' type
          };

          // Add the fee to the beginning of the search results for better UX
          items.unshift(membershipFeeItem);
        }
      }
    }
    // --- END OF NEW LOGIC ---

    return NextResponse.json({ 
      success: true, 
      items 
    });

  } catch (error: any) {
    console.error('API Error searching billing items:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to search items' 
    }, { status: 500 });
  }
}