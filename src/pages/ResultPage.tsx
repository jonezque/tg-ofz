import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { CalcResult, YearlyResult } from '@/lib/calc'
import { IIS3_MIN_YEARS } from '@/lib/calc'

function fmt(n: number) {
  return n.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })
}

function fmtDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function sign(n: number) { return n > 0 ? '+' : '' }

// ---- Bar chart ----------------------------------------------------------------

interface BarChartProps {
  base: YearlyResult[]
  reinvest?: YearlyResult[]
  showReinvest: boolean
}

function BarChart({ base, reinvest, showReinvest }: BarChartProps) {
  const show2 = showReinvest && reinvest != null
  const allValues = base.flatMap(y => {
    const rv = show2 ? (reinvest?.find(r => r.year === y.year)?.netIncome ?? 0) : 0
    return [y.netIncome, rv]
  })
  const max = Math.max(...allValues, 1)

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <div className="flex items-end gap-1" style={{ minWidth: base.length * 44, height: 140 }}>
        {base.map(y => {
          const rv = show2 ? (reinvest?.find(r => r.year === y.year)?.netIncome ?? 0) : 0
          const baseH = Math.max((y.netIncome / max) * 110, 2)
          const reinvH = show2 ? Math.max((rv / max) * 110, 2) : 0
          return (
            <div key={y.year} className="flex-1 flex flex-col items-center min-w-[36px]">
              <div className="w-full flex items-end justify-center gap-0.5" style={{ height: 110 }}>
                <div
                  className="flex-1 rounded-t-sm bg-tg-button"
                  style={{ height: baseH }}
                  title={`${y.year}: ${fmt(y.netIncome)}`}
                />
                {show2 && (
                  <div
                    className="flex-1 rounded-t-sm bg-green-500 opacity-80"
                    style={{ height: reinvH }}
                    title={`${y.year} (реинвест): ${fmt(rv)}`}
                  />
                )}
              </div>
              <span className="text-[9px] text-tg-hint mt-1">{String(y.year).slice(2)}</span>
            </div>
          )
        })}
      </div>
      {show2 && (
        <div className="flex gap-4 mt-2 text-xs text-tg-hint">
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-tg-button inline-block" />Без реинвеста</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-green-500 inline-block" />С реинвестом</span>
        </div>
      )}
    </div>
  )
}

// ---- Share text ---------------------------------------------------------------

function formatShareText(r: CalcResult): string {
  const endDate = new Date(r.endDate)
  const lines = [
    `${r.bond.shortName}${r.useIIS3 ? ' · ИИС-3' : ''}`,
    `Вложено: ${fmt(r.totalInvested)} (${r.numberOfBonds} обл.)`,
    `Срок: ${fmtDate(new Date())} → ${fmtDate(endDate)} (${r.actualDurationYears.toFixed(1)} лет)`,
    '',
    `Купонный доход: ${fmt(r.totalCouponIncome)}`,
  ]
  if (r.totalCouponTax > 0) lines.push(`НДФЛ с купонов: −${fmt(r.totalCouponTax)}`)
  if (r.totalIisDeduction > 0) lines.push(`Вычет ИИС-3: +${fmt(r.totalIisDeduction)}`)
  if (r.redemptionGain !== 0) lines.push(`Прибыль от погашения: ${sign(r.redemptionGain)}${fmt(r.redemptionGain)}`)
  if (r.commissionCost > 0) lines.push(`Комиссия: −${fmt(r.commissionCost)}`)
  lines.push('─────────────────────')
  lines.push(`Чистая прибыль: ${sign(r.netProfit)}${fmt(r.netProfit)}`)
  lines.push(`Доходность: ${r.roi.toFixed(1)}% (${(r.roi / r.actualDurationYears).toFixed(1)}% годовых)`)
  if (r.reinvestCoupons && r.reinvBondsAcquired > 0) {
    lines.push(`С реинвестом: ${sign(r.reinvNetProfit)}${fmt(r.reinvNetProfit)} (${(r.reinvRoi / r.actualDurationYears).toFixed(1)}% годовых)`)
  }
  if (r.depositRate > 0) {
    lines.push(`Вклад ${(r.depositRate * 100).toFixed(1)}%: ${fmt(r.depositGrossIncome)} (до налогов)`)
  }
  lines.push('', 'Рассчитано в ОФЗ Калькулятор')
  return lines.join('\n')
}

// ---- Page ---------------------------------------------------------------------

