const { antfu } = require('@antfu/eslint-config')

module.exports = antfu({
  rules: {
    'node/prefer-global/buffer': 'off',
    'node/prefer-global/process': 'off',
    'no-cond-assign': 'off',
    'no-console': 'off',
  },
})
