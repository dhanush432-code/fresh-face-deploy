'use client';
export const dynamic = 'force-dynamic';

import SignupForm from '@/components/SignupForm';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white shadow-md rounded-xl p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Create an Account</h1>
        <SignupForm />
      </div>
    </div>
  );
}
