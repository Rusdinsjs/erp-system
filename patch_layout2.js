const fs = require('fs');
const file = 'web-admin/src/components/Layout/MainLayout.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `        return true;\n    });\n\n    return (\n        <div className="flex h-screen bg-background text-foreground overflow-hidden">`;

const replacementStr = `        return true;\n    });\n\n    const activeModule = filteredNavItems.find(item => {\n        if (location.pathname === item.path) return true;\n        if (item.children) {\n            return item.children.some((c: any) => location.pathname === c.path || location.pathname.startsWith(c.path + '/'));\n        }\n        return false;\n    }) || filteredNavItems[0];\n\n    const isolatedNavItems = activeModule ? [activeModule] : filteredNavItems;\n\n    return (\n        <div className="flex h-screen bg-background text-foreground overflow-hidden">`;

// Handle possible \r\n vs \n
let contentLF = content.replace(/\r\n/g, '\n');
if (contentLF.includes(targetStr)) {
    contentLF = contentLF.replace(targetStr, replacementStr);
    fs.writeFileSync(file, contentLF);
    console.log('MainLayout patched successfully phase 2.');
} else {
    console.log('Target string not found!');
}
