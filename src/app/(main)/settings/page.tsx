import { redirect } from 'next/navigation';

export default function SettingsRootPage() {
  // Redirect to the first page in your settings navigation
  // Let's make it redirect to the loyalty page for now.
  redirect('/settings/loyalty');
}