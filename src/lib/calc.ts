import type { OFZBond, Coupon } from '@/types'

export const IIS3_MAX_DEDUCTIBLE = 400_000
export const INCOME_TAX_RATE = 0.13
export const IIS3_MIN_YEARS = 5

export interface CalcInput {
  bond: OFZBond
  coupons: Coupon[]
  amount: number
  durationYears: number     // 0 = till maturity
  useIIS3: boolean
  reinvestCoupons: boolean  // reinvest net coupon cash into more bonds
  commissionRate: number    // broker commission as fraction, e.g. 0.001
  depositRate: number       // annual deposit rate for comparison, e.g. 0.18
}

export interface YearlyResult {
  year: number
  couponsCount: number
  couponIncome: number
  couponTax: number
  iisDeduction: number
  netIncome: number
}

export interface CalcResult {
  bond: OFZBond
  numberOfBonds: number
  pricePerBond: number
  totalInvested: number
  leftover: number
  endDate: Date
  actualDurationYears: number
  isAtMaturity: boolean
  useIIS3: boolean
  iis3Warning: boolean

  // Base scenario (no reinvestment)
  yearly: YearlyResult[]
  totalCouponIncome: number
  totalCouponTax: number
  totalIisDeduction: number
  redemptionValue: number
  redemptionGain: number
  redemptionTax: number
  commissionCost: number
  netProfit: number
  roi: number

  // Reinvestment scenario
  reinvestCoupons: boolean
  reinvYearly: YearlyResult[]
  reinvBondsAcquired: number
  reinvNetProfit: number
  reinvRoi: number

  // Deposit comparison
  depositRate: number
  depositGrossIncome: number
  depositRoi: number
}

export function calculate(input: CalcInput): CalcResult {
  const { bond, coupons, amount, durationYears, useIIS3, reinvestCoupons, commissionRate, depositRate } = input

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const maturityDate = new Date(bond.maturityDate)

  let endDate: Date
  let isAtMaturity: boolean
  if (durationYears === 0) {
    endDate = maturityDate
    isAtMaturity = true
  } else {
    const proposed = new Date(today)
    proposed.setFullYear(proposed.getFullYear() + durationYears)
    if (proposed >= maturityDate) {
      endDate = maturityDate
      isAtMaturity = true
    } else {
      endDate = proposed
      isAtMaturity = false
    }
  }

  const msPerYear = 365.25 * 24 * 3600 * 1000
  const actualDurationYears = (endDate.getTime() - today.getTime()) / msPerYear

  const pricePerBond = bond.faceValue * bond.prevWapPrice / 100 + bond.accruedInterest
  const numberOfBonds = Math.floor(amount / pricePerBond)
  const totalInvested = numberOfBonds * pricePerBond
  const leftover = amount - totalInvested

  const iis3Deduction = useIIS3 ? Math.min(amount, IIS3_MAX_DEDUCTIBLE) * INCOME_TAX_RATE : 0

  const futureCoupons = coupons.filter(c => {
    const d = new Date(c.couponDate)
    return d > today && d <= endDate
  })

  const startYear = today.getFullYear()
  const endYear = endDate.getFullYear()

  // --- Base scenario ---
  const yearMap = new Map<number, { count: number; income: number }>()
  for (const c of futureCoupons) {
    const year = new Date(c.couponDate).getFullYear()
    const prev = yearMap.get(year) ?? { count: 0, income: 0 }
    yearMap.set(year, { count: prev.count + 1, income: prev.income + c.valueRub * numberOfBonds })
  }

  const yearly: YearlyResult[] = []
  for (let y = startYear; y <= endYear; y++) {
    const data = yearMap.get(y) ?? { count: 0, income: 0 }
    const couponTax = useIIS3 ? 0 : data.income * INCOME_TAX_RATE
    const iisDeduction = useIIS3 && y === startYear ? iis3Deduction : 0
    yearly.push({ year: y, couponsCount: data.count, couponIncome: data.income, couponTax, iisDeduction, netIncome: data.income - couponTax + iisDeduction })
  }

  const totalCouponIncome = yearly.reduce((s, y) => s + y.couponIncome, 0)
  const totalCouponTax = yearly.reduce((s, y) => s + y.couponTax, 0)
  const totalIisDeduction = iis3Deduction

  let redemptionValue: number
  let redemptionGain: number
  let redemptionTax: number
  if (isAtMaturity) {
    redemptionValue = numberOfBonds * bond.faceValue
    redemptionGain = redemptionValue - numberOfBonds * bond.faceValue * bond.prevWapPrice / 100
    redemptionTax = useIIS3 || redemptionGain <= 0 ? 0 : redemptionGain * INCOME_TAX_RATE
  } else {
    redemptionValue = numberOfBonds * bond.faceValue * bond.prevWapPrice / 100
    redemptionGain = 0
    redemptionTax = 0
  }

  const commissionCost = totalInvested * commissionRate + (isAtMaturity ? 0 : redemptionValue * commissionRate)
  const netProfit = totalCouponIncome - totalCouponTax + totalIisDeduction + redemptionGain - redemptionTax - commissionCost
  const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0

  // --- Reinvestment scenario ---
  let reinvYearly = yearly
  let reinvBondsAcquired = 0
  let reinvNetProfit = netProfit
  let reinvRoi = roi

  if (reinvestCoupons && numberOfBonds > 0) {
    const rv = calcReinvestment(futureCoupons, numberOfBonds, pricePerBond, useIIS3, iis3Deduction, startYear, endYear)
    reinvYearly = rv.yearly
    reinvBondsAcquired = rv.bondsAcquired
    const reinvCouponIncome = rv.yearly.reduce((s, y) => s + y.couponIncome, 0)
    const reinvCouponTax = rv.yearly.reduce((s, y) => s + y.couponTax, 0)
    reinvNetProfit = reinvCouponIncome - reinvCouponTax + totalIisDeduction + redemptionGain - redemptionTax - commissionCost
    reinvRoi = totalInvested > 0 ? (reinvNetProfit / totalInvested) * 100 : 0
  }

  // --- Deposit comparison ---
  const depositGrossIncome = depositRate > 0 && actualDurationYears > 0
    ? amount * (Math.pow(1 + depositRate, actualDurationYears) - 1)
    : 0
  const depositRoi = amount > 0 ? (depositGrossIncome / amount) * 100 : 0

  return {
    bond, numberOfBonds, pricePerBond, totalInvested, leftover,
    endDate, actualDurationYears, isAtMaturity, useIIS3,
    iis3Warning: useIIS3 && actualDurationYears < IIS3_MIN_YEARS,
    yearly, totalCouponIncome, totalCouponTax, totalIisDeduction,
    redemptionValue, redemptionGain, redemptionTax,
    commissionCost, netProfit, roi,
    reinvestCoupons, reinvYearly, reinvBondsAcquired, reinvNetProfit, reinvRoi,
    depositRate, depositGrossIncome, depositRoi,
  }
}

