const { withPodfile } = require("@expo/config-plugins");

const MIN_VERSION = "15.1";
const MARKER = "# withIosMinDeploymentTarget";

// react_native_post_install only bumps IPHONEOS_DEPLOYMENT_TARGET on "real"
// pod targets, not resource-bundle sub-targets (e.g. RNSVGFilters,
// RNCAsyncStorage_resources, ReactNativeMapsPrivacy). Those keep whatever
// floor their own podspec declares (often well under 15.0), which Xcode 27
// rejects outright. Force every target in the Pods project after RN's hook
// runs, so this survives `expo prebuild` (including on EAS build servers).
function withIosMinDeploymentTarget(config) {
  return withPodfile(config, (config) => {
    const { contents } = config.modResults;
    if (contents.includes(MARKER)) {
      return config;
    }

    const anchor =
      ":ccache_enabled => ccache_enabled?(podfile_properties),\n    )";
    const anchorIndex = contents.indexOf(anchor);
    if (anchorIndex === -1) {
      throw new Error(
        "withIosMinDeploymentTarget: could not find react_native_post_install(...) call in Podfile to patch."
      );
    }

    const insertAt = anchorIndex + anchor.length;
    const injection = `\n\n    ${MARKER}\n    installer.pods_project.targets.each do |target|\n      target.build_configurations.each do |build_config|\n        if build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < ${MIN_VERSION}\n          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_VERSION}'\n        end\n      end\n    end`;

    config.modResults.contents =
      contents.slice(0, insertAt) + injection + contents.slice(insertAt);

    return config;
  });
}

module.exports = withIosMinDeploymentTarget;