export function ResultPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const result = location.state as CalcResult | null
  const [copied, setCopied] = useState(false)

  if (!result) {
    return (
      <div className="min-h-screen bg-tg-bg text-tg-text flex flex-col items-center justify-center p-4 gap-4">
        <p className="text-tg-hint">Нет данных для отображения</p>
        <button onClick={() => navigate('/')} className="text-tg-accent text-sm font-medium">← К калькулятору</button>
      </div>
    )
  }

  const endDate = new Date(result.endDate)
  const annualizedRoi = result.actualDurationYears > 0 ? result.roi / result.actualDurationYears : 0
  const annualizedReinvRoi = result.actualDurationYears > 0 ? result.reinvRoi / result.actualDurationYears : 0
  const showReinvest = result.reinvestCoupons && result.reinvBondsAcquired > 0

  async function handleShare() {
    if (!result) return
    const text = formatShareText(result)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // clipboard unavailable — silently fail
    }
  }

  return (
    <div className="min-h-screen bg-tg-bg text-tg-text pb-10">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="text-tg-accent text-sm font-medium">← Назад</button>
        <button
          onClick={handleShare}
          className="text-tg-accent text-sm font-medium"
        >
          {copied ? '✓ Скопировано' : 'Поделиться'}
        </button>
      </div>

      <div className="px-4 space-y-4">

        {/* Bond header */}
        <div className="bg-tg-secondary-bg rounded-2xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold">{result.bond.shortName}</p>
              <p className="text-xs text-tg-hint mt-0.5">
                Доходность {result.bond.yieldAtPrevWapPrice.toFixed(1)}% · Погашение {result.bond.maturityDate.split('-').reverse().join('.')}
              </p>
            </div>
            {result.useIIS3 && (
              <span className="text-xs font-semibold bg-tg-button text-tg-button-text px-2.5 py-1 rounded-full shrink-0">ИИС-3</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-tg-hint">Облигаций</p>
              <p className="font-semibold">{result.numberOfBonds} шт.</p>
            </div>
            <div>
              <p className="text-xs text-tg-hint">Вложено</p>
              <p className="font-semibold">{fmt(result.totalInvested)}</p>
            </div>
            <div>
              <p className="text-xs text-tg-hint">Остаток</p>
              <p className="font-semibold">{fmt(result.leftover)}</p>
            </div>
          </div>
          <p className="text-xs text-tg-hint mt-3">
            {fmtDate(new Date())} → {fmtDate(endDate)}{result.isAtMaturity ? ' · до погашения' : ''}
          </p>
        </div>

        {/* IIS-3 early closure warning */}
        {result.iis3Warning && (
          <div className="rounded-xl px-4 py-3 text-sm text-amber-700 bg-amber-50 border border-amber-200">
            ⚠️ Для закрытия ИИС-3 без потерь нужно держать счёт минимум {IIS3_MIN_YEARS} лет. При досрочном закрытии придётся вернуть налоговый вычет.
          </div>
        )}

        {/* Bar chart */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-tg-section-header uppercase tracking-wide">Доход по годам</p>
            {showReinvest && (
              <p className="text-xs text-green-600 font-medium">+{result.reinvBondsAcquired} обл. реинвест</p>
            )}
          </div>
          <div className="bg-tg-secondary-bg rounded-xl p-3">
            <BarChart
              base={result.yearly}
              reinvest={result.reinvYearly}
              showReinvest={showReinvest}
            />
          </div>
        </section>

        {/* Year-by-year */}
        <section>
          <p className="text-xs font-semibold text-tg-section-header uppercase tracking-wide mb-2">По годам</p>
          <div className="space-y-2">
            {result.yearly.map((y, i) => {
              const rv = showReinvest ? result.reinvYearly[i] : null
              return (
                <div key={y.year} className="bg-tg-secondary-bg rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{y.year}</span>
                    <div className="text-right">
                      <span className={`font-semibold text-sm ${y.netIncome >= 0 ? 'text-green-600' : 'text-tg-destructive'}`}>
                        {sign(y.netIncome)}{fmt(y.netIncome)}
                      </span>
                      {rv && rv.netIncome !== y.netIncome && (
                        <span className="block text-xs text-green-500">{sign(rv.netIncome)}{fmt(rv.netIncome)} реинв.</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-tg-hint">
                    {y.couponsCount > 0 ? (
                      <>
                        <span>Купонов: {y.couponsCount} шт.</span>
                        <span className="text-right">Доход: {fmt(y.couponIncome)}</span>
                        {y.couponTax > 0 && (
                          <>
                            <span>НДФЛ с купонов</span>
                            <span className="text-right text-tg-destructive">−{fmt(y.couponTax)}</span>
                          </>
                        )}
                      </>
                    ) : (
                      <span>Купонов нет</span>
                    )}
                    {y.iisDeduction > 0 && (
                      <>
                        <span>Вычет ИИС-3</span>
                        <span className="text-right text-green-600">+{fmt(y.iisDeduction)}</span>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Redemption */}
        <section>
          <p className="text-xs font-semibold text-tg-section-header uppercase tracking-wide mb-2">
            {result.isAtMaturity ? 'При погашении' : 'При продаже'}
          </p>
          <div className="bg-tg-secondary-bg rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-tg-hint">{result.isAtMaturity ? 'Возврат номинала' : 'Рыночная стоимость'}</span>
              <span className="font-medium">{fmt(result.redemptionValue)}</span>
            </div>
            {result.redemptionGain !== 0 && (
              <div className="flex justify-between">
                <span className="text-tg-hint">Прибыль от цены</span>
                <span className={`font-medium ${result.redemptionGain >= 0 ? 'text-green-600' : 'text-tg-destructive'}`}>
                  {sign(result.redemptionGain)}{fmt(result.redemptionGain)}
                </span>
              </div>
            )}
            {result.redemptionTax > 0 && (
              <div className="flex justify-between">
                <span className="text-tg-hint">НДФЛ с прибыли</span>
                <span className="text-tg-destructive">−{fmt(result.redemptionTax)}</span>
              </div>
            )}
            {!result.isAtMaturity && (
              <p className="text-xs text-tg-hint pt-1">По текущей рыночной цене (приблизительно)</p>
            )}
          </div>
        </section>

        {/* Summary */}
        <section>
          <p className="text-xs font-semibold text-tg-section-header uppercase tracking-wide mb-2">Итого</p>
          <div className="bg-tg-secondary-bg rounded-2xl p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-tg-hint">Купонный доход</span>
              <span>{fmt(result.totalCouponIncome)}</span>
            </div>
            {result.totalCouponTax > 0 && (
              <div className="flex justify-between">
                <span className="text-tg-hint">НДФЛ с купонов</span>
                <span className="text-tg-destructive">−{fmt(result.totalCouponTax)}</span>
              </div>
            )}
            {result.totalIisDeduction > 0 && (
              <div className="flex justify-between">
                <span className="text-tg-hint">Вычет ИИС-3</span>
                <span className="text-green-600">+{fmt(result.totalIisDeduction)}</span>
              </div>
            )}
            {result.redemptionGain !== 0 && (
              <div className="flex justify-between">
                <span className="text-tg-hint">Прибыль от цены</span>
                <span className={result.redemptionGain >= 0 ? 'text-green-600' : 'text-tg-destructive'}>
                  {sign(result.redemptionGain)}{fmt(result.redemptionGain)}
                </span>
              </div>
            )}
            {result.redemptionTax > 0 && (
              <div className="flex justify-between">
                <span className="text-tg-hint">НДФЛ при погашении</span>
                <span className="text-tg-destructive">−{fmt(result.redemptionTax)}</span>
              </div>
            )}
            {result.commissionCost > 0 && (
              <div className="flex justify-between">
                <span className="text-tg-hint">Комиссия брокера</span>
                <span className="text-tg-destructive">−{fmt(result.commissionCost)}</span>
              </div>
            )}

            {/* Base result */}
            <div className="pt-3 border-t border-tg-hint/20 space-y-1.5">
              <div className="flex justify-between font-semibold text-base">
                <span>Чистая прибыль</span>
                <span className={result.netProfit >= 0 ? 'text-green-600' : 'text-tg-destructive'}>
                  {sign(result.netProfit)}{fmt(result.netProfit)}
                </span>
              </div>
              <div className="flex justify-between text-tg-hint text-xs">
                <span>За период / годовых</span>
                <span className="font-medium">{result.roi.toFixed(1)}% / {annualizedRoi.toFixed(1)}%</span>
              </div>
            </div>

            {/* Reinvestment comparison */}
            {showReinvest && (
              <div className="pt-2 border-t border-tg-hint/20 space-y-1.5">
                <p className="text-xs text-tg-hint font-medium">С реинвестированием купонов</p>
                <div className="flex justify-between font-semibold">
                  <span>Чистая прибыль</span>
                  <span className="text-green-600">{sign(result.reinvNetProfit)}{fmt(result.reinvNetProfit)}</span>
                </div>
                <div className="flex justify-between text-tg-hint text-xs">
                  <span>За период / годовых</span>
                  <span className="font-medium">{result.reinvRoi.toFixed(1)}% / {annualizedReinvRoi.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-tg-hint">Прирост от реинвеста</span>
                  <span className="text-green-600">+{fmt(result.reinvNetProfit - result.netProfit)}</span>
                </div>
              </div>
            )}

            {/* Deposit comparison */}
            {result.depositRate > 0 && result.depositGrossIncome > 0 && (
              <div className="pt-2 border-t border-tg-hint/20 space-y-1.5">
                <p className="text-xs text-tg-hint font-medium">Вклад {(result.depositRate * 100).toFixed(1)}% с капитализацией (до налогов)</p>
                <div className="flex justify-between font-semibold">
                  <span>Доход по вкладу</span>
                  <span>{fmt(result.depositGrossIncome)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-tg-hint">Разница с ОФЗ</span>
                  <span className={result.netProfit >= result.depositGrossIncome ? 'text-green-600' : 'text-tg-destructive'}>
                    {sign(result.netProfit - result.depositGrossIncome)}{fmt(result.netProfit - result.depositGrossIncome)}
                  </span>
                </div>
                <p className="text-[10px] text-tg-hint">Налог на вклад зависит от ключевой ставки ЦБ и упрощён</p>
              </div>
            )}

            <div className="flex justify-between text-tg-hint text-xs pt-1">
              <span>Срок</span>
              <span>{result.actualDurationYears.toFixed(1)} лет</span>
            </div>
          </div>
        </section>

        <button onClick={() => navigate('/')} className="w-full py-3 rounded-xl font-medium text-sm bg-tg-secondary-bg text-tg-text">
          Рассчитать снова
        </button>

      </div>
    </div>
  )
}
