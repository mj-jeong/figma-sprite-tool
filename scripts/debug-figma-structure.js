/**
 * Debug script to inspect Figma file structure
 * Helps identify correct page names and icon naming patterns
 */

import { createFigmaClient } from '../src/engine/figma/client.js';
import { loadConfig } from '../src/engine/config/index.js';

async function debugFigmaStructure() {
  try {
    console.log('🔍 Loading configuration...');
    const config = await loadConfig({ configPath: 'figma.sprite.config.json' });

    console.log('\n📋 Configuration:');
    console.log(`  File Key: ${config.figma.fileKey}`);
    console.log(`  Target Page: ${config.figma.page}`);
    console.log(`  Scope: ${config.figma.scope.type} = "${config.figma.scope.value}"`);

    console.log('\n🌐 Fetching from Figma API...');
    const token = process.env.FIGMA_TOKEN;
    if (!token) {
      throw new Error('FIGMA_TOKEN environment variable not set');
    }

    const client = createFigmaClient(token);
    const fileData = await client.getFile(config.figma.fileKey);

    console.log(`\n✅ File fetched: ${fileData.name}`);
    console.log(`  Last modified: ${fileData.lastModified}`);

    // List all pages
    console.log('\n📄 Available Pages:');
    if (fileData.document.children) {
      fileData.document.children.forEach((page, i) => {
        console.log(`  ${i + 1}. "${page.name}" (type: ${page.type})`);
      });
    }

    // Find target page
    console.log(`\n🎯 Analyzing target page: "${config.figma.page}"`);
    const targetPage = fileData.document.children?.find(
      (child) => child.name === config.figma.page
    );

    if (!targetPage) {
      console.log('  ❌ Page not found!');
      console.log('\n💡 Suggestion: Update config.figma.page to one of the available pages above');
      return;
    }

    console.log(`  ✅ Page found (type: ${targetPage.type})`);

    // Analyze nodes in the page
    console.log('\n🔎 Scanning for FRAME/COMPONENT nodes...');
    const nodes = [];

    function traverse(node, depth = 0) {
      // Check ALL node types, not just FRAME/COMPONENT
      const relevantTypes = ['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE'];
      const isRelevant = relevantTypes.includes(node.type);

      if (isRelevant) {
        const indent = '  '.repeat(depth);
        const hasBox = node.absoluteBoundingBox ? '✓' : '✗';
        const visible = node.visible !== false ? '👁️' : '🚫';
        const prefix = node.name.startsWith(config.figma.scope.value) ? '✅' : '❌';

        // For INSTANCE nodes, show componentId
        const componentInfo = node.type === 'INSTANCE' && node.componentId
          ? ` → componentId: ${node.componentId}`
          : '';

        nodes.push({
          name: node.name,
          type: node.type,
          id: node.id,
          componentId: node.componentId,
          visible: node.visible !== false,
          hasBox: !!node.absoluteBoundingBox,
          matchesPrefix: node.name.startsWith(config.figma.scope.value),
        });

        console.log(
          `${indent}${prefix} ${visible} ${hasBox} [${node.type}] "${node.name}" (id: ${node.id}${componentInfo})`
        );
      }

      if (node.children) {
        node.children.forEach((child) => traverse(child, depth + 1));
      }
    }

    traverse(targetPage, 0);

    // Summary
    console.log('\n📊 Summary:');
    console.log(`  Total nodes found: ${nodes.length}`);

    // Count by type
    const typeCount = {};
    nodes.forEach(n => {
      typeCount[n.type] = (typeCount[n.type] || 0) + 1;
    });
    console.log('  By type:');
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`    - ${type}: ${count}`);
    });

    const matching = nodes.filter((n) => n.matchesPrefix && n.visible && n.hasBox);
    console.log(`\n  Matching filter criteria: ${matching.length}`);

    const notMatching = nodes.filter((n) => !n.matchesPrefix);
    console.log(`  Not matching prefix "${config.figma.scope.value}": ${notMatching.length}`);

    if (notMatching.length > 0 && notMatching.length <= 10) {
      console.log('\n❌ Non-matching node names:');
      notMatching.forEach((n) => {
        console.log(`  - "${n.name}"`);
      });
    }

    // Suggest prefix
    if (matching.length === 0 && nodes.length > 0) {
      console.log('\n💡 Suggestions:');

      // Find common prefixes
      const prefixes = new Map();
      nodes.forEach((n) => {
        const parts = n.name.split(/[-_/]/);
        if (parts.length > 0) {
          const prefix = parts[0];
          prefixes.set(prefix, (prefixes.get(prefix) || 0) + 1);
        }
      });

      const sortedPrefixes = Array.from(prefixes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      console.log('  Common prefixes found:');
      sortedPrefixes.forEach(([prefix, count]) => {
        console.log(`  - "${prefix}" (${count} nodes)`);
      });

      if (sortedPrefixes.length > 0) {
        const topPrefix = sortedPrefixes[0][0];
        console.log(`\n  Try setting scope.value to: "${topPrefix}/"`);
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.context) {
      console.error('Context:', error.context);
    }
  }
}

debugFigmaStructure();
