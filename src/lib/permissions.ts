export const PERMISSIONS = {
  // User management
  USERS_CREATE: 'users:create',
  USERS_READ: 'users:read',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_MANAGE: 'users:manage',

  // Role management
  ROLES_CREATE: 'roles:create',
  ROLES_READ: 'roles:read',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',
  ROLES_MANAGE: 'roles:manage',

  // Customer management
  CUSTOMERS_CREATE: 'customers:create',
  CUSTOMERS_READ: 'customers:read',
  CUSTOMERS_UPDATE: 'customers:update',
  CUSTOMERS_DELETE: 'customers:delete',
  CUSTOMERS_MANAGE: 'customers:manage',

  // Appointment management
  APPOINTMENTS_CREATE: 'appointments:create',
  APPOINTMENTS_READ: 'appointments:read',
  APPOINTMENTS_UPDATE: 'appointments:update',
  APPOINTMENTS_DELETE: 'appointments:delete',
  APPOINTMENTS_MANAGE: 'appointments:manage',

  // ** NEW PERMISSIONS FOR SHOP MODULE **

  // Stylist Management
  STYLISTS_CREATE: 'stylists:create',
  STYLISTS_READ: 'stylists:read',
  STYLISTS_UPDATE: 'stylists:update',
  STYLISTS_DELETE: 'stylists:delete',

  // Product Management
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_READ: 'products:read',
  PRODUCTS_UPDATE: 'products:update',
  PRODUCTS_DELETE: 'products:delete',

  // Service Management
  SERVICES_CREATE: 'services:create',
  SERVICES_READ: 'services:read',
  SERVICES_UPDATE: 'services:update',
  SERVICES_DELETE: 'services:delete',

  // Dashboard access
  DASHBOARD_READ: 'dashboard:read',
  DASHBOARD_MANAGE: 'dashboard:manage',

  // Day-end Closing management
  DAYEND_CREATE: 'dayend:create',
  DAYEND_READ: 'dayend:read',
  DAYEND_UPDATE: 'dayend:update',
  DAYEND_DELETE: 'dayend:delete',
  DAYEND_MANAGE: 'dayend:manage',

  // EB (Electricity Bill) management
  EB_UPLOAD: 'eb:upload',
  EB_VIEW_CALCULATE: 'eb:view_calculate',

  // Procurement management
  PROCUREMENT_CREATE: 'procurement:create',
  PROCUREMENT_READ: 'procurement:read',
  PROCUREMENT_UPDATE: 'procurement:update',
  PROCUREMENT_DELETE: 'procurement:delete',

  // Settings management
  SETTINGS_READ: 'settings:read',
  LOYALTY_SETTINGS_READ: 'loyalty_settings:read',
  LOYALTY_SETTINGS_UPDATE: 'loyalty_settings:update',
  MEMBERSHIP_SETTINGS_READ: 'membership_settings:read',
  MEMBERSHIP_SETTINGS_WRITE: 'membership_settings:write',
  ATTENDANCE_SETTINGS_READ: 'attendance_settings:read',
  SETTINGS_STAFF_ID_MANAGE: 'settings:staff_id:manage',
  POSITION_HOURS_SETTINGS_MANAGE: 'position_hours_settings:manage',

  // Inventory Checker management
  INVENTORY_CHECKER_CREATE: 'inventory-checker:create',
  INVENTORY_CHECKER_READ: 'inventory-checker:read',
  INVENTORY_CHECKER_UPDATE: 'inventory-checker:update',
  INVENTORY_CHECKER_DELETE: 'inventory-checker:delete',

  // Alerts Management
  ALERTS_CREATE: 'alerts:create',
  ALERTS_READ: 'alerts:read',
  ALERTS_DELETE: 'alerts:delete',

 
  // Staff Management Permissions
  STAFF_LIST_READ: 'staff-list:read',
  STAFF_LIST_CREATE: 'staff-list:create',
  STAFF_LIST_UPDATE: 'staff-list:update',
  STAFF_LIST_DELETE: 'staff-list:delete',
  STAFF_ATTENDANCE_READ: 'staff-attendance:read',
  STAFF_ATTENDANCE_MANAGE: 'staff-attendance:manage',
  STAFF_ADVANCE_READ: 'staff-advance:read',
  STAFF_ADVANCE_MANAGE: 'staff-advance:manage',
  STAFF_PERFORMANCE_READ: 'staff-performance:read',
  STAFF_PERFORMANCE_MANAGE: 'staff-performance:manage',
  STAFF_TARGET_READ: 'staff-target:read',
  STAFF_TARGET_MANAGE: 'staff-target:manage',
  STAFF_INCENTIVES_READ: 'staff-incentives:read',
  STAFF_INCENTIVES_MANAGE: 'staff-incentives:manage',
  STAFF_SALARY_READ: 'staff-salary:read',
  STAFF_SALARY_MANAGE: 'staff-salary:manage',
  STAFF_SWIFT_MANAGE: 'staff-swift:manage',

  // Expenses Management Permissions
  EXPENSES_CREATE: 'expenses:create',
  EXPENSES_READ: 'expenses:read',
  EXPENSES_UPDATE: 'expenses:update',
  EXPENSES_DELETE: 'expenses:delete',
  EXPENSES_MANAGE: 'expenses:manage',

  ALL: '*'
} as const;

