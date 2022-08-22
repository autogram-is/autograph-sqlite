# Autogram Node Boilerplate 
Just a simple starter template for a node project that's likely to be reused.

# What it includes

- Typesript 4.7
  - experimentalDecorators on
  - esModuleInterop on
- ES2020 module target
- Code in `/source`, tests in `/tests`, compiled code in `/dist`
- ava for ESM-friendly tests
- xo + prettifier with a handful of tweaked rules
  - Bracket spacing
  - Two spaces, not tabs
- Test and linter setup in package.json
- vscode extension recommendations for JSDoc, xo integration, and git-graph
- shx and npm-run-all for tidier cross-platform scripts
- An extremely agressive `nuke` script that clears package.json, node_modules, and build before reinstalling and rebuilding everything.

Almost certain to be updated over time; earlier versions used GTS but it was a bit too all-encompassing.

## Future Plans
This setup is meant for node projects, but hopefully baking ESM in will allow easier expansion to browser-friendly libraries when we have a chance.