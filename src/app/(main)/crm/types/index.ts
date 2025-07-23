// FILE: /app/crm/types/index.ts

export interface AppointmentHistoryItem {
  _id: string;
  id: string;
  service: string;
  date: string;
  status: string;
  services: string[];
  totalAmount: number;
  stylistName: string;
}

export interface MembershipUIDetails {
  planName: string;
  status: string;
  startDate: string;
  endDate: string;
}

export interface CrmCustomer {
  // 1. FIX: Changed 'isMember: any' to 'isMembership?: boolean'
  // This makes it consistent and type-safe.
  isMembership?: boolean;

  id: string;
  _id: string;
  name: string;
  
  // 2. FIX: Make email optional to match reality
  email?: string;

  phoneNumber: string;
  createdAt?: string;
  status?: 'Active' | 'Inactive' | 'New';
  gender?: 'male' | 'female' | 'other';
    dob?: string; // Add dob
  survey?: string; // Add survey
  appointmentHistory?: AppointmentHistoryItem[];
  currentMembership?: MembershipUIDetails | null;
  loyaltyPoints?: number;
  membershipBarcode?: string;
  
  // This was missing from the customer list view
  isActive?: boolean;
}

export interface MembershipPlanFE {
  _id: string;
  id: string;
  name: string;
  price: number;
  durationDays: number;
}

export interface AddCustomerFormData {
  name: string;
  email?: string; // Make email optional here too
  phoneNumber: string;
  gender?: 'male' | 'female' | 'other';
  dob?: string; // Add dob
  survey?: string; // Add survey
}

// Pagination details from the API
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCustomers: number;
  
  // 3. FIX: Add the 'limit' property that the API sends
  limit: number;
}