// types/next-auth.d.ts
import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface User {
    role: {
      id: string;
      name: string;
      permissions: string[];
    };
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: {
        displayName: string;
        id: string;
        name: string;
        permissions: string[];
      };
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: {
      id: string;
      name: string;
      permissions: string[];
    };
  }
}