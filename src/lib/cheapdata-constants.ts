// CheapDataHub Provider & Plan Constants

export const NETWORK_PROVIDERS = [
  { id: 1, name: "MTN", icon: "📶" },
  { id: 2, name: "Airtel", icon: "📡" },
  { id: 3, name: "Glo", icon: "🌐" },
  { id: 4, name: "9Mobile", icon: "📱" },
];

// Common data plans - users should verify exact bundle_ids from CheapDataHub plan-ids page
export const DATA_PLANS: Record<number, { bundle_id: number; name: string; amount: number }[]> = {
  1: [ // MTN
    { bundle_id: 1, name: "500MB - 30 Days", amount: 150 },
    { bundle_id: 2, name: "1GB - 30 Days", amount: 260 },
    { bundle_id: 3, name: "2GB - 30 Days", amount: 500 },
    { bundle_id: 4, name: "3GB - 30 Days", amount: 750 },
    { bundle_id: 5, name: "5GB - 30 Days", amount: 1250 },
    { bundle_id: 6, name: "10GB - 30 Days", amount: 2500 },
  ],
  2: [ // Airtel
    { bundle_id: 20, name: "500MB - 30 Days", amount: 150 },
    { bundle_id: 21, name: "1GB - 30 Days", amount: 260 },
    { bundle_id: 22, name: "2GB - 30 Days", amount: 500 },
    { bundle_id: 23, name: "5GB - 30 Days", amount: 1250 },
    { bundle_id: 24, name: "10GB - 30 Days", amount: 2500 },
  ],
  3: [ // Glo
    { bundle_id: 40, name: "500MB - 30 Days", amount: 150 },
    { bundle_id: 41, name: "1GB - 30 Days", amount: 260 },
    { bundle_id: 42, name: "2GB - 30 Days", amount: 500 },
    { bundle_id: 43, name: "5GB - 30 Days", amount: 1250 },
    { bundle_id: 44, name: "10GB - 30 Days", amount: 2500 },
  ],
  4: [ // 9Mobile
    { bundle_id: 60, name: "500MB - 30 Days", amount: 150 },
    { bundle_id: 61, name: "1GB - 30 Days", amount: 260 },
    { bundle_id: 62, name: "2GB - 30 Days", amount: 500 },
    { bundle_id: 63, name: "5GB - 30 Days", amount: 1250 },
  ],
};

export const ELECTRICITY_DISCOS = [
  { id: "ikeja-electric", name: "Ikeja Electric (IE)" },
  { id: "eko-electric", name: "Eko Electricity (EKEDC)" },
  { id: "abuja-electric", name: "Abuja Electricity (AEDC)" },
  { id: "kano-electric", name: "Kano Electricity (KEDCO)" },
  { id: "enugu-electric", name: "Enugu Electricity (EEDC)" },
  { id: "portharcourt-electric", name: "Port Harcourt (PHEDC)" },
  { id: "ibadan-electric", name: "Ibadan Electricity (IBEDC)" },
  { id: "kaduna-electric", name: "Kaduna Electricity (KAEDCO)" },
  { id: "jos-electric", name: "Jos Electricity (JED)" },
  { id: "benin-electric", name: "Benin Electricity (BEDC)" },
  { id: "yola-electric", name: "Yola Electricity (YEDC)" },
];

export const METER_TYPES = [
  { id: "prepaid", name: "Prepaid" },
  { id: "postpaid", name: "Postpaid" },
];

export const CABLE_PROVIDERS = [
  { id: "dstv", name: "DStv" },
  { id: "gotv", name: "GOtv" },
  { id: "startimes", name: "StarTimes" },
];

// Common cable plans - verify exact plan_ids from CheapDataHub
export const CABLE_PLANS: Record<string, { plan_id: string; name: string; amount: number }[]> = {
  dstv: [
    { plan_id: "dstv_padi", name: "DStv Padi", amount: 2500 },
    { plan_id: "dstv_yanga", name: "DStv Yanga", amount: 3500 },
    { plan_id: "dstv_confam", name: "DStv Confam", amount: 6200 },
    { plan_id: "dstv_compact", name: "DStv Compact", amount: 10500 },
    { plan_id: "dstv_compactplus", name: "DStv Compact Plus", amount: 16600 },
    { plan_id: "dstv_premium", name: "DStv Premium", amount: 29500 },
  ],
  gotv: [
    { plan_id: "gotv_smallie", name: "GOtv Smallie", amount: 1100 },
    { plan_id: "gotv_jinja", name: "GOtv Jinja", amount: 2250 },
    { plan_id: "gotv_jolli", name: "GOtv Jolli", amount: 3300 },
    { plan_id: "gotv_max", name: "GOtv Max", amount: 4850 },
    { plan_id: "gotv_supa", name: "GOtv Supa", amount: 6400 },
  ],
  startimes: [
    { plan_id: "startimes_nova", name: "StarTimes Nova", amount: 1200 },
    { plan_id: "startimes_basic", name: "StarTimes Basic", amount: 2100 },
    { plan_id: "startimes_smart", name: "StarTimes Smart", amount: 2900 },
    { plan_id: "startimes_classic", name: "StarTimes Classic", amount: 3000 },
    { plan_id: "startimes_super", name: "StarTimes Super", amount: 5500 },
  ],
};