export const PERMISSION_CATEGORIES = {
  USER_MANAGEMENT: 'User Management',
  ROLE_MANAGEMENT: 'Role Management',
  CUSTOMER_MANAGEMENT: 'Customer Management',
  APPOINTMENT_MANAGEMENT: 'Appointment Management',
  BILLING_MANAGEMENT: 'Billing Management',
  DASHBOARD_ACCESS: 'Dashboard Access',
  SERVICES_MANAGEMENT: 'Services Management',
  STAFF_MANAGEMENT: 'Staff Management',
  INVENTORY_MANAGEMENT: 'Inventory Management',
  STYLIST_MANAGEMENT: 'Stylist Management',
  PRODUCT_MANAGEMENT: 'Product Management',
  SERVICE_MANAGEMENT: 'Service Management',
  SETTINGS_MANAGEMENT: 'Settings Management',
  REPORTS_ACCESS: 'Reports Access',
  EB_MANAGEMENT: 'EB Management',
  PROCUREMENT_MANAGEMENT: 'Procurement Management',
  DAYEND_MANAGEMENT: 'Day-end Closing Management',
  INVENTORY_CHECKER_MANAGEMENT: 'Inventory Checker Management',
  ALERTS_MANAGEMENT: 'Alerts Management',
  EXPENSES_MANAGEMENT: 'Expenses Management',
} as const;

