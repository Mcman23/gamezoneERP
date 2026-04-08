import React from 'react';
import { Crown, Calendar, CheckCircle2 } from 'lucide-react';

const PLANS = [
  { key: 'monthly', label: 'Aylıq', price: '29.99 AZN', period: '/ay', features: ['Limitsiz masa', 'Kassir əlavəsi', 'Hesabatlar', 'Anbar idarəsi'] },
  { key: 'yearly', label: 'İllik', price: '299 AZN', period: '/il', badge: '2 ay pulsuz', features: ['Limitsiz masa', 'Kassir əlavəsi', 'Hesabatlar', 'Anbar idarəsi'] },
];

export default function SubscriptionRequired() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Crown className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Premium Abunəlik Tələb Olunur</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Klub idarəetmə panelinə daxil olmaq üçün aktiv premium abunəliyiniz olmalıdır.
            Zəhmət olmasa platformanın administratoru ilə əlaqə saxlayın.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {PLANS.map(plan => (
            <div key={plan.key} className="relative border border-border rounded-2xl p-6 bg-card space-y-4">
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-foreground text-lg">{plan.label}</h2>
              </div>
              <div>
                <span className="text-3xl font-bold text-primary">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-2">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Abunəliyinizi aktivləşdirmək üçün platform administratoru ilə əlaqə saxlayın.
        </p>
      </div>
    </div>
  );
}