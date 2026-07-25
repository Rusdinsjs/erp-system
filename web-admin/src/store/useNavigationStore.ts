// Navigation Store — Manages active Launchpad module context
// Persisted to sessionStorage so context survives page refreshes but resets on new session.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
    type LaunchpadConfig,
    type LaunchpadModuleConfig,
    DEFAULT_LAUNCHPAD_CONFIG,
    getMenuIdsForModule,
    getAllMenuIds,
    findModuleForMenu,
    type MenuId,
} from '../config/launchpadConfig';

interface NavigationState {
    // Active module context (set when clicking a Launchpad card)
    activeModule: string | null;

    // Launchpad configuration (loaded from backend, falls back to default)
    launchpadConfig: LaunchpadConfig;
    configLoaded: boolean;

    // Actions
    setActiveModule: (moduleId: string | null) => void;
    setLaunchpadConfig: (config: LaunchpadConfig) => void;

    // Derived helpers
    getActiveModuleConfig: () => LaunchpadModuleConfig | undefined;
    getVisibleMenuIds: () => MenuId[];
    findModuleForMenuId: (menuId: MenuId) => LaunchpadModuleConfig | undefined;
}

export const useNavigationStore = create<NavigationState>()(
    persist(
        (set, get) => ({
            activeModule: null,
            launchpadConfig: DEFAULT_LAUNCHPAD_CONFIG,
            configLoaded: false,

            setActiveModule: (moduleId) => {
                set({ activeModule: moduleId });
            },

            setLaunchpadConfig: (config) => {
                set({ launchpadConfig: config, configLoaded: true });
            },

            getActiveModuleConfig: () => {
                const { activeModule, launchpadConfig } = get();
                if (!activeModule) return undefined;
                return launchpadConfig.modules.find(m => m.id === activeModule);
            },

            getVisibleMenuIds: () => {
                const { activeModule, launchpadConfig } = get();
                if (!activeModule) {
                    // No module selected → show all menus (fallback)
                    return getAllMenuIds(launchpadConfig);
                }
                return getMenuIdsForModule(launchpadConfig, activeModule);
            },

            findModuleForMenuId: (menuId) => {
                const { launchpadConfig } = get();
                return findModuleForMenu(launchpadConfig, menuId);
            },
        }),
        {
            name: 'navigation-storage',
            storage: createJSONStorage(() => sessionStorage),
            // Only persist activeModule, not the full config (that comes from backend)
            partialize: (state) => ({
                activeModule: state.activeModule,
            }),
        }
    )
);
