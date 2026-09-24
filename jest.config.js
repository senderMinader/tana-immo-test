/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",

  // Fichiers de test
  testMatch: [
    "**/*.test.js",
    "**/*.spec.js",
  ],

  // Affichage plus lisible
  verbose: true,

  // Nettoyage automatique des mocks entre les tests
  clearMocks: true,

  // Détecte les handles qui empêchent Jest de terminer
  detectOpenHandles: true,
};

