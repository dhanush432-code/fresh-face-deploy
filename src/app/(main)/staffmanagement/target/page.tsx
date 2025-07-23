// Make the page dynamic for API fetches
export const dynamic = 'force-dynamic';

import TargetView from './TargetView';
import type { TargetSheetData } from '@/models/TargetSheet';

// Function to fetch target data from your internal API
async function getTargetPageData(): Promise<TargetSheetData | null> {
  try {
    // Use the base URL from env variable (configured in Vercel)
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const cacheBuster = `?time=${Date.now()}`;

    const res = await fetch(`${baseUrl}/api/target${cacheBuster}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('Failed to fetch target data. Status:', res.status);
      return null;
    }

    return res.json();
  } catch (error) {
    console.error('Error in getTargetPageData:', error);
    return null;
  }
}

// The page component
export default async function TargetPage() {
  const data = await getTargetPageData();

  if (!data) {
    return (
      <div className="p-8 text-center text-red-500">
        Failed to load target data. Please try refreshing the page.
      </div>
    );
  }

  return <TargetView initialData={data} />;
}
