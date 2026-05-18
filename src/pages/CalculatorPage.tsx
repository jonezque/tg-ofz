import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOFZBonds, useCoupons } from '@/hooks/useMoex'
import { calculate, IIS3_MAX_DEDUCTIBLE, INCOME_TAX_RATE, IIS3_MIN_YEARS } from '@/lib/calc'

const DURATION_OPTIONS = [
  { label: '1 год', value: 1 },
  { label: '2 года', value: 2 },
  { label: '3 года', value: 3 },
  { label: '5 лет', value: 5 },
  { label: '7 лет', value: 7 },
  { label: '10 лет', value: 10 },
  { label: 'До погашения', value: 0 },
]

function fmt(n: number) {
  return n.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })
}

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${d}.${m}.${y}`
}

function isFloating(secId: string) {
  return /^SU(29|52)/.test(secId)
}

export function CalculatorPage() {
  const navigate = useNavigate()

  const [selectedSecId, setSelectedSecId] = useState('')
  const [amountStr, setAmountStr] = useState('1000000')
  const [durationYears, setDurationYears] = useState(0)
  const [useIIS3, setUseIIS3] = useState(false)
  const [calcError, setCalcError] = useState('')

  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [reinvestCoupons, setReinvestCoupons] = useState(false)
  const [commissionStr, setCommissionStr] = useState('0.05')
  const [depositStr, setDepositStr] = useState('')

  const { data: bonds, isLoading: bondsLoading, error: bondsError } = useOFZBonds()
  const { data: coupons, isLoading: couponsLoading, error: couponsError } = useCoupons(selectedSecId)

  const selectedBond = bonds?.find(b => b.secId === selectedSecId) ?? null
  const amount = parseFloat(amountStr) || 0

  const bondPrice = selectedBond
    ? selectedBond.faceValue * selectedBond.prevWapPrice / 100 + selectedBond.accruedInterest
    : 0
  const estimatedBonds = bondPrice > 0 ? Math.floor(amount / bondPrice) : 0

  const iis3DeductionPreview = useIIS3 && amount > 0
    ? Math.min(amount, IIS3_MAX_DEDUCTIBLE) * INCOME_TAX_RATE
    : 0

  const canCalculate = selectedBond != null && amount > 0 && coupons != null && !couponsLoading

  function handleCalculate() {
    if (!selectedBond || !coupons) return
    const result = calculate({
      bond: selectedBond,
      coupons,
      amount,
      durationYears,
      useIIS3,
      reinvestCoupons,
      commissionRate: (parseFloat(commissionStr) || 0) / 100,
      depositRate: (parseFloat(depositStr) || 0) / 100,
    })
    if (result.numberOfBonds === 0) {
      setCalcError(`Сумма слишком мала. Цена 1 облигации: ${fmt(result.pricePerBond)}`)
      return
    }
    setCalcError('')
    navigate('/result', { state: result })
  }

  return (
    <div className="min-h-screen bg-tg-bg text-tg-text pb-10">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-semibold">ОФЗ Калькулятор</h1>
        <p className="text-sm text-tg-hint mt-1">Доходность вложений в государственные облигации</p>
      </div>

      <div className="px-4 space-y-5">

        {/* Bond selector */}
        <section>
          <p className="text-xs font-semibold text-tg-section-header uppercase tracking-wide mb-2">Облигация</p>
          {bondsLoading && <div className="h-12 bg-tg-secondary-bg rounded-xl animate-pulse" />}
          {bondsError && <p className="text-sm text-tg-destructive py-2">Ошибка загрузки облигаций. Проверьте соединение.</p>}
          {bonds && (
            <select
              value={selectedSecId}
              onChange={e => { setSelectedSecId(e.target.value); setCalcError('') }}
              className="w-full bg-tg-secondary-bg text-tg-text rounded-xl px-4 py-3 text-sm outline-none"
            >
              <option value="">— Выберите ОФЗ —</option>
              {bonds.map(b => {
                const float = isFloating(b.secId)
                return (
                  <option key={b.secId} value={b.secId}>
                    {b.shortName}{float ? ' [ПК]' : ''} · купон {float ? 'плав.' : `${b.couponPercent.toFixed(2)}%`} · тело {b.prevWapPrice.toFixed(2)}%{!float ? ` · YTM ${b.yieldAtPrevWapPrice.toFixed(2)}%` : ''} · {fmtDate(b.maturityDate)}
                  </option>
                )
              })}
            </select>
          )}
          {selectedBond && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-tg-hint">
              <span>Купон: <span className="text-tg-text font-medium">{isFloating(selectedBond.secId) ? 'плавающий' : `${selectedBond.couponPercent.toFixed(2)}%`}</span></span>
              <span>Тело: <span className="text-tg-text font-medium">{selectedBond.prevWapPrice.toFixed(2)}%</span></span>
              {!isFloating(selectedBond.secId) && (
                <span>YTM: <span className="text-tg-accent font-medium">{selectedBond.yieldAtPrevWapPrice.toFixed(2)}%</span></span>
              )}
              <span>НКД: {selectedBond.accruedInterest.toFixed(2)} ₽</span>
            </div>
          )}
          {couponsLoading && selectedSecId && <p className="text-xs text-tg-hint mt-1">Загрузка графика купонов…</p>}
          {couponsError && <p className="text-xs text-tg-destructive mt-1">Ошибка загрузки купонов</p>}
        </section>

        {/* Amount */}
        <section>
          <p className="text-xs font-semibold text-tg-section-header uppercase tracking-wide mb-2">Сумма инвестиций</p>
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              value={amountStr}
              onChange={e => { setAmountStr(e.target.value); setCalcError('') }}
              placeholder="1000000"
              className="w-full bg-tg-secondary-bg text-tg-text rounded-xl px-4 py-3 pr-8 text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-tg-hint text-sm pointer-events-none">₽</span>
          </div>
          <div className="mt-1.5 flex gap-3 text-xs text-tg-hint">
            {amount > 0 && <span>{fmt(amount)}</span>}
            {selectedBond && amount > 0 && estimatedBonds > 0 && (
              <span>≈ {estimatedBonds} облигаций по {fmt(bondPrice)}</span>
            )}
            {selectedBond && amount > 0 && estimatedBonds === 0 && (
              <span className="text-tg-destructive">Мало: цена 1 обл. {fmt(bondPrice)}</span>
            )}
          </div>
        </section>

        {/* Duration */}
        <section>
          <p className="text-xs font-semibold text-tg-section-header uppercase tracking-wide mb-2">Срок</p>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDurationYears(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  durationYears === opt.value ? 'bg-tg-button text-tg-button-text' : 'bg-tg-secondary-bg text-tg-text'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Account type */}
        <section>
          <p className="text-xs font-semibold text-tg-section-header uppercase tracking-wide mb-2">Тип счёта</p>
          <div className="flex rounded-xl bg-tg-secondary-bg p-1 gap-1">
            <button
              onClick={() => setUseIIS3(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${!useIIS3 ? 'bg-tg-button text-tg-button-text' : 'text-tg-text'}`}
            >
              Брокерский счёт
            </button>
            <button
              onClick={() => setUseIIS3(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${useIIS3 ? 'bg-tg-button text-tg-button-text' : 'text-tg-text'}`}
            >
              ИИС-3
            </button>
          </div>

          {useIIS3 && (
            <div className="mt-3 bg-tg-secondary-bg rounded-xl p-4 space-y-1.5 text-sm">
              <p className="font-medium mb-2">Преимущества ИИС-3</p>
              <p className="text-tg-hint">✓ Вычет 13% на взнос до {fmt(IIS3_MAX_DEDUCTIBLE)}/год</p>
              <p className="text-tg-hint">✓ Максимальный вычет: {fmt(IIS3_MAX_DEDUCTIBLE * INCOME_TAX_RATE)}/год</p>
              <p className="text-tg-hint">✓ Купоны не облагаются НДФЛ</p>
              <p className="text-tg-hint">✓ Прибыль при погашении — без НДФЛ</p>
              <p className="text-amber-600 text-xs mt-1">⚠ Минимальный срок: {IIS3_MIN_YEARS} лет</p>
              {iis3DeductionPreview > 0 && (
                <div className="pt-2 mt-2 border-t border-tg-hint/20">
                  <p>Вычет при вашей сумме: <span className="font-semibold text-tg-accent">{fmt(iis3DeductionPreview)}</span></p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Advanced settings */}
        <section>
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-2 text-xs font-semibold text-tg-section-header uppercase tracking-wide"
          >
            <span>{showAdvanced ? '▼' : '▶'}</span>
            Дополнительно
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-4">
              {/* Reinvest toggle */}
              <div className="flex items-center justify-between bg-tg-secondary-bg rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Реинвестировать купоны</p>
                  <p className="text-xs text-tg-hint mt-0.5">Купоны идут на покупку новых облигаций</p>
                </div>
                <button
                  onClick={() => setReinvestCoupons(v => !v)}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${reinvestCoupons ? 'bg-tg-button' : 'bg-tg-hint/40'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${reinvestCoupons ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Commission */}
              <div>
                <p className="text-xs text-tg-hint mb-1.5">Комиссия брокера, %</p>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={commissionStr}
                    onChange={e => setCommissionStr(e.target.value)}
                    placeholder="0.05"
                    step="0.01"
                    className="w-full bg-tg-secondary-bg text-tg-text rounded-xl px-4 py-3 pr-8 text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-tg-hint text-sm pointer-events-none">%</span>
                </div>
              </div>

              {/* Deposit rate */}
              <div>
                <p className="text-xs text-tg-hint mb-1.5">Ставка вклада для сравнения, % годовых</p>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={depositStr}
                    onChange={e => setDepositStr(e.target.value)}
                    placeholder="18"
                    step="0.5"
                    className="w-full bg-tg-secondary-bg text-tg-text rounded-xl px-4 py-3 pr-8 text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-tg-hint text-sm pointer-events-none">%</span>
                </div>
                <p className="text-xs text-tg-hint mt-1">Оставьте пустым, чтобы не сравнивать</p>
              </div>
            </div>
          )}
        </section>

        {/* Calculate */}
        <div className="pt-1">
          {calcError && <p className="text-sm text-tg-destructive text-center mb-3">{calcError}</p>}
          <button
            onClick={handleCalculate}
            disabled={!canCalculate}
            className="w-full py-4 rounded-xl font-semibold text-base bg-tg-button text-tg-button-text disabled:opacity-40 transition-opacity"
          >
            Рассчитать
          </button>
        </div>

      </div>
    </div>
  )
}
