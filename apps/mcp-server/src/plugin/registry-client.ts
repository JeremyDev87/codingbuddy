/**
 * Registry Client
 *
 * Fetches and caches the plugin registry index from GitHub.
 * Provides search functionality against plugin metadata.
 */

const REGISTRY_URL =
  'https://raw.githubusercontent.com/JeremyDev87/codingbuddy-registry/main/index.json';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Types
// ============================================================================

export interface RegistryPluginProvides {
  agents?: string[];
  rules?: string[];
  skills?: string[];
  checklists?: string[];
}

export interface RegistryPlugin {
  name: string;
  version: string;
  description: string;
  source: string;
  tags: string[];
  provides: RegistryPluginProvides;
}

export interface RegistryIndex {
  plugins: RegistryPlugin[];
}

// ============================================================================
// Client
// ============================================================================

export class RegistryClient {
  private cache: RegistryIndex | null = null;
  private cacheTime = 0;

  async fetchIndex(): Promise<RegistryIndex> {
    if (this.cache && Date.now() - this.cacheTime < CACHE_TTL_MS) {
      return this.cache;
    }

    try {
      const response = await fetch(REGISTRY_URL);
      if (!response.ok) {
        return { plugins: [] };
      }
      const data = (await response.json()) as RegistryIndex;
      this.cache = data;
      this.cacheTime = Date.now();
      return data;
    } catch {
      return { plugins: [] };
    }
  }

  async findByName(name: string): Promise<RegistryPlugin | undefined> {
    const index = await this.fetchIndex();
    return index.plugins.find(plugin => plugin.name === name);
  }

  async search(query: string): Promise<RegistryPlugin[]> {
    const index = await this.fetchIndex();
    const lowerQuery = query.toLowerCase();

    return index.plugins.filter(plugin => {
      const nameMatch = plugin.name.toLowerCase().includes(lowerQuery);
      const descMatch = plugin.description.toLowerCase().includes(lowerQuery);
      const tagMatch = plugin.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
      return nameMatch || descMatch || tagMatch;
    });
  }
}
