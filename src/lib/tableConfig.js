// PlayStation pricing matrix
export const PS_PRICING = {
  ps3: { cabinet: 3, hall: 1.5 },
  ps4: { cabinet: 3, hall: 3 },
  ps5: { cabinet: 5, hall: 5 },
};

// Category config
export const CATEGORIES = {
  computer: { label: 'PC', icon: 'Monitor', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  playstation: { label: 'PS', icon: 'Gamepad2', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  cabinet: { label: 'Kabinet', icon: 'Gamepad2', color: 'text-accent', bg: 'bg-accent/10' },
  simulator: { label: 'Simulator', icon: 'Joystick', color: 'text-green-400', bg: 'bg-green-400/10' },
};

export const CATEGORY_LABELS = {
  computer: 'PC',
  playstation: 'PS',
  cabinet: 'KABINET',
  simulator: 'SIMULATOR',
};

export const EXPENSE_CATEGORIES = {
  staff: { label: 'İşçi heyəti', color: 'text-blue-400' },
  utilities: { label: 'Kommunal', color: 'text-yellow-500' },
  service: { label: 'Xidmət', color: 'text-green-400' },
  marketing: { label: 'Reklam', color: 'text-purple-400' },
  transport: { label: 'Nəqliyyat', color: 'text-orange-400' },
  purchases: { label: 'Alışlar', color: 'text-red-400' },
  other: { label: 'Digər', color: 'text-muted-foreground' },
};

export const DEFAULT_TABLES = [
  // 7 Computers
  ...Array.from({ length: 7 }, (_, i) => ({
    name: `Gamezone ${i + 1}`, code: `PC${i + 1}`, category: 'computer',
    zone: 'hall', ps_model: 'none', hourly_rate: 2, order_number: i + 1,
  })),
  // 2 PS Cabinet
  ...Array.from({ length: 2 }, (_, i) => ({
    name: `Kabinet ${i + 1}`, code: `CabinPS${i + 1}`, category: 'cabinet',
    zone: 'cabinet', ps_model: 'ps5', hourly_rate: 5, order_number: 10 + i,
  })),
  // 4 PS Hall
  ...Array.from({ length: 4 }, (_, i) => ({
    name: `PS${i + 1}`, code: `PS${i + 1}`, category: 'playstation',
    zone: 'hall', ps_model: 'ps4', hourly_rate: 3, order_number: 20 + i,
  })),
  // 2 Simulators
  ...Array.from({ length: 2 }, (_, i) => ({
    name: `Oyun simulyatoru ${i + 1}`, code: `Sim${i + 1}`, category: 'simulator',
    zone: 'hall', ps_model: 'none', hourly_rate: 3, order_number: 30 + i,
  })),
];

export function getPsRate(model, zone) {
  return PS_PRICING[model]?.[zone] ?? 3;
}

export function roundCost(value) {
  return Math.round(value * 100) / 100;
}

// Unlimited session cost: first 60 min at 50%, rest per minute at full rate
export function calcUnlimitedCost(elapsedMinutes, hourlyRate) {
  if (elapsedMinutes <= 0) return 0;
  const firstHourDiscount = hourlyRate * 0.5; // 50% of hourly for first hour
  if (elapsedMinutes <= 60) {
    return roundCost((elapsedMinutes / 60) * firstHourDiscount);
  }
  const extraMinutes = elapsedMinutes - 60;
  return roundCost(firstHourDiscount + (extraMinutes / 60) * hourlyRate);
}