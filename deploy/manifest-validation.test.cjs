const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the exact validator embedded in the deployment script, without
// starting PM2 or changing any server files.
const script = fs.readFileSync(path.join(__dirname, 'deploy-artifact.sh'), 'utf8');
const match = script.match(/node - "\$stage\/release\.json" "\$commit" "\$run_id" "\$attempt" <<'NODE'\n([\s\S]*?)\nNODE/);
assert(match, 'The embedded deployment manifest validator must be present');
const commit = 'a'.repeat(40);
const manifest = {
  schema: 1,
  repository: 'yazart/codelab',
  commit,
  runId: '123456',
  runAttempt: '1',
  nodeVersion: 'v22.23.2',
};
const validate = (input, deployAttempt = '2', expectedCommit = commit, expectedRunId = '123456') =>
  vm.runInNewContext(match[1], {
    require: name => {
      assert.equal(name, 'node:fs');
      return { readFileSync: () => JSON.stringify(input) };
    },
    process: { argv: [process.execPath, '-', 'release.json', expectedCommit, expectedRunId, deployAttempt] },
  });

assert.doesNotThrow(() => validate(manifest, '2')); // Rerun deployment of build attempt 1.
assert.throws(() => validate({ ...manifest, runAttempt: '2' }, '1'), /metadata/);
assert.throws(() => validate(manifest, '2', 'b'.repeat(40)), /metadata/);
assert.throws(() => validate(manifest, '2', commit, '123457'), /metadata/);
assert.throws(() => validate({ ...manifest, runAttempt: '0' }), /metadata/);
assert.throws(() => validate({ ...manifest, runAttempt: '9007199254740993' }, '9007199254740992'), /metadata/);
console.log('Deployment manifest rerun validation passed');
