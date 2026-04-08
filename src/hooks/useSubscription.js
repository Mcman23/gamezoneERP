import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useSubscription(user) {
  const isAdminUser = !!user?.id && user?.role === 'admin';

  const { data: subscriptions = [], isLoading, isFetched } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: () => base44.entities.Subscription.filter({ user_id: user.id }),
    enabled: isAdminUser,
  });

  const today = new Date().toISOString().split('T')[0];
  const active = subscriptions.find(s => s.status === 'active' && s.end_date >= today);

  // If user is admin, we're still loading until the query has actually fetched
  const stillLoading = isAdminUser ? (isLoading || !isFetched) : false;

  return {
    isLoading: stillLoading,
    hasSubscription: isAdminUser ? !!active : true,
    subscription: active || null,
  };
}