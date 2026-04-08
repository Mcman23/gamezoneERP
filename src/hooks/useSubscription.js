import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useSubscription(user) {
  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: () => base44.entities.Subscription.filter({ user_id: user.id }),
    enabled: !!user?.id && user?.role === 'admin',
  });

  const today = new Date().toISOString().split('T')[0];
  const active = subscriptions.find(s => s.status === 'active' && s.end_date >= today);

  return {
    isLoading,
    hasSubscription: !!active,
    subscription: active || null,
  };
}