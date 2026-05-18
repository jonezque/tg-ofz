import type { IISScenario, TaxResult } from '@/types'

/**
 * IIS Type A: 13% deduction on annual contributions.
 * Max deductible contribution: 400,000 RUB/year → max deduction 52,000 RUB/year.
 * Deduction cannot exceed actual income tax paid.
 */
export function calculateTypeA(_scenario: IISScenario): TaxResult {
  // TODO: implement
  throw new Error('Not implemented')
}

/**
 * IIS Type B: full exemption from personal income tax on investment profit
 * (coupons, capital gains) after closing the IIS (min hold: 3 years).
 */
export function calculateTypeB(_scenario: IISScenario): TaxResult {
  // TODO: implement
  throw new Error('Not implemented')
}

/** Compare both IIS types and return the more beneficial one for a given scenario */
export function recommendIISType(scenario: IISScenario): { type: 'A' | 'B'; reason: string } {
  // TODO: implement
  void scenario
  throw new Error('Not implemented')
}

export const MAX_DEDUCTIBLE_CONTRIBUTION = 400_000
export const PERSONAL_INCOME_TAX_RATE = 0.13
