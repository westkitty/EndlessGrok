import { useState } from 'react';
import { getShipDisplayName } from '../game/ships';
import { Icon } from './icons/Icon';
import { getShipIconName } from './icons/iconHelpers';
import type { BattleReport, GameState } from '../game/types';

interface Props {
  state: GameState;
}

export function BattleReportPanel({ state }: Props) {
  const [tab, setTab] = useState<'recent' | 'history'>('recent');
  const allReports = [...state.combatResults].reverse();
  const reports = tab === 'recent' ? allReports.slice(0, 5) : allReports;

  if (state.combatResults.length === 0) {
    return (
      <div className="section">
        <div className="section-title">
          <Icon name="combat" size={14} />
          Battle Reports
        </div>
        <p className="panel-empty" style={{ padding: '8px 0' }}>No battles yet.</p>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span><Icon name="combat" size={14} /> Battle Reports</span>
        <span className="battle-report-tabs">
          <button className={`btn btn-sm ${tab === 'recent' ? 'btn-primary' : ''}`} onClick={() => setTab('recent')}>Recent</button>
          <button className={`btn btn-sm ${tab === 'history' ? 'btn-primary' : ''}`} onClick={() => setTab('history')}>History ({state.combatResults.length})</button>
        </span>
      </div>
      {reports.map((report, idx) => (
        <BattleReportCard key={`${report.systemId}-${report.rounds}-${idx}`} report={report} state={state} />
      ))}
    </div>
  );
}

function BattleReportCard({ report, state }: { report: BattleReport; state: GameState }) {
  const attacker = state.empires.find(e => e.id === report.attackerId)!;
  const defender = state.empires.find(e => e.id === report.defenderId)!;
  const winner = state.empires.find(e => e.id === report.winnerId)!;
  const system = state.systems.find(s => s.id === report.systemId);
  const maxPower = Math.max(report.attackerPower, report.defenderPower, 1);
  const phaseLogs = report.log.filter(l => l.startsWith('--- Round') || l.includes('destroyed') || l.includes('Victor'));

  return (
    <div className="battle-report">
      <div className="battle-report__header">
        <span className="battle-report__system">{system?.name ?? report.systemId}</span>
        <span className="battle-report__rounds">{report.rounds} rounds</span>
      </div>
      <div className="battle-report__matchup">
        <span style={{ color: attacker.color }}>{attacker.name}</span>
        <span> vs </span>
        <span style={{ color: defender.color }}>{defender.name}</span>
      </div>

      <div className="battle-power-bars">
        <div className="battle-power-row">
          <span className="battle-power-label" style={{ color: attacker.color }}>ATK</span>
          <div className="battle-power-track">
            <div
              className="battle-power-fill battle-power-fill--attacker"
              style={{ width: `${(report.attackerPower / maxPower) * 100}%`, background: attacker.color }}
            />
          </div>
          <span className="battle-power-value">{report.attackerPower}</span>
        </div>
        <div className="battle-power-row">
          <span className="battle-power-label" style={{ color: defender.color }}>DEF</span>
          <div className="battle-power-track">
            <div
              className="battle-power-fill battle-power-fill--defender"
              style={{ width: `${(report.defenderPower / maxPower) * 100}%`, background: defender.color }}
            />
          </div>
          <span className="battle-power-value">{report.defenderPower}</span>
        </div>
      </div>

      {phaseLogs.length > 0 && (
        <div className="battle-replay-phases">
          {phaseLogs.map((line, i) => (
            <div key={i} className="battle-replay-phase">{line}</div>
          ))}
        </div>
      )}

      {report.attackerShipLosses.length > 0 && (
        <div className="battle-report__losses">
          {attacker.name} lost:{' '}
          {report.attackerShipLosses.map(l => (
            <span key={l.type} className="fleet-ship-badge">
              <Icon name={getShipIconName(l.type)} size={10} />
              {l.count}x {getShipDisplayName(l.type)}
            </span>
          ))}
        </div>
      )}
      {report.defenderShipLosses.length > 0 && (
        <div className="battle-report__losses">
          {defender.name} lost:{' '}
          {report.defenderShipLosses.map(l => (
            <span key={l.type} className="fleet-ship-badge">
              <Icon name={getShipIconName(l.type)} size={10} />
              {l.count}x {getShipDisplayName(l.type)}
            </span>
          ))}
        </div>
      )}
      <div className="battle-report__winner" style={{ color: winner.color }}>
        Victor: {winner.name}
        {report.retreated && ' (opponent retreated)'}
        {report.salvageCredits ? ` · Salvage +${report.salvageCredits}cr` : ''}
      </div>
    </div>
  );
}