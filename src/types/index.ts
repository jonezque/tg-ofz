export interface OFZBond {
  secId: string
  isin: string
  shortName: string
  faceValue: number
  couponPercent: number
  couponValue: number
  couponPeriod: number
  maturityDate: string
  nextCouponDate: string
  prevWapPrice: number
  yieldAtPrevWapPrice: number
  accruedInterest: number
  status: 'A' | 'N' | string
}

export interface Coupon {
  secId: string
  couponDate: string
  recordDate: string
  startDate: string
  value: number
  valuePrc: number
  valueRub: number
}

export type IISType = 'A' | 'B'

export interface IISScenario {
  type: IISType
  /** Annual contribution in RUB */
  annualContribution: number
  /** Number of years the IIS is held (min 3 for type B) */
  years: number
  /** User's annual income subject to personal income tax (for type A) */
  annualIncome: number
  /** Tax bracket rate, default 0.13 */
  taxRate: number
}

export interface TaxResult {
  scenarioType: IISType
  /** Total tax deduction (Type A: sum of deductions per year) */
  totalTaxDeduction: number
  /** Total coupon income over the period */
  totalCouponIncome: number
  /** Tax saved on coupon income (Type B: exempt; Type A: already deducted separately) */
  couponTaxSaved: number
  /** Net benefit compared to a regular brokerage account */
  netBenefit: number
  breakdown: TaxYearBreakdown[]
}

export interface TaxYearBreakdown {
  year: number
  contribution: number
  couponIncome: number
  deduction: number
  taxSaved: number
}
