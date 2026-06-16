import creditsIcon from '../../assets/icons/resources/credits.svg';
import foodIcon from '../../assets/icons/resources/food.svg';
import industryIcon from '../../assets/icons/resources/industry.svg';
import scienceIcon from '../../assets/icons/resources/science.svg';
import influenceIcon from '../../assets/icons/resources/influence.svg';
import titaniumIcon from '../../assets/icons/resources/titanium.svg';
import antimatterIcon from '../../assets/icons/resources/antimatter.svg';
import darkmatterIcon from '../../assets/icons/resources/darkmatter.svg';
import scoutIcon from '../../assets/icons/ships/scout.svg';
import frigateIcon from '../../assets/icons/ships/frigate.svg';
import cruiserIcon from '../../assets/icons/ships/cruiser.svg';
import destroyerIcon from '../../assets/icons/ships/destroyer.svg';
import carrierIcon from '../../assets/icons/ships/carrier.svg';
import colonyIcon from '../../assets/icons/ships/colony.svg';
import dreadnoughtIcon from '../../assets/icons/ships/dreadnought.svg';
import terranIcon from '../../assets/icons/planets/terran.svg';
import desertIcon from '../../assets/icons/planets/desert.svg';
import oceanIcon from '../../assets/icons/planets/ocean.svg';
import iceIcon from '../../assets/icons/planets/ice.svg';
import volcanicIcon from '../../assets/icons/planets/volcanic.svg';
import gasIcon from '../../assets/icons/planets/gas.svg';
import toxicIcon from '../../assets/icons/planets/toxic.svg';
import barrenIcon from '../../assets/icons/planets/barren.svg';
import artificialIcon from '../../assets/icons/planets/artificial.svg';
import fleetIcon from '../../assets/icons/ui/fleet.svg';
import researchIcon from '../../assets/icons/ui/research.svg';
import diplomacyIcon from '../../assets/icons/ui/diplomacy.svg';
import combatIcon from '../../assets/icons/ui/combat.svg';
import anomalyIcon from '../../assets/icons/ui/anomaly.svg';
import stancePassiveIcon from '../../assets/icons/ui/stance-passive.svg';
import stanceAggressiveIcon from '../../assets/icons/ui/stance-aggressive.svg';
import emblemTerranIcon from '../../assets/icons/factions/emblem-terran.svg';
import emblemCrimsonIcon from '../../assets/icons/factions/emblem-crimson.svg';
import emblemVerdantIcon from '../../assets/icons/factions/emblem-verdant.svg';
import emblemSolarIcon from '../../assets/icons/factions/emblem-solar.svg';
import emblemVoidIcon from '../../assets/icons/factions/emblem-void.svg';

export const ICONS = {
  credits: creditsIcon,
  food: foodIcon,
  industry: industryIcon,
  science: scienceIcon,
  influence: influenceIcon,
  titanium: titaniumIcon,
  antimatter: antimatterIcon,
  darkmatter: darkmatterIcon,
  scout: scoutIcon,
  frigate: frigateIcon,
  cruiser: cruiserIcon,
  destroyer: destroyerIcon,
  carrier: carrierIcon,
  colony: colonyIcon,
  dreadnought: dreadnoughtIcon,
  terran: terranIcon,
  desert: desertIcon,
  ocean: oceanIcon,
  ice: iceIcon,
  volcanic: volcanicIcon,
  gas: gasIcon,
  toxic: toxicIcon,
  barren: barrenIcon,
  artificial: artificialIcon,
  fleet: fleetIcon,
  research: researchIcon,
  diplomacy: diplomacyIcon,
  combat: combatIcon,
  anomaly: anomalyIcon,
  'stance-passive': stancePassiveIcon,
  'stance-aggressive': stanceAggressiveIcon,
  'emblem-terran': emblemTerranIcon,
  'emblem-crimson': emblemCrimsonIcon,
  'emblem-verdant': emblemVerdantIcon,
  'emblem-solar': emblemSolarIcon,
  'emblem-void': emblemVoidIcon,
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 20, className = '', title, style }: IconProps) {
  const src = ICONS[name];
  return (
    <img
      src={src}
      alt={title ?? name}
      title={title}
      className={`icon ${className}`}
      width={size}
      height={size}
      draggable={false}
      style={style}
    />
  );
}

export function getPlanetIconName(type: string): IconName {
  const map: Record<string, IconName> = {
    terran: 'terran',
    desert: 'desert',
    ocean: 'ocean',
    ice: 'ice',
    volcanic: 'volcanic',
    gas: 'gas',
    toxic: 'toxic',
    barren: 'barren',
    artificial: 'artificial',
  };
  return map[type] ?? 'barren';
}

export function getShipIconName(type: string): IconName {
  const map: Record<string, IconName> = {
    scout: 'scout',
    frigate: 'frigate',
    cruiser: 'cruiser',
    colony: 'colony',
    destroyer: 'destroyer',
    carrier: 'carrier',
    dreadnought: 'dreadnought',
  };
  return map[type] ?? 'scout';
}

export function getEmblemIconName(emblem: string): IconName {
  const key = `emblem-${emblem}` as IconName;
  return ICONS[key] ? key : 'emblem-terran';
}

export function getStanceIconName(stance: string): IconName {
  return stance === 'aggressive' ? 'stance-aggressive' : 'stance-passive';
}

export function getRareResourceIconName(resource: string): IconName | null {
  if (resource === 'titanium' || resource === 'antimatter' || resource === 'darkmatter') {
    return resource;
  }
  return null;
}