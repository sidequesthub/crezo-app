const { withInfoPlist } = require('expo/config-plugins');

/**
 * Crezo never opens the camera, records audio or saves to Photos, but
 * expo-image-picker and expo-media-library add those purpose strings with
 * generic text ("Allow Crezo to access your camera"). App Review treats
 * purpose strings for unused access as a 5.1.1 issue, so strip them.
 * The dev launcher's local-network string only matters in development builds.
 * If a feature ever needs one of these, delete it here and write a real
 * purpose string in app.json.
 */
const UNUSED = [
  'NSCameraUsageDescription',
  'NSMicrophoneUsageDescription',
  'NSPhotoLibraryAddUsageDescription',
];

module.exports = function withoutUnusedPermissions(config) {
  return withInfoPlist(config, (c) => {
    for (const key of UNUSED) delete c.modResults[key];
    if (process.env.EAS_BUILD_PROFILE === 'production') {
      delete c.modResults.NSLocalNetworkUsageDescription;
    }
    return c;
  });
};
