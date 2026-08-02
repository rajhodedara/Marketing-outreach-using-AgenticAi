import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const cleanUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
      const res = await fetch(`${cleanUrl}/api/accounts`, { cache: 'no-store' });
      if (!res.ok) throw new Error("Failed to fetch accounts on server");
      const data = await res.json();
      return data.accounts || [];
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
