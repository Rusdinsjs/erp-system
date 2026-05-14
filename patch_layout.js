const fs = require('fs');
const file = 'web-admin/src/components/Layout/MainLayout.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add LayoutGrid to lucide-react import
content = content.replace(
    /import \{\s*LayoutDashboard,/,
    "import {\n    LayoutGrid, LayoutDashboard,"
);

// 2. Add isolated active module logic
content = content.replace(
    /return true;\n    \}\);\n\n    return \(/,
    `return true;
    });

    // Find active module for isolation
    const activeModule = filteredNavItems.find(item => {
        if (location.pathname === item.path) return true;
        if (item.children) {
            return item.children.some((c: any) => location.pathname === c.path || location.pathname.startsWith(c.path + '/'));
        }
        return false;
    }) || filteredNavItems[0];

    const isolatedNavItems = [activeModule];

    // Force active module to be open
    if (!openMenus.includes(activeModule.path)) {
        setOpenMenus([activeModule.path]);
    }

    return (`
);

// 3. Change filteredNavItems.map to isolatedNavItems.map
content = content.replace(
    /filteredNavItems\.map\(\(item: any\) => \{/,
    `isolatedNavItems.map((item: any) => {`
);

// 4. Add "Back to Launchpad" button at the top of the sidebar
content = content.replace(
    /<div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">/,
    `<div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {/* Back to Launchpad Button */}
                    <div className="mb-4 pb-4 border-b border-border/50">
                        <button
                            onClick={() => navigate('/launchpad')}
                            className={\`
                                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-primary hover:bg-primary/10 transition-colors font-medium
                                \${collapsed ? 'justify-center' : ''}
                            \`}
                            title={collapsed ? 'Launchpad' : undefined}
                        >
                            <LayoutGrid size={20} strokeWidth={1.5} className="shrink-0" />
                            <span className={\`whitespace-nowrap transition-all duration-300 \${collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}\`}>
                                App Launcher
                            </span>
                        </button>
                    </div>`
);

// 5. Also replace for mobile sidebar
content = content.replace(
    /<div className="flex-1 overflow-y-auto p-4 space-y-1">\s*\{filteredNavItems\.map\(\(item: any\) => \{/,
    `<div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {/* Back to Launchpad Button Mobile */}
                    <div className="mb-4 pb-4 border-b border-border/50">
                        <button
                            onClick={() => { navigate('/launchpad'); setMobileMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-primary hover:bg-primary/10 transition-colors font-medium"
                        >
                            <LayoutGrid size={20} />
                            <span>App Launcher</span>
                        </button>
                    </div>
                    {isolatedNavItems.map((item: any) => {`
);

fs.writeFileSync(file, content);
console.log('MainLayout patched successfully.');
