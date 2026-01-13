// Nigerian Banks List for Paystack
export const NIGERIAN_BANKS = [
  { code: "044", name: "Access Bank" },
  { code: "023", name: "Citibank Nigeria" },
  { code: "063", name: "Diamond Bank" },
  { code: "050", name: "Ecobank Nigeria" },
  { code: "084", name: "Enterprise Bank" },
  { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "214", name: "First City Monument Bank" },
  { code: "058", name: "Guaranty Trust Bank" },
  { code: "030", name: "Heritage Bank" },
  { code: "301", name: "Jaiz Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "526", name: "Parallex Bank" },
  { code: "076", name: "Polaris Bank" },
  { code: "101", name: "Providus Bank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "068", name: "Standard Chartered Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "100", name: "Suntrust Bank" },
  { code: "032", name: "Union Bank of Nigeria" },
  { code: "033", name: "United Bank For Africa" },
  { code: "215", name: "Unity Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
  { code: "999992", name: "Kuda Bank" },
  { code: "999991", name: "Opay" },
  { code: "999993", name: "PalmPay" },
  { code: "999994", name: "Moniepoint" },
];

// KYC Tier Limits
export const KYC_LIMITS = {
  unverified: {
    maxBalance: 50000,
    maxWithdrawal: 10000,
    dailyLimit: 20000,
  },
  basic: {
    maxBalance: 300000,
    maxWithdrawal: 50000,
    dailyLimit: 100000,
  },
  verified: {
    maxBalance: 5000000,
    maxWithdrawal: 500000,
    dailyLimit: 1000000,
  },
  premium: {
    maxBalance: 50000000,
    maxWithdrawal: 5000000,
    dailyLimit: 10000000,
  },
};

// Minimum withdrawal amount
export const MIN_WITHDRAWAL = 100;

// Transaction fees (percentage)
export const WITHDRAWAL_FEE_PERCENT = 1.5;
export const WITHDRAWAL_FEE_CAP = 2000;

// Format currency
export const formatCurrency = (amount: number, currency = "NGN"): string => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

// Format date
export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

// Generate reference
export const generateReference = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `YOMI_${timestamp}_${random}`.toUpperCase();
};
