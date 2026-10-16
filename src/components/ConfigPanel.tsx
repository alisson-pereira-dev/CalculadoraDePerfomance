import type { ReactNode } from 'react'
import { RATE_KEYS, RATE_LABELS } from '../lib/calculations'
import { useFunnelStore } from '../store/useFunnelStore'
import { DatabaseIcon, FunnelIcon, SlidersIcon, UserIcon } from './ui/Icons'
import { NumberInput } from './ui/NumberInput'
import { Panel } from './ui/Panel'
import { RateSlider } from './ui/RateSlider'

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.08em] text-fg uppercase">
      <span className="text-brand-text">{icon}</span>
      {children}
    </h3>
  )
}

export function ConfigPanel({ collapsible }: { collapsible: boolean }) {
  const inputs = useFunnelStore((s) => s.inputs)
  const rates = useFunnelStore((s) => s.rates)
  const errors = useFunnelStore((s) => s.errors)
  const setInput = useFunnelStore((s) => s.setInput)
  const setRate = useFunnelStore((s) => s.setRate)

  return (
    <Panel
      title="Parâmetros do Cenário"
      icon={<SlidersIcon width={26} height={26} />}
      collapsible={collapsible}
      className="h-full"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <SectionTitle icon={<DatabaseIcon width={22} height={22} />}>Investimento</SectionTitle>
          <NumberInput
            label="Valor investido"
            value={inputs.investimento}
            step={500}
            error={errors.investimento}
            onChange={(v) => setInput('investimento', v)}
          />
        </div>

        <div className="flex flex-col gap-4">
          <SectionTitle icon={<UserIcon width={22} height={22} />}>Resultados</SectionTitle>
          <NumberInput
            label="CPL (Custo por Lead)"
            value={inputs.cpl}
            step={1}
            error={errors.cpl}
            onChange={(v) => setInput('cpl', v)}
          />
          <NumberInput
            label="Ticket Médio"
            value={inputs.ticketMedio}
            step={100}
            error={errors.ticketMedio}
            onChange={(v) => setInput('ticketMedio', v)}
          />
          <NumberInput
            label="Preço da Consulta"
            value={inputs.precoConsulta}
            step={50}
            hint="Opcional: valor cobrado por consulta realizada. Entra no faturamento."
            error={errors.precoConsulta}
            // campo vazio = não cobra consulta
            onChange={(v) => setInput('precoConsulta', Number.isNaN(v) ? 0 : v)}
          />
        </div>

        <hr className="border-line" />

        <div className="flex flex-col gap-5">
          <SectionTitle icon={<FunnelIcon width={22} height={22} />}>
            Taxas de conversão
          </SectionTitle>
          {RATE_KEYS.map((key) => (
            <RateSlider
              key={key}
              label={RATE_LABELS[key]}
              value={rates[key]}
              onChange={(v) => setRate(key, v)}
            />
          ))}
        </div>
      </div>
    </Panel>
  )
}
