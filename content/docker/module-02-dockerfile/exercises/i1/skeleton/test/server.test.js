const test = require('node:test')
const assert = require('node:assert')

test('le module dayjs se charge', () => {
  assert.ok(require('dayjs')().isValid())
})
