export type DeviceType = 'cigarettes' | 'iqos' | 'vape' | 'mini_vape';

export interface DbUser {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  device_type: DeviceType;
  units_per_day: number;
  price_per_pack: number;
  units_in_pack: number;
  nicotine_mg: number;
  years_smoking: number;
  timezone_offset: number;
  motivation: string;
  quit_date: string | null;
  onboarding_done: number;
  is_admin: number;
  goal_title?: string;
  goal_amount?: number;
  notifications_enabled?: number;
  created_at: string;
}

export interface DbContent {
  id: number;
  type: string;
  category: string;
  text: string;
  active: number;
  created_at: string;
}

export interface DbMaterial {
  id: number;
  title: string;
  url: string;
  description: string;
  category: string;
  sort_order: number;
  active: number;
  created_at: string;
}

export interface CravingStats {
  total: number;
  resisted: number;
  avgIntensity: number;
}

export interface ProgressData {
  smokeFreeDays: number;
  smokeFreeHours: number;
  smokeFreeMinutes: number;
  unitsAvoided: number;
  moneySaved: number;
  lifeRegainedMinutes: number;
  poisonAvoided: string;
  deviceLabel: string;
}

export const DEVICE_NAMES: Record<DeviceType, string> = {
  cigarettes: '🚬 Сигареты',
  iqos: '📱 IQOS / Glo',
  vape: '💨 Вейп',
  mini_vape: '🔋 Мини-вейп / Pod',
};

export const DEVICE_LABELS: Record<DeviceType, string> = {
  cigarettes: 'сигарет',
  iqos: 'стиков IQOS',
  vape: 'затяжек вейпа',
  mini_vape: 'затяжек мини-вейпа',
};

export const DEVICE_UNIT_LABELS: Record<DeviceType, string> = {
  cigarettes: 'сигарет/день',
  iqos: 'стиков/день',
  vape: 'затяжек/день',
  mini_vape: 'затяжек/день',
};

export const DEVICE_POISON_FACTOR: Record<DeviceType, number> = {
  cigarettes: 0.012,
  iqos: 0.005,
  vape: 0.001,
  mini_vape: 0.0008,
};

export const DEVICE_LIFE_MINUTES: Record<DeviceType, number> = {
  cigarettes: 11,
  iqos: 7,
  vape: 3,
  mini_vape: 2,
};
