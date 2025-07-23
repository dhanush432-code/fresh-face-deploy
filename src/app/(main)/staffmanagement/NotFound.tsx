import React from 'react';
import Link from 'next/link'; // CORRECT: Import Link from next/link
import { ArrowLeft } from 'lucide-react';
import Button from '../../../components/ui/Button'; // Assuming this path is correct

const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <h1 className="text-9xl font-bold text-purple-600">404</h1>
      <h2 className="mt-8 text-2xl font-semibold text-gray-800">Page Not Found</h2>
      <p className="mt-4 text-lg text-gray-600 max-w-lg">
        The page you are looking for doesn't exist or has been moved.
      </p>
      {/* CORRECT: Use the href prop instead of the 'to' prop */}
      <Link href="/dashboard">
        <Button className="mt-8" icon={<ArrowLeft size={16} />}>
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
};

export default NotFound;