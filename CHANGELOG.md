# Changelog

All notable changes to this project will be documented in this file. See [conventional commits](https://www.conventionalcommits.org/) for commit guidelines.

---

## [unreleased]

### Bug Fixes

- **(ci)** resolve MegaLinter failures from new npm dependencies - ([2b6d697](https://github.com/pix-l-crafters/pocket-draw/commit/2b6d6975b8c761a71e5a7253bfc16f6596067057)) - tingyueh
- **(ci)** suppress known transitive uuid vulnerability in expo/xcode - ([8cc605e](https://github.com/pix-l-crafters/pocket-draw/commit/8cc605e98d4f4b4318f13fa48ac1524131e2603c)) - tingyueh
- **(ci)** check out PR head branch instead of detached merge commit - ([deffb91](https://github.com/pix-l-crafters/pocket-draw/commit/deffb91379d41a1241b9d58d372436e40f8149ca)) - tingyueh
- **(ci)** use commit mode for auto-fixes instead of opening a PR - ([472db10](https://github.com/pix-l-crafters/pocket-draw/commit/472db1095ed2080e4909c5f265dd5c98d607dac5)) - tingyueh
- **(expo)** downgrade to SDK 54 for Expo Go App Store compatibility - ([f26fdea](https://github.com/pix-l-crafters/pocket-draw/commit/f26fdea4f2bdd5d1bf1f2b4ab25325ea2506175a)) - tingyueh
- **(megalinter)** override postcss to resolve trivy vulnerability CVE-2026-73646 - ([494a47e](https://github.com/pix-l-crafters/pocket-draw/commit/494a47e8088ed3b77b194a66c7768d0bc11c51d7)) - MRDGH2821
- **(mise)** fix prepare task - ([6851544](https://github.com/pix-l-crafters/pocket-draw/commit/6851544e4a023cae61dd24fe2f26c07ea515c4a1)) - MRDGH2821
- **(prettier)** ignore lockfiles and build caches to prevent formatting conflicts - ([45c999e](https://github.com/pix-l-crafters/pocket-draw/commit/45c999e0ab5c86d50074528294869b78aff5b528)) - MRDGH2821
- downgrade to Expo SDK 54 and switch to plain Expo Go - ([79965bc](https://github.com/pix-l-crafters/pocket-draw/commit/79965bc2413b629f245804fcfda48907eaae901b)) - Mobark Walid
- update vulnerability ignore lists in .trivyignore, osv-scanner.toml, and .grype.yaml - ([cb924d5](https://github.com/pix-l-crafters/pocket-draw/commit/cb924d5a7655c97dc238241e1ac381dbcafb7d44)) - Mobark Walid
- update cspell dictionary and improve README instructions for Expo Go compatibility - ([86eba34](https://github.com/pix-l-crafters/pocket-draw/commit/86eba34ff720c9b4c6d848c54ae733c7f87da270)) - Mobark Walid
- cache Trivy vulnerability database to avoid rate limits in CI - ([35394ed](https://github.com/pix-l-crafters/pocket-draw/commit/35394ed97616c55620c53f64f64c92ddc9a3a503)) - Mobark Walid
- pin java 21 and align react-native deps for android BLE build - ([2fa9af6](https://github.com/pix-l-crafters/pocket-draw/commit/2fa9af6ce99f5936e6460eb5a3e0a07ba9b23930)) - MRDGH2821
- packages version & readme development build - ([443502c](https://github.com/pix-l-crafters/pocket-draw/commit/443502cbfb9802d45602c07ee698677dd7928e51)) - hbeat

### Documentation

- add plan - ([18edf01](https://github.com/pix-l-crafters/pocket-draw/commit/18edf010776105fb3e40009e4badb6c3eaba9a5e)) - MRDGH2821
- add Quickdraw Showdown implementation design - ([b1bc32e](https://github.com/pix-l-crafters/pocket-draw/commit/b1bc32e5975b74bd8e6a61c2da2530bbc6065375)) - MRDGH2821

### Features

- **(map)** add map screen with mock player markers - ([846eff6](https://github.com/pix-l-crafters/pocket-draw/commit/846eff6ce9ae55950e39bf2230024dddff77d097)) - Ethan
- **(map)** add foreground location and permission handling - ([44a6882](https://github.com/pix-l-crafters/pocket-draw/commit/44a688263080b8e5b0229b6be18259e2cfa483c3)) - Ethan
- init Expo React Native app - ([f09d075](https://github.com/pix-l-crafters/pocket-draw/commit/f09d0755566cf42cb72287d4ea2bd342f89e7f23)) - tingyueh
- add expo-dev-client for custom native module support - ([172817a](https://github.com/pix-l-crafters/pocket-draw/commit/172817aac1d0c982a8647b0419678323f1454c89)) - tingyueh
- set up Firebase services - ([f278c3d](https://github.com/pix-l-crafters/pocket-draw/commit/f278c3d470b1a9a027d1a7c1eacfb5bf5d881b52)) - Ethan
- improve Firebase authentication UI - ([2bb06e6](https://github.com/pix-l-crafters/pocket-draw/commit/2bb06e60b771de41e3f68c111c0a54ffb1a7004c)) - wutianze3
- publish authenticated player presence - ([6686dac](https://github.com/pix-l-crafters/pocket-draw/commit/6686dac3969cc8a89df4321fb438d7ff2c89b521)) - Ethan
- add bluetooth demo - ([0f4e241](https://github.com/pix-l-crafters/pocket-draw/commit/0f4e241cfbcbc52928202b0d96920377cc8218e7)) - hbeat
- add expo mcp & skills - ([fdfd4d1](https://github.com/pix-l-crafters/pocket-draw/commit/fdfd4d172dcac4abc7540e1bdff0974c4a2b2742)) - MRDGH2821
- add claude target - ([a194840](https://github.com/pix-l-crafters/pocket-draw/commit/a194840a320ee9bba16b26aeb712417b67fa9dd9)) - MRDGH2821
- add BLE scanner screen and view switcher - ([4b750a8](https://github.com/pix-l-crafters/pocket-draw/commit/4b750a8f0b99b4d6a26ac0007892567bc3990c10)) - MRDGH2821

### Miscellaneous Chores

- **(cocogitto)** bump app version together - ([f840db4](https://github.com/pix-l-crafters/pocket-draw/commit/f840db45c12d578af0c9d2976ded569634f32d0b)) - MRDGH2821
- **(copier)** initialise template - ([6181357](https://github.com/pix-l-crafters/pocket-draw/commit/61813576414e9fe5fd046a8790348aae2fa8f42f)) - MRDGH2821
- **(copier)** update template - ([fd797e0](https://github.com/pix-l-crafters/pocket-draw/commit/fd797e0644cd8660eda452b9a6daf3f30b1c2053)) - MRDGH2821
- **(copier)** update template - ([353f146](https://github.com/pix-l-crafters/pocket-draw/commit/353f1467fc317cc32777f020e6d86f2fa4a90105)) - MRDGH2821
- **(copier)** update template - ([da97ec7](https://github.com/pix-l-crafters/pocket-draw/commit/da97ec7db9274d8def756b8fd523beb2d45f4842)) - MRDGH2821
- **(copier)** update template - ([c6cb56c](https://github.com/pix-l-crafters/pocket-draw/commit/c6cb56ca463d31f25837e659b7f2ef23d25a4a8e)) - MRDGH2821
- **(copier)** update template - ([eb008fd](https://github.com/pix-l-crafters/pocket-draw/commit/eb008fd2b91d933a7661f41ef4e864c603ecfea6)) - MRDGH2821
- **(copier)** update template - ([11e5fde](https://github.com/pix-l-crafters/pocket-draw/commit/11e5fde2fece4a29d0524a30b747f18031370f61)) - MRDGH2821
- **(copier)** update template - ([c91b7ff](https://github.com/pix-l-crafters/pocket-draw/commit/c91b7ff3057eb7c6a2f2055c46799a6b9fc308e0)) - MRDGH2821
- **(cspell)** add words - ([83b1edd](https://github.com/pix-l-crafters/pocket-draw/commit/83b1edd9232830ef658de228f343eeb056a60526)) - MRDGH2821
- **(cspell)** update word list - ([e1a3974](https://github.com/pix-l-crafters/pocket-draw/commit/e1a39745a802d24dadbf4ccdaa4edcae89004eed)) - MRDGH2821
- **(megalinter)** apply linters fixes - ([321195f](https://github.com/pix-l-crafters/pocket-draw/commit/321195f350425b572a160356166f8d0382721caa)) - tingyueh
- **(megalinter)** apply fixes - ([f1eb994](https://github.com/pix-l-crafters/pocket-draw/commit/f1eb99435e27c86f1a00d9c05c5177dc4fc4cbc1)) - MRDGH2821
- **(treefmt)** exclude lock file from formatting - ([bb2f13d](https://github.com/pix-l-crafters/pocket-draw/commit/bb2f13dc50b459ddbde4e02d5ab756b4382e1d81)) - MRDGH2821
- migrate to node - ([35fc2b4](https://github.com/pix-l-crafters/pocket-draw/commit/35fc2b42f00ecad431e4ae4c0d1358672305383a)) - MRDGH2821
- merge remote-tracking branch 'origin/tingyue/feat/react-native-env' into dev - ([c5b747a](https://github.com/pix-l-crafters/pocket-draw/commit/c5b747a61f3f6a1b3a8696b9428471e7271011cd)) - MRDGH2821
- merge pull request #2 from pix-l-crafters/sihengma/firebase-setup - ([c41a74a](https://github.com/pix-l-crafters/pocket-draw/commit/c41a74a9072eee5ad5684f76acd89a99e9217f91)) - Mihir Rabade
- merge pull request #6 from pix-l-crafters/map - ([d7c86a1](https://github.com/pix-l-crafters/pocket-draw/commit/d7c86a1bfb22f9632c74c0a4109852676cd325f7)) - Mobark Bacran
- merge branch 'dev' into bluetooth-integration - ([2347529](https://github.com/pix-l-crafters/pocket-draw/commit/2347529988129397455f939c839ea149a59bd530)) - MRDGH2821
- update ignore list - ([1fd484e](https://github.com/pix-l-crafters/pocket-draw/commit/1fd484ee2db986cb991bcff419b91cad1a586f05)) - MRDGH2821
- add repo config - ([0b59486](https://github.com/pix-l-crafters/pocket-draw/commit/0b59486c737dcc4df3b97d327ea5958315eb1e11)) - MRDGH2821
- add apm.lock.yaml - ([3d026c4](https://github.com/pix-l-crafters/pocket-draw/commit/3d026c45c2b482f6894257fbc95c602d9c0cf528)) - MRDGH2821
- refresh apm.lock.yaml - ([a70cd2b](https://github.com/pix-l-crafters/pocket-draw/commit/a70cd2beeed28e9fc1559318efa1e1671e6667f1)) - MRDGH2821
- merge branch 'bluetooth-integration' into mihir/fix/android-ble - ([148f7c4](https://github.com/pix-l-crafters/pocket-draw/commit/148f7c423c2f22530dd4cf172745223a8bc3f61f)) - MRDGH2821
- merge remote-tracking branch 'origin/main' into tingyue/feat/react-native-env - ([25bcca2](https://github.com/pix-l-crafters/pocket-draw/commit/25bcca25649707cecd2ae2766b1e8e42961a0de0)) - tingyueh
- merge branch 'tingyue/feat/react-native-env' into mihir/fix/android-ble - ([0320ee1](https://github.com/pix-l-crafters/pocket-draw/commit/0320ee1b9e54a599bf3e2b7c8a720b245f548cb2)) - MRDGH2821
- remove duplicate keys - ([f273148](https://github.com/pix-l-crafters/pocket-draw/commit/f2731483df6e06b53f259f4f4a522b61f8a7e84f)) - MRDGH2821
- remove duplicates - ([af9e2ec](https://github.com/pix-l-crafters/pocket-draw/commit/af9e2ecc3a346e94d4014f967c2aa1f1cf0fbf63)) - MRDGH2821
- apply copilot suggestions - ([1e2b2be](https://github.com/pix-l-crafters/pocket-draw/commit/1e2b2be037b5d6ea257d2f34c5cbeb5544840582)) - MRDGH2821
- merge branch 'mihir/fix/android-ble' into dev - ([e451e85](https://github.com/pix-l-crafters/pocket-draw/commit/e451e85c802da38e02da39cfa9d34ae54b634c33)) - MRDGH2821
- remove prettier-plugin-toml - ([e6a6f8e](https://github.com/pix-l-crafters/pocket-draw/commit/e6a6f8e2616e55ffb6e66403907c19670c758074)) - MRDGH2821
- add env sample - ([581aca8](https://github.com/pix-l-crafters/pocket-draw/commit/581aca8007d7e75dc2253b900d8fcb9ae4253fd0)) - MRDGH2821

### Refactoring

- **(map)** adopt React Native Paper UI components - ([fd3161e](https://github.com/pix-l-crafters/pocket-draw/commit/fd3161eaa390a130de835beda4def7dd978af1a4)) - Ethan

### Style

- format files - ([820de99](https://github.com/pix-l-crafters/pocket-draw/commit/820de99a6d71c470f24041fd25da35402166d42d)) - MRDGH2821
- format files - ([58efa4f](https://github.com/pix-l-crafters/pocket-draw/commit/58efa4f769d79b63cc568c8168218c8aaef511da)) - MRDGH2821
- format file - ([12121e6](https://github.com/pix-l-crafters/pocket-draw/commit/12121e6ec9a47effff69c8f1a38d8d0bd25452de)) - MRDGH2821
- format file - ([7038947](https://github.com/pix-l-crafters/pocket-draw/commit/7038947e7d51784cd6f07e1e4e042a327c10577f)) - MRDGH2821

### Build

- add missing tools - ([9571af1](https://github.com/pix-l-crafters/pocket-draw/commit/9571af1dc5295d08aa48547481b8de5643caddd0)) - hbeat
- fix scripts & dependencies - ([17fc9e1](https://github.com/pix-l-crafters/pocket-draw/commit/17fc9e1d6ac00a869035398501398c1eafd29481)) - MRDGH2821
- fix dependencies and add scripts - ([99b7e5c](https://github.com/pix-l-crafters/pocket-draw/commit/99b7e5cfedaa477980f96713054fad7d95461b5c)) - MRDGH2821
- update lock files - ([3741a87](https://github.com/pix-l-crafters/pocket-draw/commit/3741a87287695ea953b27940cdda44495227d63a)) - MRDGH2821
- update package-lock.json - ([46f98b3](https://github.com/pix-l-crafters/pocket-draw/commit/46f98b379b4c8604b5b18e05489eb24961d41436)) - MRDGH2821
- update package-lock.json - ([64bf50b](https://github.com/pix-l-crafters/pocket-draw/commit/64bf50bfb25a0d4a85a0afad068f8d32a4140e85)) - MRDGH2821

### Ci

- add react ci - ([7846f72](https://github.com/pix-l-crafters/pocket-draw/commit/7846f72473b2d5ed90e070d756de5be7bafb501a)) - wutianze3

<!-- generated by git-cliff -->
