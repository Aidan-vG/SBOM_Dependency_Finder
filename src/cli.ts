import { Command } from 'commander';
import { parseSbomFile, SbomParseError } from './sbom/parser.js';
import { buildGraph, searchComponents, traceToRoot } from './sbom/graph.js';
import { formatTraceResult, formatTraceResultJson, formatSearchResults, formatError } from './output/formatter.js';

const program = new Command();

program
  .name('sbom-finder')
  .description('Trace vulnerable JAR dependencies to their parent Mendix Marketplace widgets/modules')
  .version('0.1.0');

program
  .command('trace')
  .description('Trace a dependency to its parent marketplace module')
  .argument('<sbom-file>', 'Path to the CycloneDX JSON SBOM file')
  .argument('<dependency-name>', 'Name of the JAR dependency to trace')
  .option('--no-ai', 'Skip AI agent, use direct graph traversal only')
  .option('--json', 'Output results as JSON instead of formatted tree')
  .option('--verbose', 'Show detailed reasoning and tool calls')
  .option('--model <id>', 'Bedrock model ID', 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0')
  .option('--region <region>', 'AWS region', process.env.AWS_REGION || 'eu-central-1')
  .option('--profile <name>', 'AWS profile', process.env.AWS_PROFILE || 'aidan-sandbox')
  .action(async (sbomFile: string, dependencyName: string, options) => {
    try {
      // Parse SBOM
      console.log(`\nParsing SBOM: ${sbomFile}...`);
      const document = parseSbomFile(sbomFile);
      console.log(`✓ Parsed SBOM with ${document.components.length} components and ${document.dependencies.length} dependency relationships\n`);

      // Build graph
      const graph = buildGraph(document);
      console.log(`✓ Built dependency graph with ${graph.rootComponents.length} root component(s)\n`);

      if (options.ai) {
        console.log('AI agent mode is not yet implemented. Using direct graph traversal (--no-ai mode).\n');
      }

      // Search for the dependency
      console.log(`Searching for dependency: "${dependencyName}"...`);
      const searchResults = searchComponents(graph, dependencyName, { limit: 10 });

      if (searchResults.length === 0) {
        console.log(formatError(new Error(`No components found matching "${dependencyName}"`)));
        console.log('Try variations like:');
        console.log(`  - Without version: "${dependencyName.replace(/-\d+\.\d+.*$/, '')}"`);
        console.log(`  - Without .jar extension: "${dependencyName.replace(/\.jar$/, '')}"`);
        console.log(`  - Just the artifact name: "${dependencyName.split('/').pop()?.split('-')[0]}"`);
        process.exit(1);
      }

      console.log(`✓ Found ${searchResults.length} matching component(s)\n`);

      // Use the best match (highest score)
      const bestMatch = searchResults[0];
      console.log(`Using best match: ${bestMatch.name}${bestMatch.version ? ' v' + bestMatch.version : ''}`);

      if (searchResults.length > 1) {
        console.log(`\nOther matches found:`);
        searchResults.slice(1, 5).forEach((result, index) => {
          console.log(`  ${index + 2}. ${result.name}${result.version ? ' v' + result.version : ''}`);
        });
        console.log('');
      }

      // Trace to root
      console.log(`Tracing dependency chain...`);
      const traceResult = traceToRoot(graph, bestMatch.bomRef);

      // Generate summary
      if (traceResult.paths.length > 0) {
        const completePaths = traceResult.paths.filter(p => p.isComplete);
        if (completePaths.length > 0) {
          const rootComponents = completePaths.map(p => {
            const root = p.components[p.components.length - 1];
            return root.name + (root.version ? ' v' + root.version : '');
          });
          const uniqueRoots = [...new Set(rootComponents)];

          if (completePaths[0].components.length === 1) {
            traceResult.summary = `The dependency "${bestMatch.name}" is a root marketplace module itself. It is not brought in by any other component.`;
          } else if (completePaths[0].components.length === 2) {
            traceResult.summary = `The dependency "${bestMatch.name}" is a direct dependency of the marketplace module "${uniqueRoots[0]}".`;
          } else {
            const depth = completePaths[0].components.length - 2;
            traceResult.summary = `The dependency "${bestMatch.name}" is a transitive dependency (depth: ${depth}) brought in through the marketplace module${uniqueRoots.length === 1 ? '' : 's'}: ${uniqueRoots.join(', ')}.`;
          }
        } else {
          traceResult.summary = `The dependency "${bestMatch.name}" exists in the SBOM but has no clear path to a marketplace module. It may be a direct runtime dependency.`;
        }
      }

      // Format output
      if (options.json) {
        console.log(formatTraceResultJson(traceResult));
      } else {
        console.log(formatTraceResult(traceResult, { verbose: options.verbose }));
      }

    } catch (error) {
      if (error instanceof SbomParseError) {
        console.error(formatError(error));
        process.exit(1);
      }
      throw error;
    }
  });

program
  .command('search')
  .description('Search for components in an SBOM')
  .argument('<sbom-file>', 'Path to the CycloneDX JSON SBOM file')
  .argument('<query>', 'Search query (component name)')
  .option('--type <type>', 'Filter by component type (framework, library, all)', 'all')
  .option('--limit <n>', 'Maximum number of results', '15')
  .action(async (sbomFile: string, query: string, options) => {
    try {
      // Parse SBOM
      console.log(`\nParsing SBOM: ${sbomFile}...`);
      const document = parseSbomFile(sbomFile);
      console.log(`✓ Parsed SBOM with ${document.components.length} components\n`);

      // Build graph
      const graph = buildGraph(document);

      // Search
      const typeFilter = options.type === 'all' ? undefined : options.type;
      const results = searchComponents(graph, query, {
        typeFilter: typeFilter as any,
        limit: parseInt(options.limit, 10),
      });

      console.log(formatSearchResults(results));

    } catch (error) {
      if (error instanceof SbomParseError) {
        console.error(formatError(error));
        process.exit(1);
      }
      throw error;
    }
  });

program
  .command('info')
  .description('Show SBOM summary information')
  .argument('<sbom-file>', 'Path to the CycloneDX JSON SBOM file')
  .action(async (sbomFile: string) => {
    try {
      // Parse SBOM
      const document = parseSbomFile(sbomFile);
      const graph = buildGraph(document);

      console.log('\n=== SBOM Information ===\n');
      console.log(`Format: ${document.bomFormat} ${document.specVersion}`);
      console.log(`Serial Number: ${document.serialNumber}`);
      console.log(`Total Components: ${document.components.length}`);
      console.log(`Total Dependencies: ${document.dependencies.length}`);
      console.log(`Root Components: ${graph.rootComponents.length}`);

      // Count by type
      const typeCount = new Map<string, number>();
      for (const component of document.components) {
        typeCount.set(component.type, (typeCount.get(component.type) || 0) + 1);
      }

      console.log('\nComponents by Type:');
      for (const [type, count] of typeCount) {
        console.log(`  ${type}: ${count}`);
      }

      console.log('\nRoot Marketplace Modules:');
      graph.rootComponents.forEach(component => {
        console.log(`  - ${component.name}${component.version ? ' v' + component.version : ''}`);
      });

      console.log('');

    } catch (error) {
      if (error instanceof SbomParseError) {
        console.error(formatError(error));
        process.exit(1);
      }
      throw error;
    }
  });

export { program };
