export type EntityCreationRequest = {
  token: number;
  position?: { x: number; y: number };
};

export type WeakEntityCreationRequest = {
  token: number;
  parent?: string;
};

export type RelationCreationRequest = {
  token: number;
  source?: string;
};

export type AttributeCreationRequest = {
  token: number;
  entity: string;
  attribute?: string;
};