export const ALL_PERMISSIONS = [
  // User Management
  { permission: PERMISSIONS.USERS_CREATE, description: 'Create new users', category: PERMISSION_CATEGORIES.USER_MANAGEMENT },
  { permission: PERMISSIONS.USERS_READ, description: 'View user information', category: PERMISSION_CATEGORIES.USER_MANAGEMENT },
  { permission: PERMISSIONS.USERS_UPDATE, description: 'Update user information', category: PERMISSION_CATEGORIES.USER_MANAGEMENT },
  { permission: PERMISSIONS.USERS_DELETE, description: 'Delete users', category: PERMISSION_CATEGORIES.USER_MANAGEMENT },
  //{ permission: PERMISSIONS.USERS_MANAGE, description: 'Full user management access', category: PERMISSION_CATEGORIES.USER_MANAGEMENT },

  // Role Management
  { permission: PERMISSIONS.ROLES_CREATE, description: 'Create new roles', category: PERMISSION_CATEGORIES.ROLE_MANAGEMENT },
  { permission: PERMISSIONS.ROLES_READ, description: 'View role information', category: PERMISSION_CATEGORIES.ROLE_MANAGEMENT },
  { permission: PERMISSIONS.ROLES_UPDATE, description: 'Update role information', category: PERMISSION_CATEGORIES.ROLE_MANAGEMENT },
  { permission: PERMISSIONS.ROLES_DELETE, description: 'Delete roles', category: PERMISSION_CATEGORIES.ROLE_MANAGEMENT },
  //{ permission: PERMISSIONS.ROLES_MANAGE, description: 'Full role management access', category: PERMISSION_CATEGORIES.ROLE_MANAGEMENT },

  // Customer Management
  { permission: PERMISSIONS.CUSTOMERS_CREATE, description: 'Create new customers', category: PERMISSION_CATEGORIES.CUSTOMER_MANAGEMENT },
  { permission: PERMISSIONS.CUSTOMERS_READ, description: 'View customer information', category: PERMISSION_CATEGORIES.CUSTOMER_MANAGEMENT },
  { permission: PERMISSIONS.CUSTOMERS_UPDATE, description: 'Update customer information', category: PERMISSION_CATEGORIES.CUSTOMER_MANAGEMENT },
  { permission: PERMISSIONS.CUSTOMERS_DELETE, description: 'Delete customers', category: PERMISSION_CATEGORIES.CUSTOMER_MANAGEMENT },
  //{ permission: PERMISSIONS.CUSTOMERS_MANAGE, description: 'Full customer management access', category: PERMISSION_CATEGORIES.CUSTOMER_MANAGEMENT },

  // Appointment Management
  { permission: PERMISSIONS.APPOINTMENTS_CREATE, description: 'Create new appointments', category: PERMISSION_CATEGORIES.APPOINTMENT_MANAGEMENT },
  { permission: PERMISSIONS.APPOINTMENTS_READ, description: 'View appointment information', category: PERMISSION_CATEGORIES.APPOINTMENT_MANAGEMENT },
  { permission: PERMISSIONS.APPOINTMENTS_UPDATE, description: 'Update appointment information', category: PERMISSION_CATEGORIES.APPOINTMENT_MANAGEMENT },
  { permission: PERMISSIONS.APPOINTMENTS_DELETE, description: 'Delete appointments', category: PERMISSION_CATEGORIES.APPOINTMENT_MANAGEMENT },
  //{ permission: PERMISSIONS.APPOINTMENTS_MANAGE, description: 'Full appointment management access', category: PERMISSION_CATEGORIES.APPOINTMENT_MANAGEMENT },



  // Dashboard Access
  { permission: PERMISSIONS.DASHBOARD_READ, description: 'View dashboard information', category: PERMISSION_CATEGORIES.DASHBOARD_ACCESS },
  { permission: PERMISSIONS.DASHBOARD_MANAGE, description: 'Full dashboard management access', category: PERMISSION_CATEGORIES.DASHBOARD_ACCESS },

  // EB Management
  { permission: PERMISSIONS.EB_UPLOAD, description: 'Upload morning and evening meter images', category: PERMISSION_CATEGORIES.EB_MANAGEMENT },
  { permission: PERMISSIONS.EB_VIEW_CALCULATE, description: 'View meter images and calculate units/costs', category: PERMISSION_CATEGORIES.EB_MANAGEMENT },

  // Procurement Management
  { permission: PERMISSIONS.PROCUREMENT_CREATE, description: 'Create procurement records', category: PERMISSION_CATEGORIES.PROCUREMENT_MANAGEMENT },
  { permission: PERMISSIONS.PROCUREMENT_READ, description: 'View procurement records', category: PERMISSION_CATEGORIES.PROCUREMENT_MANAGEMENT },
  { permission: PERMISSIONS.PROCUREMENT_UPDATE, description: 'Update procurement records', category: PERMISSION_CATEGORIES.PROCUREMENT_MANAGEMENT },
  { permission: PERMISSIONS.PROCUREMENT_DELETE, description: 'Delete procurement records', category: PERMISSION_CATEGORIES.PROCUREMENT_MANAGEMENT },

  // Day-end Closing Management
  { permission: PERMISSIONS.DAYEND_CREATE, description: 'Create day-end closing reports', category: PERMISSION_CATEGORIES.DAYEND_MANAGEMENT },
  { permission: PERMISSIONS.DAYEND_READ, description: 'View day-end closing reports', category: PERMISSION_CATEGORIES.DAYEND_MANAGEMENT },
  { permission: PERMISSIONS.DAYEND_UPDATE, description: 'Update day-end closing reports', category: PERMISSION_CATEGORIES.DAYEND_MANAGEMENT },
  { permission: PERMISSIONS.DAYEND_DELETE, description: 'Delete day-end closing reports', category: PERMISSION_CATEGORIES.DAYEND_MANAGEMENT },
  //{ permission: PERMISSIONS.DAYEND_MANAGE, description: 'Full day-end closing management access', category: PERMISSION_CATEGORIES.DAYEND_MANAGEMENT },

  // Stylist Management
  { permission: PERMISSIONS.STYLISTS_CREATE, description: 'Create new stylists', category: PERMISSION_CATEGORIES.STYLIST_MANAGEMENT },
  { permission: PERMISSIONS.STYLISTS_READ, description: 'View stylist information', category: PERMISSION_CATEGORIES.STYLIST_MANAGEMENT },
  { permission: PERMISSIONS.STYLISTS_UPDATE, description: 'Update stylist information', category: PERMISSION_CATEGORIES.STYLIST_MANAGEMENT },
  { permission: PERMISSIONS.STYLISTS_DELETE, description: 'Delete stylists', category: PERMISSION_CATEGORIES.STYLIST_MANAGEMENT },

  // Product Management
  { permission: PERMISSIONS.PRODUCTS_CREATE, description: 'Create new products, brands, and categories', category: PERMISSION_CATEGORIES.PRODUCT_MANAGEMENT },
  { permission: PERMISSIONS.PRODUCTS_READ, description: 'View product information', category: PERMISSION_CATEGORIES.PRODUCT_MANAGEMENT },
  { permission: PERMISSIONS.PRODUCTS_UPDATE, description: 'Update product information', category: PERMISSION_CATEGORIES.PRODUCT_MANAGEMENT },
  { permission: PERMISSIONS.PRODUCTS_DELETE, description: 'Delete products, brands, and categories', category: PERMISSION_CATEGORIES.PRODUCT_MANAGEMENT },

  // Service Management
  { permission: PERMISSIONS.SERVICES_CREATE, description: 'Create new services and categories', category: PERMISSION_CATEGORIES.SERVICE_MANAGEMENT },
  { permission: PERMISSIONS.SERVICES_READ, description: 'View service information', category: PERMISSION_CATEGORIES.SERVICE_MANAGEMENT },
  { permission: PERMISSIONS.SERVICES_UPDATE, description: 'Update service information', category: PERMISSION_CATEGORIES.SERVICE_MANAGEMENT },
  { permission: PERMISSIONS.SERVICES_DELETE, description: 'Delete services and categories', category: PERMISSION_CATEGORIES.SERVICE_MANAGEMENT },

  // Settings Management
  { permission: PERMISSIONS.SETTINGS_READ, description: 'Access settings section', category: PERMISSION_CATEGORIES.SETTINGS_MANAGEMENT },
  { permission: PERMISSIONS.LOYALTY_SETTINGS_READ, description: 'View loyalty settings', category: PERMISSION_CATEGORIES.SETTINGS_MANAGEMENT },
  { permission: PERMISSIONS.LOYALTY_SETTINGS_UPDATE, description: 'Update loyalty settings', category: PERMISSION_CATEGORIES.SETTINGS_MANAGEMENT },
  { permission: PERMISSIONS.MEMBERSHIP_SETTINGS_READ,description: 'View membership settings', category: PERMISSION_CATEGORIES.SETTINGS_MANAGEMENT   },
  { permission: PERMISSIONS.MEMBERSHIP_SETTINGS_WRITE,description: 'Update membership settings', category:  PERMISSION_CATEGORIES.SETTINGS_MANAGEMENT  },
  { permission: PERMISSIONS.ATTENDANCE_SETTINGS_READ, description: 'Read attendance settings', category: PERMISSION_CATEGORIES.SETTINGS_MANAGEMENT },
  { permission: PERMISSIONS.SETTINGS_STAFF_ID_MANAGE, description: 'Manage staff ID settings', category: PERMISSION_CATEGORIES.SETTINGS_MANAGEMENT },
  { permission: PERMISSIONS.POSITION_HOURS_SETTINGS_MANAGE, description: 'Manage position hours settings', category: PERMISSION_CATEGORIES.SETTINGS_MANAGEMENT },

  // Alerts Management
  { permission: PERMISSIONS.ALERTS_CREATE, description: 'Create alerts', category: PERMISSION_CATEGORIES.ALERTS_MANAGEMENT },
  { permission: PERMISSIONS.ALERTS_READ, description: 'Read alerts', category: PERMISSION_CATEGORIES.ALERTS_MANAGEMENT },
  { permission: PERMISSIONS.ALERTS_DELETE, description: 'Delete alerts', category: PERMISSION_CATEGORIES.ALERTS_MANAGEMENT },

  // Inventory Checker Management
  { permission: PERMISSIONS.INVENTORY_CHECKER_CREATE, description: 'Create inventory check', category: PERMISSION_CATEGORIES.INVENTORY_CHECKER_MANAGEMENT },
  { permission: PERMISSIONS.INVENTORY_CHECKER_READ, description: 'Read inventory check', category: PERMISSION_CATEGORIES.INVENTORY_CHECKER_MANAGEMENT },
  { permission: PERMISSIONS.INVENTORY_CHECKER_UPDATE, description: 'Update inventory check', category: PERMISSION_CATEGORIES.INVENTORY_CHECKER_MANAGEMENT },
  { permission: PERMISSIONS.INVENTORY_CHECKER_DELETE, description: 'Delete inventory check', category: PERMISSION_CATEGORIES.INVENTORY_CHECKER_MANAGEMENT },
 
  // Staff Management
  { permission: PERMISSIONS.STAFF_LIST_READ, description: 'Read staff list', category: PERMISSION_CATEGORIES.STAFF_MANAGEMENT },
  { permission: PERMISSIONS.STAFF_LIST_CREATE, description: 'Create staff members', category: PERMISSION_CATEGORIES.STAFF_MANAGEMENT },
  { permission: PERMISSIONS.STAFF_LIST_UPDATE, description: 'Update staff members', category: PERMISSION_CATEGORIES.STAFF_MANAGEMENT },
  { permission: PERMISSIONS.STAFF_LIST_DELETE, description: 'Delete staff members', category: PERMISSION_CATEGORIES.STAFF_MANAGEMENT },
  { permission: PERMISSIONS.STAFF_ATTENDANCE_READ, description: 'Read staff attendance', category: PERMISSION_CATEGORIES.STAFF_MANAGEMENT },
  { permission: PERMISSIONS.STAFF_ATTENDANCE_MANAGE, description: 'Manage staff attendance', category: PERMISSION_CATEGORIES.STAFF_MANAGEMENT },
  { permission: PERMISSIONS.STAFF_ADVANCE_READ, description: 'Read staff advance payments', category: PERMISSION_CATEGORIES.STAFF_MANAGEMENT },
  { permission: PERMISSIONS.STAFF_ADVANCE_MANAGE, description: 'Manage staff advance payments', category: PERMISSION_CATEGORIES.STAFF_MANAGEMENT },
  { permission: PERMISSIONS.STAFF_PERFORMANCE_READ, description: 'Read staff performance', category: PERMISSION_CATEGORIES.STAFF_MANAGEMENT },
  { permission: PERMISSIONS.STAFF_PERFORMANCE_MANAGE, description: 'Manage staff performance', category: PERMISSION_CATEGORIES.STAFF_MANAGEMENT },
  { permission: PERMISSIONS.STAFF_TARGET_READ, description: 'Read staff targets', category: PERMISSION_CATEGORIES.STAFF_MANAGEMENT },
  { permission: PERMISSIONS.STAFF_TARGET_MANAGE, description: 'Manage staff targets', category: PERMISSION_CATEGORIES.STAFF_MANAGEMENT },
  { permission: PERMISSIONS.STAFF_INCENTIVES_READ, description: 'Read staff incentives', category: PERMISSION_CATEGORIES.STAFF_MANAGEMENT },
  { permission: PERMISSIONS.STAFF_INCENTIVES_MANAGE, description: 'Manage staff incentives', category: PERMISSION_CATEGORIES.STAFF_MANAGEMENT },
  { permission: PERMISSIONS.STAFF_SALARY_READ, description: 'Read staff salary', category: PERMISSION_CATEGORIES.STAFF_MANAGEMENT },
  { permission: PERMISSIONS.STAFF_SALARY_MANAGE, description: 'Manage staff salary', category: PERMISSION_CATEGORIES.STAFF_MANAGEMENT },
  { permission: PERMISSIONS.STAFF_SWIFT_MANAGE, description: 'Manage staff swift', category: PERMISSION_CATEGORIES.STAFF_MANAGEMENT },

  // Expenses Management
  { permission: PERMISSIONS.EXPENSES_CREATE, description: 'Create expenses', category: PERMISSION_CATEGORIES.EXPENSES_MANAGEMENT },
  { permission: PERMISSIONS.EXPENSES_READ, description: 'Read expenses', category: PERMISSION_CATEGORIES.EXPENSES_MANAGEMENT },
  { permission: PERMISSIONS.EXPENSES_UPDATE, description: 'Update expenses', category: PERMISSION_CATEGORIES.EXPENSES_MANAGEMENT },
  { permission: PERMISSIONS.EXPENSES_DELETE, description: 'Delete expenses', category: PERMISSION_CATEGORIES.EXPENSES_MANAGEMENT },
  { permission: PERMISSIONS.EXPENSES_MANAGE, description: 'Manage all expenses', category: PERMISSION_CATEGORIES.EXPENSES_MANAGEMENT },
  
  // Super Admin
  { permission: PERMISSIONS.ALL, description: 'Full system access (Super Admin)', category: 'System Administration' }
];

