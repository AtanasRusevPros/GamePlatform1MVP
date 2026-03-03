export interface GameRoute {
  path: string;
}

export interface GameModule {
  id: string;
  title: string;
  icon?: string;
  routes: GameRoute[];
  requiresAuth: boolean;
}

export interface GameRegistry {
  list(): readonly GameModule[];
  getById(id: string): GameModule | undefined;
}

export function createGameRegistry(modules: GameModule[]): GameRegistry {
  const byId = new Map<string, GameModule>();

  for (const module of modules) {
    if (byId.has(module.id)) {
      throw new Error(`Duplicate game module id: ${module.id}`);
    }

    byId.set(module.id, module);
  }

  const orderedModules = [...byId.values()].sort((left, right) => left.title.localeCompare(right.title));

  return {
    list: () => orderedModules,
    getById: (id) => byId.get(id)
  };
}

