import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useSubscription(user) {
  const isAdminUser = !!user?.id && user?.role === 'admin';
  const isOwner = user?.role === 'owner';

  const { data: subscriptions = [], isLoading, isFetched } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: () => base44.entities.Subscription.filter({ user_id: user.id }),
    enabled: isAdminUser,
  });

  const today = new Date().toISOString().split('T')[0];
  const active = subscriptions.find(s => s.status === 'active' && s.end_date >= today);

  // Days until expiry
  let daysUntilExpiry = null;
  if (active) {
    const diff = new Date(active.end_date) - new Date(today);
    daysUntilExpiry = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  const stillLoading = isAdminUser ? (isLoading || !isFetched) : false;

  return {
    isLoading: stillLoading,
    // Owner is always exempt; cashiers are covered by admin's subscription
    hasSubscription: isOwner || !isAdminUser ? true : !!active,
    subscription: active || null,
    daysUntilExpiry,
  };
}