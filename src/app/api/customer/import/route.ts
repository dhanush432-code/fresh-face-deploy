// /app/api/customers/import/route.ts

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb'; // Corrected your import from dbConnect
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import Customer from '@/models/customermodel';

// --- (1) IMPORT ALL NECESSARY FUNCTIONS ---
import { encrypt } from '@/lib/crypto';
import { createBlindIndex, generateNgrams } from '@/lib/search-indexing';

interface CustomerImportRow {
  Name: string;
  PhoneNumber: string;
  Email?: string;
  Gender?: 'male' | 'female' | 'other';
  DOB?: string;
  Survey?: string;
  IsMembership?: 'TRUE' | 'FALSE' | boolean;
  MembershipBarcode?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.CUSTOMERS_CREATE)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows: CustomerImportRow[] = await req.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, message: 'No customer data provided.' }, { status: 400 });
    }

    await connectToDatabase();

    const report = {
      totalRows: rows.length,
      successfulImports: 0,
      failedImports: 0,
      errors: [] as { row: number; message: string; data: CustomerImportRow }[],
    };

    // --- (2) PROCESS EACH ROW INDIVIDUALLY FOR ROBUSTNESS ---
    for (const [index, row] of rows.entries()) {
      try {
        if (!row.Name || !row.PhoneNumber) {
          throw new Error('Missing required fields: Name and PhoneNumber are required.');
        }

        const normalizedPhoneNumber = String(row.PhoneNumber).replace(/\D/g, '');
        if (!normalizedPhoneNumber) {
            throw new Error('Invalid phone number format.');
        }

        // --- (3) GENERATE ALL DERIVED & ENCRYPTED FIELDS AT ONCE ---
        // This is the core logic that must be applied to every record.
        const phoneHash = createBlindIndex(normalizedPhoneNumber); // Use the new blind index function
        const phoneSearchIndexes = generateNgrams(normalizedPhoneNumber).map(ngram => createBlindIndex(ngram));
        const isMember = row.IsMembership === 'TRUE' || row.IsMembership === true;
        const barcode = row.MembershipBarcode?.trim().toUpperCase();

        if (isMember && !barcode) {
            throw new Error('MembershipBarcode is required if IsMembership is TRUE.');
        }
        
        // Build the complete, correct data payload for the customer document.
        const customerPayload = {
          name: encrypt(row.Name.trim()),
          phoneNumber: encrypt(normalizedPhoneNumber),
          email: row.Email ? encrypt(row.Email.trim()) : undefined,
          
          // Add all the derived search and helper fields
          phoneHash: phoneHash,
          searchableName: row.Name.trim().toLowerCase(), // Ensure it's lowercase
          last4PhoneNumber: normalizedPhoneNumber.slice(-4),
          phoneSearchIndex: phoneSearchIndexes, // The new partial search index
          
          // Add other fields from the import file
          dob: row.DOB ? new Date(row.DOB) : undefined,
          gender: row.Gender || undefined,
          survey: row.Survey || undefined,
          isMembership: isMember,
          membershipBarcode: isMember ? barcode : undefined,
          membershipPurchaseDate: isMember ? new Date() : undefined,
        };
        
        // --- (4) SIMPLIFIED CREATE OR UPDATE LOGIC ---
        const existingCustomer = await Customer.findOne({ phoneHash });

        if (existingCustomer) {
          // UPDATE: Customer with this phone number already exists. Update their details.
          // Check for barcode conflicts before updating
          if (barcode) {
              const barcodeExists = await Customer.findOne({ membershipBarcode: barcode, _id: { $ne: existingCustomer._id } });
              if (barcodeExists) {
                  throw new Error(`MembershipBarcode "${barcode}" is already in use by another customer.`);
              }
          }
          await Customer.findByIdAndUpdate(existingCustomer._id, { $set: customerPayload });
        } else {
          // CREATE: This is a new customer.
          // Check for barcode conflicts before creating
          if (barcode) {
              const barcodeExists = await Customer.findOne({ membershipBarcode: barcode });
              if (barcodeExists) {
                  throw new Error(`MembershipBarcode "${barcode}" is already in use by another customer.`);
              }
          }
          await Customer.create(customerPayload);
        }

        report.successfulImports++;
      } catch (error: any) {
        report.failedImports++;
        report.errors.push({
          row: index + 2, // Assuming row 1 is headers
          message: error.message || 'An unknown error occurred.',
          data: row,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Customer import process completed.',
      report,
    });

  } catch (error: any) {
    console.error("API Error during customer import:", error);
    return NextResponse.json({ success: false, message: 'Server-side error during import.' }, { status: 500 });
  }
}