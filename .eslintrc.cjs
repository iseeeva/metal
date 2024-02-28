module.exports = {
  extends: '@antfu',
  rules: {
    'no-console': 'off',
    'max-statements-per-line': ['error', { max: 5 }],
    'spaced-comment': ['error', 'always', {
      line: {
        markers: ['#region', '#endregion', 'region', 'endregion'],
      },
    }],
  },
}
