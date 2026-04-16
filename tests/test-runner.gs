/**
 * test-runner.gs — Framework minimalista de testing para Google Apps Script
 *
 * Uso:
 *   runAllTests()  — ejecuta todos los test suites registrados
 *
 * En Apps Script no hay npm ni jest, así que usamos console.log para reportar.
 */

const TestRunner = {
  _suites: [],
  _passed: 0,
  _failed: 0,

  /**
   * Registra un test suite.
   * @param {string} name
   * @param {Function} fn
   */
  suite(name, fn) {
    this._suites.push({ name, fn });
  },

  /**
   * Ejecuta todos los suites registrados.
   */
  run() {
    this._passed = 0;
    this._failed = 0;
    console.log('=== TEST RUN START ===');

    for (const suite of this._suites) {
      console.log(`\n--- Suite: ${suite.name} ---`);
      try {
        suite.fn(this._makeContext());
      } catch (e) {
        console.log(`  [SUITE ERROR] ${suite.name}: ${e.message}`);
        this._failed++;
      }
    }

    console.log(`\n=== RESULTS: ${this._passed} passed, ${this._failed} failed ===`);
    return this._failed === 0;
  },

  _makeContext() {
    const runner = this;
    return {
      /**
       * @param {string} description
       * @param {Function} fn
       */
      test(description, fn) {
        try {
          fn();
          console.log(`  ✓ ${description}`);
          runner._passed++;
        } catch (e) {
          console.log(`  ✗ ${description}: ${e.message}`);
          runner._failed++;
        }
      },

      assert: {
        equal(actual, expected, msg) {
          if (actual !== expected) {
            throw new Error(
              `${msg || 'assert.equal'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
            );
          }
        },
        deepEqual(actual, expected, msg) {
          const a = JSON.stringify(actual);
          const e = JSON.stringify(expected);
          if (a !== e) {
            throw new Error(
              `${msg || 'assert.deepEqual'}: expected ${e}, got ${a}`
            );
          }
        },
        isNull(actual, msg) {
          if (actual !== null) {
            throw new Error(
              `${msg || 'assert.isNull'}: expected null, got ${JSON.stringify(actual)}`
            );
          }
        },
        isNotNull(actual, msg) {
          if (actual === null || actual === undefined) {
            throw new Error(
              `${msg || 'assert.isNotNull'}: expected non-null, got ${JSON.stringify(actual)}`
            );
          }
        },
        isTrue(actual, msg) {
          if (actual !== true) {
            throw new Error(`${msg || 'assert.isTrue'}: expected true, got ${JSON.stringify(actual)}`);
          }
        },
        isFalse(actual, msg) {
          if (actual !== false) {
            throw new Error(`${msg || 'assert.isFalse'}: expected false, got ${JSON.stringify(actual)}`);
          }
        },
        closeTo(actual, expected, delta, msg) {
          if (Math.abs(actual - expected) > delta) {
            throw new Error(
              `${msg || 'assert.closeTo'}: expected ${expected} ±${delta}, got ${actual}`
            );
          }
        }
      }
    };
  }
};

/**
 * Función principal que ejecuta todos los tests.
 * Registrar en Apps Script como función ejecutable.
 */
function runAllTests() {
  // Los suites se registran en sus propios archivos al cargar
  return TestRunner.run();
}