function calcReinvestment(
  futureCoupons: Coupon[],
  initialBonds: number,
  pricePerBond: number,
  useIIS3: boolean,
  iis3Deduction: number,
  startYear: number,
  endYear: number,
): { yearly: YearlyResult[]; bondsAcquired: number } {
  const sorted = [...futureCoupons].sort((a, b) => a.couponDate.localeCompare(b.couponDate))

  let bonds = initialBonds
  let cashBuffer = 0
  let bondsAcquired = 0

  const yearIncome = new Map<number, { count: number; gross: number }>()
  for (let y = startYear; y <= endYear; y++) yearIncome.set(y, { count: 0, gross: 0 })

  for (const c of sorted) {
    const year = new Date(c.couponDate).getFullYear()
    const entry = yearIncome.get(year)
    if (!entry) continue

    const gross = c.valueRub * bonds
    const tax = useIIS3 ? 0 : gross * INCOME_TAX_RATE
    entry.count += 1
    entry.gross += gross
    cashBuffer += gross - tax

    const newBonds = Math.floor(cashBuffer / pricePerBond)
    if (newBonds > 0) {
      bonds += newBonds
      cashBuffer -= newBonds * pricePerBond
      bondsAcquired += newBonds
    }
  }

  const yearly: YearlyResult[] = []
  for (let y = startYear; y <= endYear; y++) {
    const entry = yearIncome.get(y) ?? { count: 0, gross: 0 }
    const couponTax = useIIS3 ? 0 : entry.gross * INCOME_TAX_RATE
    const iisDeduction = useIIS3 && y === startYear ? iis3Deduction : 0
    yearly.push({ year: y, couponsCount: entry.count, couponIncome: entry.gross, couponTax, iisDeduction, netIncome: entry.gross - couponTax + iisDeduction })
  }

  return { yearly, bondsAcquired }
}
