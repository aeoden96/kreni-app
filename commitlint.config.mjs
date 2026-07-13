export default {
  extends: ['@commitlint/config-conventional'],
  ignores: [(commit) => /\[FORCE\]/.test(commit)],
};
