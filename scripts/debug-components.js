/**
 * Debug script to check if Figma file has a components section
 */

import { createFigmaClient } from '../src/engine/figma/client.js';
import { loadConfig } from '../src/engine/config/index.js';

async function debugComponents() {
  try {
    console.log('🔍 Loading configuration...');
    const config = await loadConfig({ configPath: 'figma.sprite.config.json' });

    console.log('\n🌐 Fetching from Figma API...');
    const token = process.env.FIGMA_TOKEN;
    if (!token) {
      throw new Error('FIGMA_TOKEN environment variable not set');
    }

    const client = createFigmaClient(token);
    const fileData = await client.getFile(config.figma.fileKey);

    console.log(`\n✅ File fetched: ${fileData.name}`);

    // Check if file has components section
    if (fileData.components) {
      console.log('\n📦 Components found in file:');
      const components = Object.entries(fileData.components);
      console.log(`  Total: ${components.length}`);

      // Filter by ic/ prefix
      const iconComponents = components.filter(([id, comp]) =>
        comp.name.startsWith(config.figma.scope.value)
      );

      console.log(`  Matching "ic/": ${iconComponents.length}`);

      if (iconComponents.length > 0 && iconComponents.length <= 20) {
        console.log('\n  Icon components:');
        iconComponents.forEach(([id, comp]) => {
          console.log(`    • ${comp.name} (id: ${id})`);
        });
      }
    } else {
      console.log('\n❌ No components section in file');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.context) {
      console.error('Context:', error.context);
    }
  }
}

debugComponents();
