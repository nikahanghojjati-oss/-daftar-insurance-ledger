export function assertReadyRules(rules,candidate) {
  if(rules.includes('SETUP_BLOCKED') || !rules.includes('request.auth.uid') || !rules.includes("rules_version = '2'") || rules!==candidate)
    throw Error('Rules publication is blocked until the exact reviewed UID-scoped rules are selected.');
}
