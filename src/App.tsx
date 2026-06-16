import { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';
import { cloneGameState } from './game/clone';
import { resolveDecisionAction } from './game/actions';
import { createNewGame, endTurn } from './game/game';
import { getPendingDecisionsForEmpire } from './game/playerDecisions';
import { saveGame, hasSave, listSaveMetadata, loadGameFromSlot, importSaveFromJson, downloadSave, type SaveSlotId } from './game/save';
import { GALAXY_SHAPE_DESCRIPTIONS } from './game/settings';
import { FACTION_DEFINITIONS, factionToPlayerSetup } from './game/factions';
import { loadUISettings, saveUISettings, type UISettings } from './game/uiSettings';
import type { Difficulty, GalaxyShape, GalaxySizeOption, GameSettings, GameState, Resources, TurnSummary } from './game/types';
import { GalaxyMap, getDefaultViewport } from './components/GalaxyMap';
import type { GalaxyTransform, GalaxyViewport } from './components/galaxy/mapHelpers';
import { Minimap } from './components/Minimap';
import { SystemPanel } from './components/SystemPanel';
import { EmpirePanel } from './components/EmpirePanel';
import { ResearchPanel } from './components/ResearchPanel';
import { DiplomacyPanel } from './components/DiplomacyPanel';
import { EventLog } from './components/EventLog';
import { ResourceBar } from './components/ResourceBar';
import { TurnNotifications } from './components/TurnNotifications';
import { StarfieldBackground } from './components/StarfieldBackground';
import { VictoryProgress } from './components/VictoryProgress';
import { TurnSummaryModal } from './components/TurnSummaryModal';
import { PauseMenuOverlay } from './components/PauseMenuOverlay';
import { SettingsModal } from './components/SettingsModal';
import { KeyboardShortcutsOverlay } from './components/KeyboardShortcutsOverlay';
import { CombatOverlay } from './components/CombatOverlay';
import { LoadingScreen } from './components/LoadingScreen';
import { Icon, getEmblemIconName } from './components/icons/Icon';
import { ConfirmDialog } from './components/ConfirmDialog';
import { LoadSaveModal } from './components/LoadSaveModal';
import { PrecursorLoreModal } from './components/PrecursorLoreModal';

type Tab = 'system' | 'empire' | 'research' | 'diplomacy';

const TAB_HOTKEYS: Record<string, Tab> = { '1': 'system', '2': 'empire', '3': 'research', '4': 'diplomacy' };

function NewGameSetup({ onNewGame, onLoadSlot, onImportSave, defaultGalaxyShape }: {
  onNewGame: (seed?: number, settings?: Partial<GameSettings>, factionIndex?: number) => void;
  onLoadSlot: (slotId: SaveSlotId) => { error: string | null };
  onImportSave: (file: File) => void;
  defaultGalaxyShape: GalaxyShape;
}) {
  const [seed, setSeed] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [galaxySize, setGalaxySize] = useState<GalaxySizeOption>('medium');
  const [galaxyShape, setGalaxyShape] = useState<GalaxyShape>(defaultGalaxyShape);
  const [empireCount, setEmpireCount] = useState(2);
  const [maxTurns, setMaxTurns] = useState(100);
  const [selectedFaction, setSelectedFaction] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const saves = listSaveMetadata();

  const startGame = () => {
    onNewGame(parseInt(seed) || undefined, { difficulty, galaxySize, galaxyShape, empireCount, maxTurns }, selectedFaction);
  };

  const handleStart = () => {
    if (hasSave()) {
      setShowConfirm(true);
      return;
    }
    startGame();
  };

  const confirmNewGame = () => {
    setShowConfirm(false);
    startGame();
  };

  return (
    <div className="menu-screen">
      <StarfieldBackground seed={42} />
      <div className="menu-content">
        <Icon name="emblem-terran" size={64} className="menu-emblem" />
        <h1 className="menu-title">Endless Grok</h1>
        <p className="menu-subtitle">A 4X Space Strategy Prototype</p>

        <div className="new-game-setup">
          <div className="setup-field">
            <label>Choose Faction</label>
            <div className="faction-cards">
              {FACTION_DEFINITIONS.slice(0, 5).map(f => (
                <button
                  key={f.index}
                  type="button"
                  className={`faction-card ${selectedFaction === f.index ? 'faction-card--selected' : ''}`}
                  onClick={() => setSelectedFaction(f.index)}
                  style={{ '--faction-color': f.color } as React.CSSProperties}
                >
                  <Icon name={getEmblemIconName(f.emblem)} size={36} />
                  <span className="faction-card__name">{f.name}</span>
                  <span className="faction-card__trait">{f.trait}</span>
                  <span className="faction-card__desc">{f.traitDescription}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="setup-field">
            <label>Difficulty</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)}>
              <option value="easy">Easy</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="setup-field">
            <label>Galaxy Size</label>
            <select value={galaxySize} onChange={e => setGalaxySize(e.target.value as GalaxySizeOption)}>
              <option value="small">Small (16 systems)</option>
              <option value="medium">Medium (24 systems)</option>
              <option value="large">Large (36 systems)</option>
              <option value="huge">Huge (48 systems)</option>
            </select>
          </div>

          <div className="setup-field">
            <label>Galaxy Shape</label>
            <select value={galaxyShape} onChange={e => setGalaxyShape(e.target.value as GalaxyShape)}>
              <option value="spiral">Spiral</option>
              <option value="cluster">Cluster</option>
              <option value="ring">Ring</option>
              <option value="elliptical">Elliptical</option>
              <option value="sparse">Sparse</option>
            </select>
            <p className="galaxy-shape-preview">{GALAXY_SHAPE_DESCRIPTIONS[galaxyShape]}</p>
          </div>

          <div className="setup-field">
            <label>Empires (2–4 total)</label>
            <select value={empireCount} onChange={e => setEmpireCount(parseInt(e.target.value))}>
              <option value={2}>2 Empires (1 AI)</option>
              <option value={3}>3 Empires (2 AI)</option>
              <option value={4}>4 Empires (3 AI)</option>
            </select>
          </div>

          <div className="setup-field">
            <label>Max Turns</label>
            <input type="number" min={50} max={300} value={maxTurns}
              onChange={e => setMaxTurns(parseInt(e.target.value) || 100)} />
          </div>

          <div className="seed-input">
            <input
              type="number"
              placeholder="Seed (optional)"
              value={seed}
              onChange={e => setSeed(e.target.value)}
              aria-label="Game seed"
            />
          </div>
        </div>

        {saves.length > 0 && (
          <div className="save-metadata-preview">
            <div className="save-metadata-preview__title">Saved Games</div>
            {saves.slice(0, 3).map(s => (
              <div key={s.slotId} className="save-metadata-preview__item">
                {s.faction} — Turn {s.turn} ({s.galaxySize})
              </div>
            ))}
          </div>
        )}

        <div className="menu-buttons">
          <button className="btn btn-primary" onClick={handleStart}>New Game</button>
          {hasSave() && (
            <button className="btn" onClick={() => setShowLoadModal(true)}>Load Game</button>
          )}
          <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
            Import Save
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => {
              const file = e.target.files?.[0];
              if (file) onImportSave(file);
            }} />
          </label>
        </div>

        {showConfirm && (
          <ConfirmDialog
            title="Start New Game?"
            message="This will overwrite your autosave. Continue?"
            confirmLabel="Start New Game"
            onConfirm={confirmNewGame}
            onCancel={() => setShowConfirm(false)}
          />
        )}

        {showLoadModal && (
          <LoadSaveModal
            loadError={loadError}
            onCancel={() => { setShowLoadModal(false); setLoadError(null); }}
            onLoad={(slotId: SaveSlotId) => {
              const result = onLoadSlot(slotId);
              if (result.error) { setLoadError(result.error); return; }
              setShowLoadModal(false);
              setLoadError(null);
            }}
          />
        )}

        <p className="menu-description">
          Explore the galaxy, colonize planets, build structures, research technologies,
          explore anomalies, and compete against AI empires.
          Win by domination, science, influence, or survival.
        </p>
      </div>
    </div>
  );
}

function GameScreen({
  state,
  onUpdate,
  onMenu,
  uiSettings,
  onUISettingsChange,
}: {
  state: GameState;
  onUpdate: (s: GameState) => void;
  onMenu: () => void;
  uiSettings: UISettings;
  onUISettingsChange: (s: UISettings) => void;
}) {
  const [tab, setTab] = useState<Tab>('system');
  const [paused, setPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHotkeys, setShowHotkeys] = useState(false);
  const [turnSummary, setTurnSummary] = useState<TurnSummary | null>(null);
  const [resourceDeltas, setResourceDeltas] = useState<Partial<Resources>>({});
  const [viewport, setViewport] = useState<GalaxyViewport>(getDefaultViewport());
  const [mapTransform, setMapTransform] = useState<GalaxyTransform | null>(null);
  const [combatFlash, setCombatFlash] = useState(false);
  const prevResourcesRef = useRef<Resources | null>(null);
  const prevCombatCountRef = useRef(state.combatResults.length);

  const player = state.empires.find(e => e.id === state.playerEmpireId)!;

  useEffect(() => {
    if (state.combatResults.length > prevCombatCountRef.current) {
      setCombatFlash(true);
      const t = setTimeout(() => setCombatFlash(false), 700);
      prevCombatCountRef.current = state.combatResults.length;
      return () => clearTimeout(t);
    }
    prevCombatCountRef.current = state.combatResults.length;
  }, [state.combatResults.length]);

  const handleEndTurn = useCallback(() => {
    prevResourcesRef.current = { ...player.resources };
    const cloned = cloneGameState(state);
    const newState = endTurn(cloned);
    saveGame(newState);

    const latestSummary = newState.turnSummaries[newState.turnSummaries.length - 1] ?? null;
    if (latestSummary) {
      setTurnSummary(latestSummary);
      if (prevResourcesRef.current) {
        setResourceDeltas({
          credits: newState.empires.find(e => e.id === player.id)!.resources.credits - prevResourcesRef.current.credits,
          food: newState.empires.find(e => e.id === player.id)!.resources.food - prevResourcesRef.current.food,
          industry: newState.empires.find(e => e.id === player.id)!.resources.industry - prevResourcesRef.current.industry,
          science: newState.empires.find(e => e.id === player.id)!.resources.science - prevResourcesRef.current.science,
        });
      }
    }

    onUpdate(newState);
  }, [state, onUpdate, player.id]);

  const handleSelectSystem = (systemId: string) => {
    onUpdate({ ...state, selectedSystemId: systemId });
    setTab('system');
  };

  const handleSave = () => {
    saveGame(state);
    const newState = cloneGameState(state);
    newState.events = [...newState.events, { turn: state.turn, type: 'explore', message: 'Game saved.' }];
    onUpdate(newState);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (turnSummary) {
        if (e.key === 'Escape' || e.key === 'Enter') setTurnSummary(null);
        return;
      }
      if (showHotkeys) {
        if (e.key === 'Escape' || e.key === '?') setShowHotkeys(false);
        return;
      }
      if (showSettings) return;

      if (e.key === 'Escape') {
        setPaused(p => !p);
        return;
      }
      if (e.key === '?') {
        setShowHotkeys(true);
        return;
      }
      if (e.key === 'e' || e.key === 'E') {
        if (!paused && state.phase === 'playing') handleEndTurn();
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        setViewport(getDefaultViewport());
        return;
      }
      if (TAB_HOTKEYS[e.key] && !paused) setTab(TAB_HOTKEYS[e.key]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleEndTurn, paused, showHotkeys, showSettings, state.phase, turnSummary]);

  const panelStyle = { '--player-faction-color': player.color } as React.CSSProperties;

  return (
    <div
      className={`app ${uiSettings.scanlinesEnabled ? 'app--scanlines' : ''} ${!uiSettings.animationsEnabled ? 'app--no-anim' : ''}`}
      style={{ ...panelStyle, fontSize: `${uiSettings.uiScale}rem` }}
    >
      <div className="hud">
        <div className="hud-left">
          <div className="hud-empire">
            <Icon name={getEmblemIconName(player.emblem)} size={24} style={{ filter: `drop-shadow(0 0 6px ${player.color})` }} />
            <span className="hud-empire-name" style={{ color: player.color }}>{player.name}</span>
          </div>
          <span className="turn-counter">
            Turn <span>{state.turn}</span>/{state.maxTurns}
          </span>
          {state.lastAutosaveTurn === state.turn && (
            <span className="autosave-indicator" title="Autosaved this turn">💾 Autosaved</span>
          )}
          <VictoryProgress state={state} />
          <ResourceBar
            resources={player.resources}
            strategicResources={player.strategicResources}
            influence={player.influence}
            deltas={resourceDeltas}
            economy={state.turnSummaries[state.turnSummaries.length - 1]?.economy}
            compact
          />
        </div>
        <div className="hud-right">
          <button className="btn btn-sm" onClick={() => setShowHotkeys(true)} title="Hotkeys (?)" aria-label="Show hotkeys">?</button>
          <button className="btn btn-sm" onClick={() => setShowSettings(true)} title="Settings">⚙</button>
          <button className="btn btn-sm" onClick={() => setPaused(true)} title="Menu (Esc)">Menu</button>
          <button className="btn btn-sm" onClick={handleSave}>Save</button>
          <button className="btn btn-sm" onClick={() => downloadSave(state)} title="Export save as JSON">Export</button>
          <button className="btn btn-sm btn-primary" onClick={handleEndTurn} title="End Turn (E)">
            End Turn <kbd className="hotkey-hint">E</kbd>
          </button>
        </div>
      </div>

      <div className="game-layout">
        <div className="galaxy-container">
          <GalaxyMap
            state={state}
            onSelectSystem={handleSelectSystem}
            viewport={viewport}
            onViewportChange={setViewport}
            onTransformChange={setMapTransform}
            animationsEnabled={uiSettings.animationsEnabled}
          />
          {mapTransform && (
            <Minimap
              state={state}
              viewport={viewport}
              transform={mapTransform}
              onNavigate={(panX, panY) => setViewport(v => ({ ...v, panX, panY }))}
              onSelectSystem={handleSelectSystem}
            />
          )}
          <CombatOverlay active={combatFlash} animationsEnabled={uiSettings.animationsEnabled} />
        </div>
        <div className="side-panel" style={panelStyle}>
          <div className="panel-tabs">
            {(['system', 'empire', 'research', 'diplomacy'] as Tab[]).map((t, i) => (
              <div
                key={t}
                className={`panel-tab panel-tab--stagger-${i} ${tab === t ? 'active' : ''}`}
                onClick={() => setTab(t)}
                role="tab"
                aria-selected={tab === t}
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setTab(t)}
              >
                <Icon name={t === 'system' ? 'anomaly' : t === 'empire' ? 'fleet' : t === 'research' ? 'research' : 'diplomacy'} size={16} className="icon" />
                {t.charAt(0).toUpperCase() + t.slice(1)}
                <kbd className="hotkey-hint">{i + 1}</kbd>
              </div>
            ))}
          </div>
          <div className="panel-body">
            {tab === 'system' && <SystemPanel state={state} onUpdate={onUpdate} animationsEnabled={uiSettings.animationsEnabled} />}
            {tab === 'empire' && <EmpirePanel state={state} onUpdate={onUpdate} />}
            {tab === 'research' && <ResearchPanel state={state} onUpdate={onUpdate} />}
            {tab === 'diplomacy' && <DiplomacyPanel state={state} onUpdate={onUpdate} />}
          </div>
          <EventLog events={state.events} activeEventChains={state.activeEventChains} />
        </div>
      </div>

      <TurnNotifications events={state.events} turn={state.turn} />

      {turnSummary && (
        <TurnSummaryModal
          summary={turnSummary}
          resourceDeltas={resourceDeltas}
          onClose={() => setTurnSummary(null)}
        />
      )}

      {paused && !showSettings && (
        <PauseMenuOverlay
          onResume={() => setPaused(false)}
          onSave={() => { handleSave(); setPaused(false); }}
          onSettings={() => { setPaused(false); setShowSettings(true); }}
          onMenu={onMenu}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={uiSettings}
          onChange={s => { onUISettingsChange(s); saveUISettings(s); }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showHotkeys && <KeyboardShortcutsOverlay onClose={() => setShowHotkeys(false)} />}

      {state.precursorLorePending && (
        <PrecursorLoreModal
          lore={state.precursorLorePending}
          onClose={() => onUpdate({ ...state, precursorLorePending: null })}
        />
      )}

      {(() => {
        const pending = getPendingDecisionsForEmpire(state, state.playerEmpireId);
        const decision = pending[0];
        if (!decision) return null;
        return (
          <div className="overlay decision-overlay">
            <div className="overlay-content decision-modal" onClick={e => e.stopPropagation()}>
              <h2>{decision.title}</h2>
              <p style={{ marginBottom: 16, color: 'var(--text-dim)' }}>{decision.description}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 12 }}>
                Expires turn {decision.expiresTurn}
              </p>
              <div className="action-buttons" style={{ flexDirection: 'column', gap: 8 }}>
                {decision.choices.map(choice => (
                  <button
                    key={choice.id}
                    className="btn btn-primary"
                    onClick={() => {
                      const newState = cloneGameState(state);
                      if (resolveDecisionAction(newState, decision.id, choice.id)) {
                        onUpdate(newState);
                      }
                    }}
                  >
                    {choice.label}
                    {choice.hint && <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.8 }}>{choice.hint}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {(state.phase === 'victory' || state.phase === 'defeat') && (
        <div className="overlay">
          <div className={`overlay-content ${state.phase}`}>
            <h2>{state.phase === 'victory' ? 'Victory!' : 'Defeat'}</h2>
            <p>{state.events[state.events.length - 1]?.message}</p>
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={onMenu}>Main Menu</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [uiSettings, setUISettings] = useState<UISettings>(loadUISettings);

  const handleNewGame = (seed?: number, settings?: Partial<GameSettings>, factionIndex = 0) => {
    setLoading(true);
    const faction = FACTION_DEFINITIONS[factionIndex] ?? FACTION_DEFINITIONS[0];
    const playerSetup = factionToPlayerSetup(faction);
    setTimeout(() => {
      const game = createNewGame(seed, settings, playerSetup, factionIndex);
      saveGame(game);
      setState(game);
      setLoading(false);
    }, 900);
  };

  const handleLoadSlot = (slotId: SaveSlotId): { error: string | null } => {
    const result = loadGameFromSlot(slotId);
    if (result.state) {
      setLoading(true);
      setTimeout(() => {
        setState(result.state);
        setLoading(false);
      }, 400);
      return { error: null };
    }
    return { error: result.error };
  };

  const handleImportSave = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = importSaveFromJson(reader.result as string);
      if (result.state) {
        setState(result.state);
      } else {
        alert(result.error ?? 'Failed to import save.');
      }
    };
    reader.readAsText(file);
  };

  const handleMenu = () => setState(null);

  if (loading) {
    return <LoadingScreen seed={state?.seed} />;
  }

  if (!state) {
    return (
      <NewGameSetup
        onNewGame={handleNewGame}
        onLoadSlot={handleLoadSlot}
        onImportSave={handleImportSave}
        defaultGalaxyShape={uiSettings.defaultGalaxyShape}
      />
    );
  }

  return (
    <GameScreen
      state={state}
      onUpdate={setState}
      onMenu={handleMenu}
      uiSettings={uiSettings}
      onUISettingsChange={setUISettings}
    />
  );
}