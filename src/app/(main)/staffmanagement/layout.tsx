// src/app/(main)/staffmanagement/layout.tsx

"use client"; // Providers for context usually need to be client components

import { StaffProvider } from '@/context/StaffContext'; // Adjust this import path if needed
import React from 'react';

export default function StaffManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Wrap the children (your pages) with the StaffProvider
    <StaffProvider>
      {children}
    </StaffProvider>
  );
}