export const hasPermission = (userPermissions: string[], requiredPermission: string): boolean => {
  // Super admin has all permissions
  if (userPermissions.includes('*')) return true;

  // Direct permission match
  if (userPermissions.includes(requiredPermission)) return true;

  return false;
};

// Helper function to check multiple permissions (user needs ANY of the permissions)
export const hasAnyPermission = (userPermissions: string[], requiredPermissions: string[]): boolean => {
  return requiredPermissions.some(permission => hasPermission(userPermissions, permission));
};

// Helper function to check multiple permissions (user needs ALL of the permissions)
export const hasAllPermissions = (userPermissions: string[], requiredPermissions: string[]): boolean => {
  return requiredPermissions.every(permission => hasPermission(userPermissions, permission));
};

// Helper function to get permissions by category
export const getPermissionsByCategory = (category: string) => {
  return ALL_PERMISSIONS.filter(p => p.category === category);
};

// Helper function to get all categories
export const getAllCategories = () => {
  return Object.values(PERMISSION_CATEGORIES);
};

// Predefined role templates
export const ROLE_TEMPLATES = {
  SUPER_ADMIN: {
    name: 'Super Admin',
    description: 'Full system access',
    permissions: [PERMISSIONS.ALL]
  },
  ADMIN: {
    name: 'Admin',
    description: 'Administrative access with most permissions',
    permissions: [
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.ROLES_READ,
      PERMISSIONS.CUSTOMERS_MANAGE,
      PERMISSIONS.APPOINTMENTS_MANAGE,

      PERMISSIONS.DASHBOARD_READ,

      PERMISSIONS.EB_VIEW_CALCULATE,
      PERMISSIONS.PROCUREMENT_CREATE, // Added
      PERMISSIONS.PROCUREMENT_READ,   // Added
      PERMISSIONS.PROCUREMENT_UPDATE, // Added
      PERMISSIONS.PROCUREMENT_DELETE, // Added

      PERMISSIONS.DAYEND_MANAGE
    ]
  },
  MANAGER: {
    name: 'Manager',
    description: 'Management access for daily operations',
    permissions: [
      PERMISSIONS.CUSTOMERS_MANAGE,
      PERMISSIONS.APPOINTMENTS_MANAGE,
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.EB_UPLOAD,
      PERMISSIONS.PROCUREMENT_CREATE, // Added
      PERMISSIONS.PROCUREMENT_READ,   // Added
      PERMISSIONS.PROCUREMENT_UPDATE, // Added
      PERMISSIONS.PROCUREMENT_DELETE,  // Added

      PERMISSIONS.DAYEND_CREATE, // Added
      PERMISSIONS.DAYEND_READ,   // Added
      PERMISSIONS.DAYEND_UPDATE  // Added
    ]
  },
  STAFF: {
    name: 'Staff',
    description: 'Basic staff access for appointments and customers',
    permissions: [
      PERMISSIONS.CUSTOMERS_READ,
      PERMISSIONS.CUSTOMERS_UPDATE,
      PERMISSIONS.APPOINTMENTS_READ,
      PERMISSIONS.APPOINTMENTS_UPDATE,
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.PROCUREMENT_READ,
      PERMISSIONS.DAYEND_READ // Added
    ]
  },
  RECEPTIONIST: {
    name: 'Receptionist',
    description: 'Front desk operations access',
    permissions: [
      PERMISSIONS.CUSTOMERS_MANAGE,
      PERMISSIONS.APPOINTMENTS_MANAGE,
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.EB_UPLOAD,
      PERMISSIONS.DAYEND_CREATE, // Added
      PERMISSIONS.DAYEND_READ
    ]
  }
};

// Type definitions for better TypeScript support
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export type PermissionCategory = typeof PERMISSION_CATEGORIES[keyof typeof PERMISSION_CATEGORIES];

export interface PermissionInfo {
  permission: Permission;
  description: string;
  category: PermissionCategory | string;
}

export interface RoleTemplate {
  name: string;
  description: string;
  permissions: Permission[];
}