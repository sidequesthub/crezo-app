const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Reminders are local notifications, scheduled on the device. They need no
 * push entitlement — but expo-notifications adds `aps-environment` anyway,
 * and then the App Store provisioning profile (which has no Push capability)
 * fails to sign the build. Remove it until remote push is actually wanted;
 * at that point enable Push on the App ID and delete this plugin.
 */
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (c) => {
    delete c.modResults['aps-environment'];
    return c;
  });
};
