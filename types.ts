
export enum TreeCondition {
  HEALTHY = 'Gesund',
  NEEDS_CARE = 'Pflegebedürftig',
  CRITICAL = 'Kritisch'
}

export interface Tree {
  id: string;
  user_id?: string;
  variety: string;
  meadowId: string;
  plantingDate: string;
  condition: TreeCondition;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  imageUrl?: string;
  description?: string;
}

export interface Meadow {
  id: string;
  user_id?: string;
  name: string;
  area: number; // in hectares
  description: string;
  icon: string; // Material symbol name
  lastChecked: string;
  location: {
    lat: number;
    lng: number;
  };
}

export type ViewMode = 'map' | 'list' | 'tree-form' | 'tree-details' | 'meadow-form';
