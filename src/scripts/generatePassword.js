// scripts/createSuperAdmin.js
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = 'mongodb+srv://techvaseegrah:XcZFCBAJBLTK2Wj0@ffprod.vrpjiy0.mongodb.net/?retryWrites=true&w=majority&appName=FFProd';
const SUPER_ADMIN_EMAIL = 'superadmin@freshface.com';
const SUPER_ADMIN_PASSWORD = 'SuperAdmin123!';
const SUPER_ADMIN_NAME = 'Super Administrator';

console.log('MONGODB_URI:', MONGODB_URI);


async function createSuperAdmin() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Hash password
    const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);
    
    // Create Super Admin role first
    const roleResult = await db.collection('roles').insertOne({
      name: 'SUPER_ADMIN',
      displayName: 'Super Administrator',
      description: 'Full system access with all permissions',
      permissions: ['*'],
      isActive: true,
      isSystemRole: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('Super Admin role created with ID:', roleResult.insertedId);
    
    // Create Super Admin user
    const userResult = await db.collection('users').insertOne({
      email: SUPER_ADMIN_EMAIL,
      password: hashedPassword,
      name: SUPER_ADMIN_NAME,
      roleId: roleResult.insertedId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('Super Admin user created with ID:', userResult.insertedId);
    console.log('Login credentials:');
    console.log('Email:', SUPER_ADMIN_EMAIL);
    console.log('Password:', SUPER_ADMIN_PASSWORD);
    
  } catch (error) {
    console.error('Error creating super admin:', error);
  } finally {
    await client.close();
  }
}

createSuperAdmin();