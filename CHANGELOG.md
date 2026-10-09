# Changelog

All notable changes to this project will be documented in this file. See [conventional commits](https://www.conventionalcommits.org/) for commit guidelines.

---

## [Unreleased]

### Features

- **(duel)** support volume-up confirmation during draw calibration and pre-round setup; extend pre-round actions to the bottom edge.

## [0.4.0](https://github.com/pix-l-crafters/pocket-draw/compare/v0.3.1..v0.4.0) - 2026-10-08

### Bug Fixes

- **(duel)** harden the local connection lifecycle - ([b77a20d](https://github.com/pix-l-crafters/pocket-draw/commit/b77a20dd0051bcfeee3fe13a43ad47403033e110)) - tingyueh
- **(duel)** keep volume fire handler current - ([106c903](https://github.com/pix-l-crafters/pocket-draw/commit/106c903fd75a65cec4dcdabcfa9dcac5647b39cd)) - Mobark Bacran

### Documentation

- **(duel)** record live gameplay contracts and verification - ([d3fe5ce](https://github.com/pix-l-crafters/pocket-draw/commit/d3fe5ce8e4a20b7fb7a8c1b49ff3e955e0c7e285)) - MRDGH2821
- **(duel)** record feature branch rename - ([c4bcabb](https://github.com/pix-l-crafters/pocket-draw/commit/c4bcabbd57f20fb3ed9d812a149fb5cb4e514701)) - MRDGH2821
- **(expo)** document working iPhone tunnel setup - ([3597949](https://github.com/pix-l-crafters/pocket-draw/commit/3597949a1244a407c38b104d6d977e8b2c198290)) - Mobark Bacran
- **(github)** document triage labels - ([09301e1](https://github.com/pix-l-crafters/pocket-draw/commit/09301e1a68e53dc6af6e3d02152027fed0ee556c)) - MRDGH2821

### Features

- **(duel)** capture reliable ready and shoulder pitch calibration - ([7b0b9a3](https://github.com/pix-l-crafters/pocket-draw/commit/7b0b9a393b0939b8c41fd9de9ede3fd4af79b7ec)) - MRDGH2821
- **(duel)** classify calibrated shots against opponent bearing - ([4047ee1](https://github.com/pix-l-crafters/pocket-draw/commit/4047ee173f39a0470ebec09e99189bd6a622f796)) - MRDGH2821
- **(duel)** wire calibrated aim, shot zones, and false starts - ([3366642](https://github.com/pix-l-crafters/pocket-draw/commit/336664278c9ec5b96714d525e9dd080aa07fb9c1)) - MRDGH2821
- **(duel)** warn and restart round on first false start - ([1ea5e0a](https://github.com/pix-l-crafters/pocket-draw/commit/1ea5e0a68e31b82b8d23e3b76da719c546aa8362)) - Mobark Bacran

### Miscellaneous Chores

- **(duel)** merge connection lifecycle into iPhone fix - ([3e43214](https://github.com/pix-l-crafters/pocket-draw/commit/3e43214ed8b361b4c05e0d250cfc35d70a1025b1)) - Mobark Bacran
- **(duel)** merge volume fire fix with false-start warning - ([27dc1f1](https://github.com/pix-l-crafters/pocket-draw/commit/27dc1f1c1ff8c3df5bac54fc0c381d39bbf939b9)) - Mobark Bacran
- merge branch 'dev' into MRDGH2821/feat/real-aim-live-gameplay - ([3b12b80](https://github.com/pix-l-crafters/pocket-draw/commit/3b12b80af302a970ececd7bced709ce21b3cfc64)) - MRDGH2821
- merge pull request #112 from pix-l-crafters/mobark/feat/duel-fire-and-false-start - ([9ae9285](https://github.com/pix-l-crafters/pocket-draw/commit/9ae92856985e6df14a720562436407a1525b2959)) - Mobark Bacran
- merge pull request #110 from pix-l-crafters/mobark/fix/iphone-expo-connection - ([128df8a](https://github.com/pix-l-crafters/pocket-draw/commit/128df8afb08dc6e2fae895c50d58faffbf64f2e4)) - Mihir Rabade
- fix linter errors - ([c6f0066](https://github.com/pix-l-crafters/pocket-draw/commit/c6f0066c4d471ecc9244e65db5efc1d677155e16)) - MRDGH2821

### Refactoring

- **(duel)** keep false-start warnings in match coordinator - ([171c512](https://github.com/pix-l-crafters/pocket-draw/commit/171c5124059e8f0173a7edd7738b7be13845c296)) - Mobark Bacran

---

## [0.3.1](https://github.com/pix-l-crafters/pocket-draw/compare/v0.3.0..v0.3.1) - 2026-10-08

### Miscellaneous Chores

- **(map)** share encrypted Android Maps API key - ([571ab50](https://github.com/pix-l-crafters/pocket-draw/commit/571ab5000e0b8125eeb0f258282011d4dd16d6d2)) - Ethan
- ignore native android modules - ([5a9bbdd](https://github.com/pix-l-crafters/pocket-draw/commit/5a9bbddf2f90a0103b287d167102a3f72c61fdea)) - MRDGH2821

---

## [0.3.0](https://github.com/pix-l-crafters/pocket-draw/compare/v0.2.0..v0.3.0) - 2026-10-08

### Bug Fixes

- **(duel)** check motion access before the pre-round tilt gate - ([55916d1](https://github.com/pix-l-crafters/pocket-draw/commit/55916d187f077a5daabea44e36ffb0ca59197e7e)) - Mobark Bacran
- **(duel)** recover guest and map permissions - ([7b7c6b0](https://github.com/pix-l-crafters/pocket-draw/commit/7b7c6b08bf85e440240aa4b7cf05f106f3f39e42)) - Mobark Bacran
- **(firebase)** preserve matches collection for result uploads - ([5fdfb4b](https://github.com/pix-l-crafters/pocket-draw/commit/5fdfb4b703062fbb69043490277c002d353bdfd1)) - hbeat
- **(firebase)** remove roundCount from persisted duel data - ([fedd1e6](https://github.com/pix-l-crafters/pocket-draw/commit/fedd1e6673c396e5c98d5b1c3aa3364def4ddbbe)) - hbeat

### Documentation

- **(firebase)** record production receipt rules deployment - ([b81b756](https://github.com/pix-l-crafters/pocket-draw/commit/b81b756da382e5a3d73b14c2e5081d85bab7b7ae)) - hbeat
- record the dev merges and Bluetooth removal - ([1556f34](https://github.com/pix-l-crafters/pocket-draw/commit/1556f3443bfe94f6f26fdf8152985add22415926)) - Mobark Bacran

### Features

- **(app)** check and request missing permissions per flow - ([34444fa](https://github.com/pix-l-crafters/pocket-draw/commit/34444faf9be44eeebce9d4d5d39512c64e5abc9a)) - Mobark Bacran
- **(duel)** cut over to WebRTC sessions and delete the BLE transport - ([cb0cb9c](https://github.com/pix-l-crafters/pocket-draw/commit/cb0cb9c6f01cbe4346603561cce1f5c3f9506095)) - tingyueh
- **(duel)** synchronize completed match results - ([5e30c45](https://github.com/pix-l-crafters/pocket-draw/commit/5e30c45b3758355ec349661948e8ee376db360bd)) - hbeat
- **(duel)** fire with Android volume buttons - ([cf4cdf4](https://github.com/pix-l-crafters/pocket-draw/commit/cf4cdf4f27ce8692c48eb5382395e04b4d7ec5e5)) - wutianze3
- **(duel)** add iOS volume-change fire input - ([ae41c16](https://github.com/pix-l-crafters/pocket-draw/commit/ae41c166391d1630187de89883d6f56d40bd57e2)) - MRDGH2821
- **(profile)** add read-only permission status page - ([540974c](https://github.com/pix-l-crafters/pocket-draw/commit/540974c2aec0be70076c8a6e8737cd4a6b64b148)) - Mobark Bacran

### Miscellaneous Chores

- merge branch 'dev' into tingyueh/cut-over-to-webrtc-and-delete-ble-transport - ([c7d2e20](https://github.com/pix-l-crafters/pocket-draw/commit/c7d2e2070efd3a92e2503dae4354deea2b7f8bd7)) - tingyueh
- merge pull request #102 from pix-l-crafters/tingyueh/cut-over-to-webrtc-and-delete-ble-transport - ([5b66038](https://github.com/pix-l-crafters/pocket-draw/commit/5b660382c71d262dc458ce67a6bf5a516f178226)) - Mihir Rabade
- merge dev and drop Bluetooth permission handling - ([c91b897](https://github.com/pix-l-crafters/pocket-draw/commit/c91b89758e20b9b3fc68626b55d99cd7e506d494)) - Mobark Bacran
- merge pull request #107 from pix-l-crafters/hbeat/hbeat-feat-persist-completed-live-duels-and-synchronize-the - ([7c9a703](https://github.com/pix-l-crafters/pocket-draw/commit/7c9a703993d5fd3364f0e0e3d7a158613b210504)) - Mihir Rabade
- merge dev result synchronization into the permissions branch - ([80c10d4](https://github.com/pix-l-crafters/pocket-draw/commit/80c10d43445353a1ec303e21a130ec0e1187ebdf)) - Mobark Bacran
- merge origin/dev into volume-fire branch - ([136b072](https://github.com/pix-l-crafters/pocket-draw/commit/136b072bab6fc09b3c33cd86a958a68e65ff4ecd)) - MRDGH2821
- merge pull request #104 from pix-l-crafters/wutianze3/feat/android-volume-fire - ([84efafa](https://github.com/pix-l-crafters/pocket-draw/commit/84efafa106de494402f33d4b184dfbcfa2af676b)) - Mihir Rabade
- merge pull request #108 from pix-l-crafters/hbeat/hbeat-feat-persist-completed-live-duels-and-synchronize-the - ([31b60d0](https://github.com/pix-l-crafters/pocket-draw/commit/31b60d0275dab8e98fb1ebb10efecbd21a0b5b8e)) - Mihir Rabade
- merge dev volume-button fire into the permissions branch - ([ce5f26f](https://github.com/pix-l-crafters/pocket-draw/commit/ce5f26f8cf68dd64ded3be8bbf5d52a806decaef)) - Mobark Bacran
- merge pull request #106 from pix-l-crafters/mobark/feat/check-and-request-missing-app-permissions - ([f0b51e7](https://github.com/pix-l-crafters/pocket-draw/commit/f0b51e78ffd28760484182052d8a31a047101abd)) - Mihir Rabade

---

## [0.2.0](https://github.com/pix-l-crafters/pocket-draw/compare/v0.1.0..v0.2.0) - 2026-10-08

### Bug Fixes

- **(app)** align match consumers with scoring contracts - ([0fe653f](https://github.com/pix-l-crafters/pocket-draw/commit/0fe653fb7a9f586cebfb6d054528c65d0e968d2e)) - MRDGH2821
- **(duel)** align pre-duel phone position across platforms - ([97c5ac8](https://github.com/pix-l-crafters/pocket-draw/commit/97c5ac82356ba3acb551352b6734b09c58b2d71d)) - MRDGH2821
- **(duel)** calibrate reaction clocks - ([cad5941](https://github.com/pix-l-crafters/pocket-draw/commit/cad5941a0cbca2997a5d96e7ea414b97209843dd)) - MRDGH2821
- **(duel)** save results before opening match summary - ([26fe935](https://github.com/pix-l-crafters/pocket-draw/commit/26fe9358280e07d7e4a1f02b066317548aafe367)) - hbeat
- **(duel)** support Hermes clock calibration - ([911b053](https://github.com/pix-l-crafters/pocket-draw/commit/911b0535844e018450017d1a46e539b147ab9063)) - MRDGH2821
- **(expo)** force minimum iOS deployment target on Pod resource bundles - ([11fa904](https://github.com/pix-l-crafters/pocket-draw/commit/11fa904e3227524e24999cea19542486278b7285)) - Mobark Bacran
- **(expo)** pin EAS iOS builds to the Xcode 26 image - ([d679eb4](https://github.com/pix-l-crafters/pocket-draw/commit/d679eb492ac8e08a13008f09d6cce1e19c457f78)) - Mobark Bacran
- **(firebase)** save concurrent match results atomically - ([ec9e0ff](https://github.com/pix-l-crafters/pocket-draw/commit/ec9e0fff45a1ccc064ec5d5d506aeb7e7d2b0252)) - hbeat
- apply linter fixes - ([a0fbe04](https://github.com/pix-l-crafters/pocket-draw/commit/a0fbe045d1dca319f56a81675ef64b507458bcad)) - MRDGH2821

### Documentation

- **(firebase)** record device tests and rules deployment - ([247cb91](https://github.com/pix-l-crafters/pocket-draw/commit/247cb917074f0ea149ec58f84886e4dd80024d44)) - hbeat
- align roadmap with assignment requirements - ([9297dc9](https://github.com/pix-l-crafters/pocket-draw/commit/9297dc95b86d6484a5f1f51dd717c7da9f27a13d)) - MRDGH2821
- record issue and project board reconciliation - ([8a3da92](https://github.com/pix-l-crafters/pocket-draw/commit/8a3da92708a1e3da7b1733095a1db046331893dd)) - MRDGH2821
- add Assignment 1 feedback - ([a6edde9](https://github.com/pix-l-crafters/pocket-draw/commit/a6edde9a847dd557f9a59f6e4cfce7fb04928a9e)) - MRDGH2821
- record PR 84 metadata update - ([87f1d12](https://github.com/pix-l-crafters/pocket-draw/commit/87f1d1253139f2d2eab2917f81f3a448b4457cb1)) - MRDGH2821
- add ai logs - ([3720d30](https://github.com/pix-l-crafters/pocket-draw/commit/3720d30408233b792ef219c36fa72cfaea4f8f72)) - MRDGH2821
- record Android dev build test - ([bcb2261](https://github.com/pix-l-crafters/pocket-draw/commit/bcb2261d5b53e01db79002c4830455dcacd43a44)) - MRDGH2821
- record clock calibration PR - ([985e8f9](https://github.com/pix-l-crafters/pocket-draw/commit/985e8f965e33e1eeb58582afd94b923d487910c7)) - MRDGH2821

### Features

- **(duel)** score non-offending shot on false starts - ([6dbad6d](https://github.com/pix-l-crafters/pocket-draw/commit/6dbad6d4647b2175d865ea3726df4004b45830ad)) - wutianze3
- **(firebase)** load real user ratings for leaderboard - ([9a47046](https://github.com/pix-l-crafters/pocket-draw/commit/9a47046524020bd86a6982266afe95fa598718bc)) - hbeat
- **(profile)** show draws in player stats - ([014a9f9](https://github.com/pix-l-crafters/pocket-draw/commit/014a9f9e8b77dfc43e34d1902de34d8c23931b68)) - MRDGH2821
- **(profile)** display the installed app version - ([257a33f](https://github.com/pix-l-crafters/pocket-draw/commit/257a33f8c2200cbbe2bfdeb5e479c7e12b862ec5)) - tingyueh
- add save result and eloRating - ([2d9d8f6](https://github.com/pix-l-crafters/pocket-draw/commit/2d9d8f65d287c6335d258965e3d0586677cb4668)) - hbeat

### Miscellaneous Chores

- **(mise)** update tools & lock files - ([898fec8](https://github.com/pix-l-crafters/pocket-draw/commit/898fec8c290317316031850ecfa72cb3e2cc112e)) - MRDGH2821
- **(mise)** streamline dependency and agent setup - ([06c5036](https://github.com/pix-l-crafters/pocket-draw/commit/06c5036da388ecb231d719e327eda9f19a6e899b)) - MRDGH2821
- merge pull request #79 from pix-l-crafters/mobark/build/fix-deps - ([497529c](https://github.com/pix-l-crafters/pocket-draw/commit/497529c4a6eb12fa01698a6cbb93132162cdcc98)) - Mihir Rabade
- use mattpocock's plugin - ([3101c9b](https://github.com/pix-l-crafters/pocket-draw/commit/3101c9b21f5420399d0c825f8cad8887a935f916)) - MRDGH2821
- merge pull request #84 from pix-l-crafters/mihir/chore/update-work-list - ([c2f1213](https://github.com/pix-l-crafters/pocket-draw/commit/c2f1213ef2886c86d87039c278c3a84aadb725e4)) - Mihir Rabade
- merge pull request #86 from pix-l-crafters/mihir/chore/release - ([1a1406d](https://github.com/pix-l-crafters/pocket-draw/commit/1a1406dc07c027ddabe030dbc23861d2a180ddca)) - Mihir Rabade
- merge pull request #87 from pix-l-crafters/mihir/chore/release-tag - ([fc28ee4](https://github.com/pix-l-crafters/pocket-draw/commit/fc28ee4207143ff52e9b9b1e36c72bc0ea6052df)) - Mihir Rabade
- merge pull request #88 from pix-l-crafters/main - ([0cde9e3](https://github.com/pix-l-crafters/pocket-draw/commit/0cde9e37835d683bfb48d031242413e585d599e6)) - Mihir Rabade
- merge pull request #89 from pix-l-crafters/release - ([e7f565b](https://github.com/pix-l-crafters/pocket-draw/commit/e7f565b3958c8865410fd743e8c6f2a0dd3d4880)) - Mihir Rabade
- add linter dependencies - ([cc8e716](https://github.com/pix-l-crafters/pocket-draw/commit/cc8e71600560d6a2ff01f1a3e3d48acabba6e3cc)) - MRDGH2821
- add tsc linter - ([59b0323](https://github.com/pix-l-crafters/pocket-draw/commit/59b032311e91beb0c30b0ac9b0e6931fedf6180f)) - MRDGH2821
- add oxlint - ([b644e06](https://github.com/pix-l-crafters/pocket-draw/commit/b644e06d2c986a9307a00d3a7fb56baed21fc96a)) - MRDGH2821
- merge pull request #92 from pix-l-crafters/mihir/chore/update-dev-env - ([cf8a068](https://github.com/pix-l-crafters/pocket-draw/commit/cf8a06828110007d85c3077519261abe658478a8)) - Mihir Rabade
- merge branch 'dev' into tanachat/feature/save-result - ([4377157](https://github.com/pix-l-crafters/pocket-draw/commit/4377157de10cfa4286bb268a5ba15e688c1faea8)) - MRDGH2821
- merge pull request #91 from pix-l-crafters/tanachat/feature/save-result - ([53e194b](https://github.com/pix-l-crafters/pocket-draw/commit/53e194b725037b6344af46e9a81b6497ceee3f68)) - Mihir Rabade
- merge dev into false-start-shot - ([a8cc177](https://github.com/pix-l-crafters/pocket-draw/commit/a8cc177658cc256c1894c31a4dd3546d1cd10c7e)) - Tianze
- merge pull request #85 from pix-l-crafters/tianze/feat/false-start-shot - ([2df0fbf](https://github.com/pix-l-crafters/pocket-draw/commit/2df0fbf1b2aa98b7cd9812481f68ccde5a0156ba)) - Mihir Rabade
- ignore nested dirs - ([aaf87b9](https://github.com/pix-l-crafters/pocket-draw/commit/aaf87b9b3a3afa2da8ead559f25ce03e738b17e3)) - MRDGH2821
- ignore worktrees - ([d097be5](https://github.com/pix-l-crafters/pocket-draw/commit/d097be53f4bad4e69be79a4c0661a39c7565bfac)) - MRDGH2821
- merge pull request #93 from pix-l-crafters/MRDGH2821/draws-show-up-in-player-stats - ([bebc310](https://github.com/pix-l-crafters/pocket-draw/commit/bebc310afa823e9504c81d7f273e3b34c8cc5a44)) - Mihir Rabade
- merge branch 'dev' into MRDGH2821/bug/pre-duel-phone-position-differs-between-ios - ([c377db8](https://github.com/pix-l-crafters/pocket-draw/commit/c377db8fa88facf1f8eca7bcff89feb76834c1fe)) - MRDGH2821
- merge pull request #95 from pix-l-crafters/MRDGH2821/bug/pre-duel-phone-position-differs-between-ios - ([ee6af2f](https://github.com/pix-l-crafters/pocket-draw/commit/ee6af2f978c82cba548c98753de74cff0295c274)) - Mihir Rabade
- save local build setup and simulator work log - ([983929d](https://github.com/pix-l-crafters/pocket-draw/commit/983929ddeb97eaf5e4088905bc03fedf0fab702e)) - hbeat
- restore lockfiles to dev versions - ([2de59ac](https://github.com/pix-l-crafters/pocket-draw/commit/2de59ac700d138c876772652acc5b0d1d24d5f78)) - hbeat
- merge pull request #97 from pix-l-crafters/hbeat/leaderboard-screen-shows-real-rankings - ([94bb6e9](https://github.com/pix-l-crafters/pocket-draw/commit/94bb6e9f1fb92cbc6b5c84c4aa1d0400cab45d88)) - Mihir Rabade
- register Android CLI skill - ([537e5c3](https://github.com/pix-l-crafters/pocket-draw/commit/537e5c3f321d049418236b72a0e7dd91829ed4f7)) - MRDGH2821
- merge branch 'dev' into MRDGH2821/fix/clock-offset-calibration-for-reaction-timing - ([c56c59d](https://github.com/pix-l-crafters/pocket-draw/commit/c56c59d24472b839b47245ce937e322e1183f61d)) - MRDGH2821
- merge dev into clock calibration branch - ([e201af4](https://github.com/pix-l-crafters/pocket-draw/commit/e201af43b3f241370b04187c57852909033a40f1)) - MRDGH2821
- merge pull request #96 from pix-l-crafters/MRDGH2821/fix/clock-offset-calibration-for-reaction-timing - ([e3d58ab](https://github.com/pix-l-crafters/pocket-draw/commit/e3d58abfd75d98a9074316d6b3a62fc6edbcf938)) - Mihir Rabade
- merge pull request #101 from pix-l-crafters/hbeat/fix/save-result - ([6d897ff](https://github.com/pix-l-crafters/pocket-draw/commit/6d897ffed7e153a6b2a202a55ac750f32e3dd667)) - Mihir Rabade
- merge pull request #100 from pix-l-crafters/tingyueh/display-the-game-version-on-the-profile-screen - ([359d3ae](https://github.com/pix-l-crafters/pocket-draw/commit/359d3aec17f97a5cb1be74fc3946e30c6e2219f0)) - Mihir Rabade
- update lock file - ([1bfab0b](https://github.com/pix-l-crafters/pocket-draw/commit/1bfab0b184a7530e45d46ef0bf2775c612fe93cc)) - MRDGH2821
- merge pull request #103 from pix-l-crafters/mrdgh2821/fix/clock-calibration - ([4b1e559](https://github.com/pix-l-crafters/pocket-draw/commit/4b1e559636fb7f8c725afa9b99448cac14e37db4)) - Mihir Rabade
- merge pull request #105 from pix-l-crafters/hbeat/feature/fix-save-result - ([7f171da](https://github.com/pix-l-crafters/pocket-draw/commit/7f171da3a6d2323b6e5d2483dc89ae131937fb80)) - Mihir Rabade

### Refactoring

- **(firebase)** simplify leaderboard ranking fields - ([6a48441](https://github.com/pix-l-crafters/pocket-draw/commit/6a484416c43fc95c1121395c06bb6bfc4b6cb5e1)) - hbeat

### Style

- format files - ([cffec78](https://github.com/pix-l-crafters/pocket-draw/commit/cffec7828a66562471fade9a0c8402359b378410)) - MRDGH2821
- format files - ([0036bf3](https://github.com/pix-l-crafters/pocket-draw/commit/0036bf3b9bb6cf485eb8fdaacb2b3451ac1ea635)) - MRDGH2821
- format files - ([83a56e6](https://github.com/pix-l-crafters/pocket-draw/commit/83a56e6a3e736b8c4d189cb26c589b6046f02d5c)) - MRDGH2821
- format files - ([dd077f4](https://github.com/pix-l-crafters/pocket-draw/commit/dd077f454ce69cf3798c58ee6d6effe24016d2f7)) - MRDGH2821

### Build

- **(mise)** update lock files - ([0feefbf](https://github.com/pix-l-crafters/pocket-draw/commit/0feefbf377a6e14b8f41113ebcbbf25771f4118a)) - MRDGH2821
- **(mise)** configure local Android APK and AAB builds - ([95de635](https://github.com/pix-l-crafters/pocket-draw/commit/95de635b14e93f164c6351606703f6a1d8d669c2)) - MRDGH2821
- **(mise)** remove enter hook & add lock files - ([0ea1d2b](https://github.com/pix-l-crafters/pocket-draw/commit/0ea1d2b6cfad004c39a281f3c974848b83efebdc)) - MRDGH2821
- **(mise)** update tools & lock files - ([73cfb65](https://github.com/pix-l-crafters/pocket-draw/commit/73cfb65ef71f71e78bac447ce32ac37ca021c487)) - MRDGH2821
- **(mise)** update task - ([c0a7c56](https://github.com/pix-l-crafters/pocket-draw/commit/c0a7c56682ac9b760aadbc7fad10f0fc3bda1b5e)) - MRDGH2821

### Ci

- delete eas ci workflow - ([0a0da86](https://github.com/pix-l-crafters/pocket-draw/commit/0a0da86dd46b8bcb3a163a4c7a84d97a3f7ba911)) - MRDGH2821
- delete react native CI - ([398f8ae](https://github.com/pix-l-crafters/pocket-draw/commit/398f8ae6cd6bc3804ec55d8a19e239121ae66305)) - MRDGH2821

---

## [0.1.0] - 2026-10-05

### Bug Fixes

- **(ci)** resolve MegaLinter failures from new npm dependencies - ([2b6d697](https://github.com/pix-l-crafters/pocket-draw/commit/2b6d6975b8c761a71e5a7253bfc16f6596067057)) - tingyueh
- **(ci)** suppress known transitive uuid vulnerability in expo/xcode - ([8cc605e](https://github.com/pix-l-crafters/pocket-draw/commit/8cc605e98d4f4b4318f13fa48ac1524131e2603c)) - tingyueh
- **(ci)** check out PR head branch instead of detached merge commit - ([deffb91](https://github.com/pix-l-crafters/pocket-draw/commit/deffb91379d41a1241b9d58d372436e40f8149ca)) - tingyueh
- **(ci)** use commit mode for auto-fixes instead of opening a PR - ([472db10](https://github.com/pix-l-crafters/pocket-draw/commit/472db1095ed2080e4909c5f265dd5c98d607dac5)) - tingyueh
- **(ci)** degrade to empty url on unparseable eas build output - ([a9ae332](https://github.com/pix-l-crafters/pocket-draw/commit/a9ae3327b578a3bbe3a0951ce9aa957192923ef8)) - Mobark Bacran
- **(ci)** skip notify job when build was skipped, not just on success/failure - ([085487b](https://github.com/pix-l-crafters/pocket-draw/commit/085487b0a3f4c264263f3fad15c8e8cfe2266c05)) - Mobark Bacran
- **(ci)** install eas-cli, fix cross-PR concurrency dedup, guard empty install url - ([d3115f6](https://github.com/pix-l-crafters/pocket-draw/commit/d3115f65be3db70b4a9297ca7ff5b0882b54c5fa)) - Mobark Bacran
- **(duel)** score ties for both players and require a strict lead to decide the match - ([8c72af1](https://github.com/pix-l-crafters/pocket-draw/commit/8c72af12fceba26daf9471cce524e0ba71f645c9)) - Mobark Bacran
- **(duel)** return RSSI reading directly instead of a nonexistent property - ([b99590d](https://github.com/pix-l-crafters/pocket-draw/commit/b99590dbcb22938e21f1ac5362f906a72cdb49a5)) - Mobark Bacran
- **(duel)** score ties for both players and require a strict lead to decide the match - ([6ead567](https://github.com/pix-l-crafters/pocket-draw/commit/6ead567eb5853c51968bc85de4addea1f583f578)) - Mobark Bacran
- **(duel)** trim countdown audio to fit the tick gap - ([bf3b97e](https://github.com/pix-l-crafters/pocket-draw/commit/bf3b97e4a7ffbca7fd6e079561e91fd6041ba014)) - Mobark Bacran
- **(duel)** stop the guest's duel channel closing before the countdown - ([c01b982](https://github.com/pix-l-crafters/pocket-draw/commit/c01b98231276fdcd5a2ff366166ffcfdbf8554ab)) - Mobark Bacran
- **(duel)** finish the scan-to-draw flow across both platforms - ([74b3e56](https://github.com/pix-l-crafters/pocket-draw/commit/74b3e5609aeda172b1de041d97819687310d17ba)) - Mobark Bacran
- **(duel)** keep guest connected when signaling closes - ([a551314](https://github.com/pix-l-crafters/pocket-draw/commit/a55131468fb47a1fa575dbfddffa8a873d5c7581)) - tingyueh
- **(expo)** downgrade to SDK 54 for Expo Go App Store compatibility - ([f26fdea](https://github.com/pix-l-crafters/pocket-draw/commit/f26fdea4f2bdd5d1bf1f2b4ab25325ea2506175a)) - tingyueh
- **(expo)** include asset native module - ([7d19bc9](https://github.com/pix-l-crafters/pocket-draw/commit/7d19bc9a72ca4d6c50b65cd8cf95c1db60bb5147)) - hbeat
- **(expo)** restore shared iOS bundle identifier - ([5aadb9a](https://github.com/pix-l-crafters/pocket-draw/commit/5aadb9a6e82a07f28cbe38bb5daa18ade3cf0c39)) - Mobark Bacran
- **(expo)** pin EAS build node version to match the project's - ([b552920](https://github.com/pix-l-crafters/pocket-draw/commit/b552920db4c84f9bcff760e4b581a183f0e483f3)) - Mobark Bacran
- **(expo)** disable precompiled Expo modules to fix iOS build - ([6be12c7](https://github.com/pix-l-crafters/pocket-draw/commit/6be12c7be8cbc901a69428c346a4bed21ba20507)) - Mobark Bacran
- **(expo)** patch expo-camera to fix disabled barcode scanning on iOS - ([fecec8e](https://github.com/pix-l-crafters/pocket-draw/commit/fecec8ee2246b58a1e1dc441ba2526f40beafe9d)) - Mobark Bacran
- **(map)** inject the Google Maps Android key from the environment - ([2a09c5d](https://github.com/pix-l-crafters/pocket-draw/commit/2a09c5df1d1080b0fd460a1df5fd6c19b6263648)) - Ethan
- **(map)** separate overlapping player markers - ([9344cd1](https://github.com/pix-l-crafters/pocket-draw/commit/9344cd17c7b0244f24ac5475141870b4992f9b17)) - Ethan
- **(map)** keep Android launch alive without a Maps key - ([1fe0d8a](https://github.com/pix-l-crafters/pocket-draw/commit/1fe0d8ac1c23dd9de144fbf9787649158583b418)) - MRDGH2821
- **(megalinter)** override postcss to resolve trivy vulnerability CVE-2026-73646 - ([494a47e](https://github.com/pix-l-crafters/pocket-draw/commit/494a47e8088ed3b77b194a66c7768d0bc11c51d7)) - MRDGH2821
- **(mise)** fix prepare task - ([6851544](https://github.com/pix-l-crafters/pocket-draw/commit/6851544e4a023cae61dd24fe2f26c07ea515c4a1)) - MRDGH2821
- **(mise)** add missing expo-font plugin entry to app.json - ([2a1c856](https://github.com/pix-l-crafters/pocket-draw/commit/2a1c8564e9ccacd82b3d3203a421af1776404699)) - Mobark Bacran
- **(prettier)** ignore lockfiles and build caches to prevent formatting conflicts - ([45c999e](https://github.com/pix-l-crafters/pocket-draw/commit/45c999e0ab5c86d50074528294869b78aff5b528)) - MRDGH2821
- **(qr)** match challenge-request test to widened ChallengeHandoff - ([f9c51cb](https://github.com/pix-l-crafters/pocket-draw/commit/f9c51cb6abbace7c1122ed5bd9ca1ea54cd11660)) - Mobark Bacran
- downgrade to Expo SDK 54 and switch to plain Expo Go - ([79965bc](https://github.com/pix-l-crafters/pocket-draw/commit/79965bc2413b629f245804fcfda48907eaae901b)) - Mobark Walid
- update vulnerability ignore lists in .trivyignore, osv-scanner.toml, and .grype.yaml - ([cb924d5](https://github.com/pix-l-crafters/pocket-draw/commit/cb924d5a7655c97dc238241e1ac381dbcafb7d44)) - Mobark Walid
- update cspell dictionary and improve README instructions for Expo Go compatibility - ([86eba34](https://github.com/pix-l-crafters/pocket-draw/commit/86eba34ff720c9b4c6d848c54ae733c7f87da270)) - Mobark Walid
- cache Trivy vulnerability database to avoid rate limits in CI - ([35394ed](https://github.com/pix-l-crafters/pocket-draw/commit/35394ed97616c55620c53f64f64c92ddc9a3a503)) - Mobark Walid
- pin java 21 and align react-native deps for android BLE build - ([2fa9af6](https://github.com/pix-l-crafters/pocket-draw/commit/2fa9af6ce99f5936e6460eb5a3e0a07ba9b23930)) - MRDGH2821
- packages version & readme development build - ([443502c](https://github.com/pix-l-crafters/pocket-draw/commit/443502cbfb9802d45602c07ee698677dd7928e51)) - hbeat
- resolve committed merge conflict markers in App.tsx - ([a2ca11f](https://github.com/pix-l-crafters/pocket-draw/commit/a2ca11f145c739890128e4ff8ba8b17bff0ce3d2)) - Mobark Bacran
- resolve committed merge conflict markers in App.tsx - ([9ed821d](https://github.com/pix-l-crafters/pocket-draw/commit/9ed821d4daa9c6cd59d3db9306a49d2ec7cb2c7d)) - Mobark Bacran
- resolve committed merge conflict markers in App.tsx - ([bcd1632](https://github.com/pix-l-crafters/pocket-draw/commit/bcd1632c0d2bf0f3e7dee332f74ec72b22004e03)) - Mobark Bacran
- update secrets - ([372bd37](https://github.com/pix-l-crafters/pocket-draw/commit/372bd376dc320907f823dd87bf1d5714a497dae4)) - MRDGH2821
- remove apm watch - ([acdb3f4](https://github.com/pix-l-crafters/pocket-draw/commit/acdb3f48b2fda05b64487c1ae1ff821155b1414a)) - Mobark Bacran
- fix commands - ([4217189](https://github.com/pix-l-crafters/pocket-draw/commit/421718934db21ce015c77707ebe020bec5c44be0)) - Mobark Bacran
- remove conflict markers from agent work log - ([f7408be](https://github.com/pix-l-crafters/pocket-draw/commit/f7408bea34dd46afb1b6bdabdbd9a692e5c42f64)) - MRDGH2821
- unique heading in merged agent work log - ([b53074a](https://github.com/pix-l-crafters/pocket-draw/commit/b53074a735ba0b2bf628208f8851a0feb80075ce)) - MRDGH2821
- add maps fix - ([5a9054f](https://github.com/pix-l-crafters/pocket-draw/commit/5a9054f5eb2ef047ae7145de3e65eb75cc39ca81)) - MRDGH2821
- sync package-lock.json with package.json - ([78ff190](https://github.com/pix-l-crafters/pocket-draw/commit/78ff1905eaed63d93dcc99d2903464473ecc4390)) - Mobark Bacran
- add test-renderer as an explicit devDependency - ([65e2a13](https://github.com/pix-l-crafters/pocket-draw/commit/65e2a13150922587a60a3a1030fde0790b3f8da4)) - Mobark Bacran
- enable iOS scene lifecycle support - ([62e0288](https://github.com/pix-l-crafters/pocket-draw/commit/62e02888e18008c4a683fedc7e901c08c1725ea4)) - Mobark Bacran

### Documentation

- **(duel)** define raise gesture thresholds - ([280aa7e](https://github.com/pix-l-crafters/pocket-draw/commit/280aa7eeb8e14436d0aa9ba13fb482f601b81d6f)) - wutianze3
- **(map)** log continuous-publish / toggle / pin-popup iterations - ([d508c4f](https://github.com/pix-l-crafters/pocket-draw/commit/d508c4f195f34f8131379e377ccbeb871e768d2e)) - Ethan
- add plan - ([18edf01](https://github.com/pix-l-crafters/pocket-draw/commit/18edf010776105fb3e40009e4badb6c3eaba9a5e)) - MRDGH2821
- add Quickdraw Showdown implementation design - ([b1bc32e](https://github.com/pix-l-crafters/pocket-draw/commit/b1bc32e5975b74bd8e6a61c2da2530bbc6065375)) - MRDGH2821
- add generated changelog - ([7500c68](https://github.com/pix-l-crafters/pocket-draw/commit/7500c68b50c0d485f1cabbf514569a9fde4566e1)) - Mobark Bacran
- add Map + Duel implementation design - ([f1a5c7b](https://github.com/pix-l-crafters/pocket-draw/commit/f1a5c7bc1f03cbc79ca47ff34586227114262f5f)) - Mobark Bacran
- add design-system implementation design - ([8820aad](https://github.com/pix-l-crafters/pocket-draw/commit/8820aadd184e430feba8d17cc152311ab5db52f7)) - Mobark Bacran
- mark design-system implementation plan complete - ([cdf009c](https://github.com/pix-l-crafters/pocket-draw/commit/cdf009caab4cfedef903e6881f2ed38c8f56ff03)) - Mobark Bacran
- add Map + Duel implementation design - ([4ddf635](https://github.com/pix-l-crafters/pocket-draw/commit/4ddf635b83e0321df8fb01956c10af6c761aefa6)) - Mobark Bacran
- add task splits - ([13cafa7](https://github.com/pix-l-crafters/pocket-draw/commit/13cafa7b63488b2777eb92f0a9d8c2fd8724cd29)) - Mobark Bacran
- document shared-contracts pattern in task-splits - ([e255100](https://github.com/pix-l-crafters/pocket-draw/commit/e25510024dbba1fb8386394cbbdee5ed8dccb3a2)) - Mobark Bacran
- consolidate agent work log from parallel integration branches - ([9da0a08](https://github.com/pix-l-crafters/pocket-draw/commit/9da0a087f748e35c81eeea2130ee00b3597b277d)) - Mobark Bacran
- add task-splits-v2 status catch-up and integration plan - ([fc4b735](https://github.com/pix-l-crafters/pocket-draw/commit/fc4b7354feb428ba991942a00b5b9164f5500d3a)) - Mobark Bacran
- add PR contribution summaries - ([4c17d5e](https://github.com/pix-l-crafters/pocket-draw/commit/4c17d5e3e67c953a37c460365519ad93cea4fefd)) - tingyueh
- add product design - ([7490b14](https://github.com/pix-l-crafters/pocket-draw/commit/7490b14ee1bc0ade5fccbf6d3442d2589636b9e8)) - MRDGH2821
- add leaderboards section - ([970c318](https://github.com/pix-l-crafters/pocket-draw/commit/970c318cd565138b0ef8d0aca2f7a14092ac9fa4)) - MRDGH2821
- add leaderboards stats to display - ([b28419d](https://github.com/pix-l-crafters/pocket-draw/commit/b28419def193727f2338af730a5a507c8213ccd0)) - MRDGH2821
- add connection description - ([195979b](https://github.com/pix-l-crafters/pocket-draw/commit/195979b170cc6e8c1d7f4e2f2f6851d0858e294d)) - MRDGH2821
- clarify statistics - ([50521d9](https://github.com/pix-l-crafters/pocket-draw/commit/50521d9319921fcf17317dcf463b8634292ef327)) - MRDGH2821
- add challenge UI - ([8474033](https://github.com/pix-l-crafters/pocket-draw/commit/8474033b7c0e9b16e51d12e423afe030a9f397dd)) - MRDGH2821
- add remaining-work roadmap - ([4ed689d](https://github.com/pix-l-crafters/pocket-draw/commit/4ed689deb7a8951ae0cb65f9fa81c7e6d6467cac)) - MRDGH2821
- add android map fix and haptics/audio fairness gap to roadmap - ([58a3f62](https://github.com/pix-l-crafters/pocket-draw/commit/58a3f6216220aa9b7e8b88b3421caa74fff5ea34)) - MRDGH2821
- rebuild fire mechanic and scoring around Gameplay v2 - ([2ad61dd](https://github.com/pix-l-crafters/pocket-draw/commit/2ad61dd45315af782cf926eda31b7446d6417d1a)) - MRDGH2821
- apply pushback review findings to roadmap - ([8685dc8](https://github.com/pix-l-crafters/pocket-draw/commit/8685dc88e1a2beae22173b99513dd35bda7fbf7b)) - MRDGH2821
- add pushback review report for roadmap - ([d176bf9](https://github.com/pix-l-crafters/pocket-draw/commit/d176bf94dbcd33691c8cf9a7223de79a969dea82)) - MRDGH2821
- add fire mechanic & scoring design spec - ([c87ce4f](https://github.com/pix-l-crafters/pocket-draw/commit/c87ce4ff680dd7e441b7a5663eb06c8372609e2f)) - MRDGH2821
- flag unresolved tie-window vs single-faster-shot ambiguity - ([afc25a1](https://github.com/pix-l-crafters/pocket-draw/commit/afc25a1cb020501495c81736398b48d38ccd29ca)) - MRDGH2821
- add connectivity rewrite design spec, link both specs from roadmap - ([1e91600](https://github.com/pix-l-crafters/pocket-draw/commit/1e91600b1888f6e20df011859b00a4cdcb0878c4)) - MRDGH2821
- reorder and normalize 2026-09-10 work log after integration merge - ([ed0daad](https://github.com/pix-l-crafters/pocket-draw/commit/ed0daad259e8d143dfbf43c0b032096c7c3536b6)) - Mobark Bacran
- resolve tie-window scoring and signaling-socket lifecycle - ([1ca804a](https://github.com/pix-l-crafters/pocket-draw/commit/1ca804aaf3f7e4934e5375f8c5e0f5bd3d1d3d87)) - MRDGH2821
- full consistency pass, resolve match-tally model ambiguity - ([617f7d7](https://github.com/pix-l-crafters/pocket-draw/commit/617f7d707e65067b609c7008dc5dfc0873dbfa63)) - MRDGH2821
- alignment pass - track reconnect state preservation, flag aim gap - ([b1eefc6](https://github.com/pix-l-crafters/pocket-draw/commit/b1eefc63fbae07cc330ab0125a4ebd98a4561b08)) - MRDGH2821
- add alignment review report for roadmap - ([444cb41](https://github.com/pix-l-crafters/pocket-draw/commit/444cb4117e9bbf06b17ee5d82c9c948896f9ac41)) - MRDGH2821
- resolve reconnect-auth token freshness under deadline pressure - ([242c1d5](https://github.com/pix-l-crafters/pocket-draw/commit/242c1d58769263e5f6142b0913053cb99dba45ce)) - MRDGH2821
- resolve false-start point value under sum-of-points scoring - ([4d86295](https://github.com/pix-l-crafters/pocket-draw/commit/4d8629597e71dcc56b69a28d359d22e20641c33b)) - MRDGH2821
- fix item 24's scope description after reading disconnectRecovery.ts - ([12073c1](https://github.com/pix-l-crafters/pocket-draw/commit/12073c1c8b5fdba8fc1b12abaef426c53238bb4e)) - MRDGH2821
- add second pushback review report for roadmap - ([bfa337d](https://github.com/pix-l-crafters/pocket-draw/commit/bfa337d1e1ccebacf0065ef979690d6379e2dce0)) - MRDGH2821
- clarify expiresAt extension scope for reconnect auth - ([871225c](https://github.com/pix-l-crafters/pocket-draw/commit/871225c605cf3c6a6af0b3eaea27683aaf925677)) - MRDGH2821
- sync roadmap's fire-mechanic subsection with false-start resolution - ([2ac0a98](https://github.com/pix-l-crafters/pocket-draw/commit/2ac0a98cf45ea53626df43c1dcac15bfe228ad60)) - MRDGH2821
- add second alignment review report for roadmap - ([0dc30d7](https://github.com/pix-l-crafters/pocket-draw/commit/0dc30d706b9b07858f2efaa1c9d068d816ad14b4)) - MRDGH2821
- resolve two open risks with research instead of leaving them open - ([334ede7](https://github.com/pix-l-crafters/pocket-draw/commit/334ede7b175decad9ae19922ef3fbc135e14e108)) - MRDGH2821
- ship aim/bearing check as a stretch goal, not core scope - ([03632c0](https://github.com/pix-l-crafters/pocket-draw/commit/03632c033efdc0c9b316103cc823a764bd6127fa)) - MRDGH2821
- add architecture review report for pocket-draw - ([9273b6b](https://github.com/pix-l-crafters/pocket-draw/commit/9273b6b59a6e6baffa9c74466f5d0ab0df59064f)) - MRDGH2821
- add ai log - ([7d1072b](https://github.com/pix-l-crafters/pocket-draw/commit/7d1072bee8021f0abdbd7bb9137261600b82f7fc)) - MRDGH2821
- point the leaderboard at users/{uid} for player names - ([32c34fd](https://github.com/pix-l-crafters/pocket-draw/commit/32c34fdcb40e4a4f533b0182661a0212ad16b841)) - Ethan
- log the challengeRequests firestore rules deploy - ([5bcfd6d](https://github.com/pix-l-crafters/pocket-draw/commit/5bcfd6d16c72e85fb28c20d51998a96ca0e86255)) - Mobark Bacran
- add design spec for Expo builds via CI on dev branch - ([6e9560f](https://github.com/pix-l-crafters/pocket-draw/commit/6e9560fa776ab43eadb3ce0d8944b546efd03e1d)) - Mobark Bacran
- add implementation plan for Expo builds via CI on dev branch - ([f2d2466](https://github.com/pix-l-crafters/pocket-draw/commit/f2d2466dce2b8fd0f961fcce9602eab82ad59851)) - Mobark Bacran
- fix structure - ([3846fb9](https://github.com/pix-l-crafters/pocket-draw/commit/3846fb9c7ce82554b252310fe2391a5c293bac27)) - MRDGH2821
- fix linter errors - ([b9613b3](https://github.com/pix-l-crafters/pocket-draw/commit/b9613b3ab5b59065242b3bcc7899e80db938b199)) - MRDGH2821
- create interim changelog - ([d025104](https://github.com/pix-l-crafters/pocket-draw/commit/d02510488f4ec7fe3b2d08d27a70a63983f847f4)) - MRDGH2821

### Features

- **(app)** integrate duel pre-round flow - ([22a4933](https://github.com/pix-l-crafters/pocket-draw/commit/22a4933e21391d6f944f202913515d437fd7f3a3)) - hbeat
- **(app)** add challenge request flow foundation - ([3a2cb86](https://github.com/pix-l-crafters/pocket-draw/commit/3a2cb86179e22053927a1f1794e93d437dcf9b30)) - tingyueh
- **(app)** Added the app icon for ios and android - ([d47d3bb](https://github.com/pix-l-crafters/pocket-draw/commit/d47d3bb98c934d10ccde16d8f71d5fa6e5fe6244)) - Mobark Bacran
- **(app)** move navigation to a bottom bar and make Duel contextual - ([7d3d43e](https://github.com/pix-l-crafters/pocket-draw/commit/7d3d43e21e1f07df6203ed319a45db857d7d25e2)) - Mobark Bacran
- **(auth)** require a username and mirror it to a public profile - ([e89eb32](https://github.com/pix-l-crafters/pocket-draw/commit/e89eb32de9cdba06b7f295c5dbe160f710efe299)) - Ethan
- **(ble)** duel session layer and connection UI - ([f071c0b](https://github.com/pix-l-crafters/pocket-draw/commit/f071c0b7c1fb7ca7e63ac2efc914f74d7b39ad9d)) - Ethan
- **(ci)** build EAS previews for ios and android on merge to dev - ([6616f60](https://github.com/pix-l-crafters/pocket-draw/commit/6616f60a7773755817d27a1aaa468e7b14b1b713)) - Mobark Bacran
- **(ci)** notify PR with EAS preview build links - ([76f1ae8](https://github.com/pix-l-crafters/pocket-draw/commit/76f1ae89c1a288396b1976b7bf62ae8fc619e3c7)) - Mobark Bacran
- **(duel)** add pre-round ritual and ELO updates - ([4cb514f](https://github.com/pix-l-crafters/pocket-draw/commit/4cb514fe853d798165965d843b0208c0d3cc671a)) - hbeat
- **(duel)** add live RSSI reader boundary - ([85e92f6](https://github.com/pix-l-crafters/pocket-draw/commit/85e92f6db431b017ad510f39cde6f780ebee2e08)) - hbeat
- **(duel)** calculate ELO in player stats - ([a9594da](https://github.com/pix-l-crafters/pocket-draw/commit/a9594dafd4f023f76b6e573d884635e5fa75f8b5)) - hbeat
- **(duel)** add haptic round feedback - ([c12bab1](https://github.com/pix-l-crafters/pocket-draw/commit/c12bab148cafc4e7a3d0b458214b94a6c448ba59)) - hbeat
- **(duel)** add local countdown audio placeholder - ([2695255](https://github.com/pix-l-crafters/pocket-draw/commit/2695255b66bfa2a13ff7bacfe6686c6aa10b4bdc)) - hbeat
- **(duel)** synchronize fire signal after countdown - ([de4f578](https://github.com/pix-l-crafters/pocket-draw/commit/de4f578a2d1f844263f361ac23df25693f038e63)) - wutianze3
- **(duel)** detect raise gesture with accelerometer - ([234897a](https://github.com/pix-l-crafters/pocket-draw/commit/234897aaaf4994369e3a2eb18686ff1a9b1f4f90)) - wutianze3
- **(duel)** add draw calibration step - ([6fe1c31](https://github.com/pix-l-crafters/pocket-draw/commit/6fe1c311870b1eba5e0676537bba350b5bcdb90d)) - wutianze3
- **(duel)** detect pre-fire movement - ([024f256](https://github.com/pix-l-crafters/pocket-draw/commit/024f25670dbc60694144d8576f965517b6c9c9d3)) - wutianze3
- **(duel)** resolve false starts as round losses - ([1d50d2d](https://github.com/pix-l-crafters/pocket-draw/commit/1d50d2dd0700e4ac2d951c4dce49a973ee409961)) - wutianze3
- **(duel)** capture reaction time in milliseconds - ([c225da6](https://github.com/pix-l-crafters/pocket-draw/commit/c225da68dabe27472673ccd0c0070e794846bab8)) - wutianze3
- **(duel)** score tied rounds within timing window - ([34285d0](https://github.com/pix-l-crafters/pocket-draw/commit/34285d05c8b50baad87d101114f4876920f939d9)) - wutianze3
- **(duel)** retry dropped connections before abort - ([b99c6bd](https://github.com/pix-l-crafters/pocket-draw/commit/b99c6bd6e6498d6b11e154da3f83c3e6b2252166)) - wutianze3
- **(duel)** add round-loop logic and per-round result screen - ([315d1df](https://github.com/pix-l-crafters/pocket-draw/commit/315d1df5b6f8ad8966032d0573c4e0ebc891e760)) - Mobark Bacran
- **(duel)** add postmatch summary screen with rematch and return-to-map - ([9a11cbb](https://github.com/pix-l-crafters/pocket-draw/commit/9a11cbb17f33a1bf9625f44efc4232a29a6c2a4c)) - Mobark Bacran
- **(duel)** implement Gameplay v2 zone-based round scoring - ([43b52d0](https://github.com/pix-l-crafters/pocket-draw/commit/43b52d08ac9fa861ed3f9214ed519420d0570af0)) - MRDGH2821
- **(duel)** capture pitch-angle calibration from DeviceMotion - ([c757051](https://github.com/pix-l-crafters/pocket-draw/commit/c7570513d008fa19bab23f77b8dae7e53d0a8fad)) - MRDGH2821
- **(duel)** add ping-pong clock-offset calibration for reaction timing - ([85b26e2](https://github.com/pix-l-crafters/pocket-draw/commit/85b26e2e139c2d5a35fcd55e401764164bd718fc)) - MRDGH2821
- **(duel)** enforce three-round point-sum matches - ([7590fed](https://github.com/pix-l-crafters/pocket-draw/commit/7590fed2a5f3254e8070d08ca7b3985d8cac9a9c)) - wutianze3
- **(duel)** audible/mutable buzz cue, tap-to-fire, instructions, reconnect state - ([3b78aed](https://github.com/pix-l-crafters/pocket-draw/commit/3b78aedacaea13b1ab0230a0cdede091af77153a)) - Mobark Bacran
- **(duel)** add placeholder countdown audio asset - ([e123214](https://github.com/pix-l-crafters/pocket-draw/commit/e1232147b735d1b4bbc2eecaa9e0ddb6a208ba21)) - Mobark Bacran
- **(duel)** swap placeholder countdown audio to mp3 - ([db82a70](https://github.com/pix-l-crafters/pocket-draw/commit/db82a707e7f77d2b6f62d657ff9a070b86e84ad1)) - Mobark Bacran
- **(duel)** add local WebRTC duel transport - ([34c8b5e](https://github.com/pix-l-crafters/pocket-draw/commit/34c8b5e7a4bf1dcb4cdf3a27adaf8b4561420105)) - tingyueh
- **(firebase)** add match results write path and offline queue - ([8d6e9df](https://github.com/pix-l-crafters/pocket-draw/commit/8d6e9dfa950a401afd5d6a1abd88c3299abfd027)) - MRDGH2821
- **(firebase)** add match results write path and offline queue - ([bba3c21](https://github.com/pix-l-crafters/pocket-draw/commit/bba3c212826f4f568f40c9312a9b68a3ac3e2558)) - MRDGH2821
- **(firebase)** add users/{uid} profile directory for name lookups - ([f49f75c](https://github.com/pix-l-crafters/pocket-draw/commit/f49f75c38c566e9bbee483b1d8314b1b5fe287b4)) - Mobark Bacran
- **(firebase)** compute leaderboard rankings from matchResults - ([5c30a34](https://github.com/pix-l-crafters/pocket-draw/commit/5c30a3415944f98e84b2f1157e09aed91ed5fe16)) - Mobark Bacran
- **(map)** add map screen with mock player markers - ([846eff6](https://github.com/pix-l-crafters/pocket-draw/commit/846eff6ce9ae55950e39bf2230024dddff77d097)) - Ethan
- **(map)** add foreground location and permission handling - ([44a6882](https://github.com/pix-l-crafters/pocket-draw/commit/44a688263080b8e5b0229b6be18259e2cfa483c3)) - Ethan
- **(map)** show other players from Firestore presence - ([debee4d](https://github.com/pix-l-crafters/pocket-draw/commit/debee4d4b2e7970e08f7be0776bab3e5a887a970)) - Ethan
- **(map)** publish location continuously with heartbeat and retry - ([d5defcd](https://github.com/pix-l-crafters/pocket-draw/commit/d5defcdd4f6fc21ac9e52890845904eadebb5da8)) - Ethan
- **(map)** privacy toggle for location sharing - ([c8cb729](https://github.com/pix-l-crafters/pocket-draw/commit/c8cb729acfaa38caca92eed53ca83f153599fd5f)) - Ethan
- **(map)** player stats popup on pin tap - ([1f5c359](https://github.com/pix-l-crafters/pocket-draw/commit/1f5c359ae5366b72360320659e1601879040bbe4)) - Ethan
- **(mise)** add design-system dependencies and token file - ([b6b1094](https://github.com/pix-l-crafters/pocket-draw/commit/b6b10942f947e2b8562a6ecf37cebcef13659c29)) - Mobark Bacran
- **(profile)** add the profile and settings screen - ([784520a](https://github.com/pix-l-crafters/pocket-draw/commit/784520a41c1f6e44f33bde08ab010cc0de394ae4)) - Ethan
- **(qr)** rebase QR invite payload/validation onto design-system baseline - ([ccda3e7](https://github.com/pix-l-crafters/pocket-draw/commit/ccda3e7cb26db44506cd153662ed5c6e32b40a2f)) - tingyueh
- **(qr)** add QR display, scanner, and opponent popup screens - ([4474d05](https://github.com/pix-l-crafters/pocket-draw/commit/4474d05244796828e1c38718ce99b29b8d29004d)) - tingyueh
- **(qr)** add round-count selector - ([9c39670](https://github.com/pix-l-crafters/pocket-draw/commit/9c39670ed0e8764aa7a9d7044efa2d90ddd6a080)) - tingyueh
- **(qr)** add shared Wi-Fi connection flow - ([2927f5e](https://github.com/pix-l-crafters/pocket-draw/commit/2927f5e064a73260220daefca8b4a8f06de1c7f0)) - tingyueh
- **(qr)** add hotspot connection flow - ([dc156ba](https://github.com/pix-l-crafters/pocket-draw/commit/dc156ba7c02f416e4b8e1392689992bed62f8ac4)) - tingyueh
- init Expo React Native app - ([f09d075](https://github.com/pix-l-crafters/pocket-draw/commit/f09d0755566cf42cb72287d4ea2bd342f89e7f23)) - tingyueh
- add expo-dev-client for custom native module support - ([172817a](https://github.com/pix-l-crafters/pocket-draw/commit/172817aac1d0c982a8647b0419678323f1454c89)) - tingyueh
- set up Firebase services - ([f278c3d](https://github.com/pix-l-crafters/pocket-draw/commit/f278c3d470b1a9a027d1a7c1eacfb5bf5d881b52)) - Ethan
- add Firebase auth service - ([c22f724](https://github.com/pix-l-crafters/pocket-draw/commit/c22f724d3e8f6a08427344559be290bccb7ec667)) - wutianze3
- implement LoginScreen with email and password fields - ([5b8d3dc](https://github.com/pix-l-crafters/pocket-draw/commit/5b8d3dcc34d2e709f2782260391db2f9709bff5b)) - wutianze3
- implement user registration screen - ([b8eb5e6](https://github.com/pix-l-crafters/pocket-draw/commit/b8eb5e658bbec5ac10eee84efd37394db4866d07)) - wutianze3
- add login screen - ([be924f0](https://github.com/pix-l-crafters/pocket-draw/commit/be924f0dcdf49afcbe45c68bac9904565dbe19c5)) - wutianze3
- improve Firebase authentication UI - ([7677bf3](https://github.com/pix-l-crafters/pocket-draw/commit/7677bf3907942908f6ac41d8c0a815c35cdde725)) - wutianze3
- publish authenticated player presence - ([6686dac](https://github.com/pix-l-crafters/pocket-draw/commit/6686dac3969cc8a89df4321fb438d7ff2c89b521)) - Ethan
- add bluetooth demo - ([0f4e241](https://github.com/pix-l-crafters/pocket-draw/commit/0f4e241cfbcbc52928202b0d96920377cc8218e7)) - hbeat
- add expo mcp & skills - ([fdfd4d1](https://github.com/pix-l-crafters/pocket-draw/commit/fdfd4d172dcac4abc7540e1bdff0974c4a2b2742)) - MRDGH2821
- add claude target - ([a194840](https://github.com/pix-l-crafters/pocket-draw/commit/a194840a320ee9bba16b26aeb712417b67fa9dd9)) - MRDGH2821
- add BLE scanner screen and view switcher - ([4b750a8](https://github.com/pix-l-crafters/pocket-draw/commit/4b750a8f0b99b4d6a26ac0007892567bc3990c10)) - MRDGH2821
- add CutCornerSurface and CutCornerButton components - ([3c82b0b](https://github.com/pix-l-crafters/pocket-draw/commit/3c82b0bdcab6074ecabfe8b1b0a6618670c2ba94)) - Mobark Bacran
- add KickerLabel, DisplayHeading, and ScreenHeader components - ([c7d364d](https://github.com/pix-l-crafters/pocket-draw/commit/c7d364d47caae0decb0efa1ef8f984e78e56f6ee)) - Mobark Bacran
- add StatTile and StatusTag components - ([ea7d751](https://github.com/pix-l-crafters/pocket-draw/commit/ea7d751009f4013d76dccc8e43b49bd3e960a8cf)) - Mobark Bacran
- rebuild appTheme as a dark theme from design tokens - ([9e8b563](https://github.com/pix-l-crafters/pocket-draw/commit/9e8b563c812d981d3e9dba25fe4d331b3f36ed1a)) - Mobark Bacran
- load design-system fonts, wrap every screen in PaperProvider - ([9ede814](https://github.com/pix-l-crafters/pocket-draw/commit/9ede814774b931714576a2ca08d020af30d926e5)) - Mobark Bacran
- rebuild LoginScreen on the shared design system - ([8e94b54](https://github.com/pix-l-crafters/pocket-draw/commit/8e94b549234df2fe83c30168deb614c61e2df924)) - Mobark Bacran
- rebuild RegisterScreen on the shared design system - ([5698fd2](https://github.com/pix-l-crafters/pocket-draw/commit/5698fd2450d7891b5f535b3ab4e4001ea66732c1)) - Mobark Bacran
- switch MapScreen and BleScreen to the dark theme - ([baa47f9](https://github.com/pix-l-crafters/pocket-draw/commit/baa47f93f50a9e1ad0c3f432da759e2f57bdefb5)) - Mobark Bacran
- add shared contracts and mocks for cross-person dependencies - ([f69dcf8](https://github.com/pix-l-crafters/pocket-draw/commit/f69dcf8b489325b065455d1670db3650f547c562)) - Mobark Bacran

### Miscellaneous Chores

- **(cocogitto)** bump app version together - ([f840db4](https://github.com/pix-l-crafters/pocket-draw/commit/f840db45c12d578af0c9d2976ded569634f32d0b)) - MRDGH2821
- **(cocogitto)** fix broken release hooks and add feature scopes - ([00fc1bd](https://github.com/pix-l-crafters/pocket-draw/commit/00fc1bd939c5fb41621dd8871efaec4f3b8f39cf)) - Mobark Bacran
- **(cocogitto)** add profile commit scope - ([0490f04](https://github.com/pix-l-crafters/pocket-draw/commit/0490f046aff16c11a78a23a7c556f0b313cb3192)) - Ethan
- **(copier)** initialise template - ([6181357](https://github.com/pix-l-crafters/pocket-draw/commit/61813576414e9fe5fd046a8790348aae2fa8f42f)) - MRDGH2821
- **(copier)** update template - ([fd797e0](https://github.com/pix-l-crafters/pocket-draw/commit/fd797e0644cd8660eda452b9a6daf3f30b1c2053)) - MRDGH2821
- **(copier)** update template - ([353f146](https://github.com/pix-l-crafters/pocket-draw/commit/353f1467fc317cc32777f020e6d86f2fa4a90105)) - MRDGH2821
- **(copier)** update template - ([da97ec7](https://github.com/pix-l-crafters/pocket-draw/commit/da97ec7db9274d8def756b8fd523beb2d45f4842)) - MRDGH2821
- **(copier)** update template - ([c6cb56c](https://github.com/pix-l-crafters/pocket-draw/commit/c6cb56ca463d31f25837e659b7f2ef23d25a4a8e)) - MRDGH2821
- **(copier)** update template - ([eb008fd](https://github.com/pix-l-crafters/pocket-draw/commit/eb008fd2b91d933a7661f41ef4e864c603ecfea6)) - MRDGH2821
- **(copier)** update template - ([11e5fde](https://github.com/pix-l-crafters/pocket-draw/commit/11e5fde2fece4a29d0524a30b747f18031370f61)) - MRDGH2821
- **(copier)** update template - ([c91b7ff](https://github.com/pix-l-crafters/pocket-draw/commit/c91b7ff3057eb7c6a2f2055c46799a6b9fc308e0)) - MRDGH2821
- **(copier)** update template - ([6a26fda](https://github.com/pix-l-crafters/pocket-draw/commit/6a26fda0d98cf175af77692d86850aa8afca3c28)) - MRDGH2821
- **(copier)** update template - ([572a573](https://github.com/pix-l-crafters/pocket-draw/commit/572a5739a6249205e3053f9a4fc942f4db715c90)) - MRDGH2821
- **(copier)** update template & lock files - ([259a1c3](https://github.com/pix-l-crafters/pocket-draw/commit/259a1c36bd95a8db605affa3149784fb58595906)) - MRDGH2821
- **(copier)** update template - ([a2b2722](https://github.com/pix-l-crafters/pocket-draw/commit/a2b27221bd14ec571ac3b5e9757a60361fae33f9)) - MRDGH2821
- **(copier)** update template - ([bbc339a](https://github.com/pix-l-crafters/pocket-draw/commit/bbc339aa1509cd51afd637535d3687615bfde635)) - MRDGH2821
- **(cspell)** add words - ([83b1edd](https://github.com/pix-l-crafters/pocket-draw/commit/83b1edd9232830ef658de228f343eeb056a60526)) - MRDGH2821
- **(cspell)** update word list - ([e1a3974](https://github.com/pix-l-crafters/pocket-draw/commit/e1a39745a802d24dadbf4ccdaa4edcae89004eed)) - MRDGH2821
- **(cspell)** ignore fnox - ([156a2c3](https://github.com/pix-l-crafters/pocket-draw/commit/156a2c33c5988112a5e00fd56fdde397feb594ab)) - MRDGH2821
- **(duel)** merge latest dev - ([45afeb5](https://github.com/pix-l-crafters/pocket-draw/commit/45afeb5ce2518e164101ab016bac7b569b8c85da)) - wutianze3
- **(duel)** merge latest dev for pull request - ([580d858](https://github.com/pix-l-crafters/pocket-draw/commit/580d858bd5e7547eb1d8203d8e0be956b4b53bb7)) - wutianze3
- **(expo)** use a real iOS bundle identifier - ([5edeb37](https://github.com/pix-l-crafters/pocket-draw/commit/5edeb37dd72d5803a40745cad531cb70f189c1b6)) - Ethan
- **(expo)** exclude apm_modules from tsc - ([06c9e3f](https://github.com/pix-l-crafters/pocket-draw/commit/06c9e3f4873bf1764d1cfb83bd075ac8015d9b5d)) - Ethan
- **(expo)** move the bundle identifier off com.anonymous - ([4cab654](https://github.com/pix-l-crafters/pocket-draw/commit/4cab6541690c3fc8430138f94a94dc46246fe7f7)) - Mobark Bacran
- **(map)** merge origin/dev into marker fix - ([891a223](https://github.com/pix-l-crafters/pocket-draw/commit/891a223624d34f5fd4c3fb969312dc32bc82a863)) - Ethan
- **(megalinter)** apply linters fixes - ([321195f](https://github.com/pix-l-crafters/pocket-draw/commit/321195f350425b572a160356166f8d0382721caa)) - tingyueh
- **(megalinter)** apply fixes - ([f1eb994](https://github.com/pix-l-crafters/pocket-draw/commit/f1eb99435e27c86f1a00d9c05c5177dc4fc4cbc1)) - MRDGH2821
- **(mise)** set ITSAppUsesNonExemptEncryption to false - ([d7f39ad](https://github.com/pix-l-crafters/pocket-draw/commit/d7f39ad78bd6d765dfbc457e9d3e15a84c65e88c)) - Mobark Bacran
- **(mise)** set ITSAppUsesNonExemptEncryption to false - ([54faeb6](https://github.com/pix-l-crafters/pocket-draw/commit/54faeb62bdeafdd5bc9bc105fb79956f873b3f2c)) - Mobark Bacran
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
- merge latest dev and integrate Firebase authentication - ([bfb19ac](https://github.com/pix-l-crafters/pocket-draw/commit/bfb19acb062a99c590ba222c9c98e0449bd3464c)) - MRDGH2821
- merge pull request #7 from pix-l-crafters/firebase-auth - ([cb12a62](https://github.com/pix-l-crafters/pocket-draw/commit/cb12a62f29b7fcf7084aeacbe568f5c5b974e492)) - Ethan
- regenrate apm.lock.yaml - ([949b0c9](https://github.com/pix-l-crafters/pocket-draw/commit/949b0c9b981ed05774b2a4175735b88a4841f9a2)) - MRDGH2821
- link EAS project (pix-l-crafters/pocket-draw) - ([73db88c](https://github.com/pix-l-crafters/pocket-draw/commit/73db88c721287a2ef735a8d3d7cf9212ce3bdcbc)) - Mobark Bacran
- merge pull request #15 from pix-l-crafters/mobark/chore/cog-scopes-rebased - ([0b23bbd](https://github.com/pix-l-crafters/pocket-draw/commit/0b23bbd739769e182b7f4ba4f1a5fcdfa04e9b09)) - Mihir Rabade
- merge pull request #16 from pix-l-crafters/mobark/docs/map-duel-design-rebased - ([4f828e9](https://github.com/pix-l-crafters/pocket-draw/commit/4f828e9cf640be7a8f2930a1d97a30e750e410d7)) - Mihir Rabade
- merge branch 'mobark/merge-branches' into mobark/docs/changelog-rebased - ([299ce93](https://github.com/pix-l-crafters/pocket-draw/commit/299ce9365aad5e739ffe135ba545682663841755)) - Mihir Rabade
- merge pull request #17 from pix-l-crafters/mobark/docs/changelog-rebased - ([0bb582f](https://github.com/pix-l-crafters/pocket-draw/commit/0bb582f6e1a9779b2f91a244afc5f35a22c1b2af)) - Mihir Rabade
- link EAS project (pix-l-crafters/pocket-draw) - ([f6d2b07](https://github.com/pix-l-crafters/pocket-draw/commit/f6d2b07b63557d77de19ee959f60c3d65344657a)) - Mobark Bacran
- merge pull request #19 from pix-l-crafters/mobark/receive-branches - ([aaefa43](https://github.com/pix-l-crafters/pocket-draw/commit/aaefa4363b613bb5e230df8587f95f02a30ca5da)) - Mihir Rabade
- merge branch 'dev-fixed' into mihir/feat/secrets-setup-rebased - ([76cf751](https://github.com/pix-l-crafters/pocket-draw/commit/76cf7515806474376cb22e4f81274bd6de36260f)) - MRDGH2821
- pin apm to v0.28 - ([21af1b2](https://github.com/pix-l-crafters/pocket-draw/commit/21af1b20a415685c5035725e48b42ff47f5d0fcc)) - MRDGH2821
- remove apm.lock.yaml - ([238985d](https://github.com/pix-l-crafters/pocket-draw/commit/238985da7e901b4e76b79edc6f14d6faa8c6be65)) - MRDGH2821
- merge pull request #21 from pix-l-crafters/moby/dex-fixes - ([f1ad4d8](https://github.com/pix-l-crafters/pocket-draw/commit/f1ad4d8391d14f2154349a617f0697e76f250acb)) - Mobark Bacran
- merge pull request #22 from pix-l-crafters/mihir/fix-dev-env - ([4359414](https://github.com/pix-l-crafters/pocket-draw/commit/4359414b3faefe007e2e251c830335e51a2f2cab)) - Mihir Rabade
- merge pull request #24 from pix-l-crafters/mihir/fix-dev-env - ([34bcb0d](https://github.com/pix-l-crafters/pocket-draw/commit/34bcb0de46b7958d6035cfc7ffd945f94bc6c4c1)) - Mihir Rabade
- Merge pull request #25 from pix-l-crafters/tingyue/feat/qr-challenge - ([5615ac8](https://github.com/pix-l-crafters/pocket-draw/commit/5615ac8709e174bab712a79f4c36c4d59ad1497c)) - Mobark Bacran
- merge mihir/feat/match-results-backend into integration branch - ([6c46148](https://github.com/pix-l-crafters/pocket-draw/commit/6c461486e3abbb4de00638ca9f2df193ebbd6f82)) - MRDGH2821
- merge origin/dev into sihengma/map - ([8192cfd](https://github.com/pix-l-crafters/pocket-draw/commit/8192cfd082823e96e3d346ac624b42ed252d4a4e)) - Ethan
- merge sihengma/map into integration branch - ([a1c03cb](https://github.com/pix-l-crafters/pocket-draw/commit/a1c03cb14e0893e45329ceef812e638b4579ce72)) - MRDGH2821
- merge tanachat/feat/duel-pre-round-ritual into integration branch - ([0ec2593](https://github.com/pix-l-crafters/pocket-draw/commit/0ec25935fe8d6e201616018a5a1d97cd318d8ce9)) - MRDGH2821
- merge tianze/feat/duel-fire-detection into integration branch - ([2f5c18e](https://github.com/pix-l-crafters/pocket-draw/commit/2f5c18ead5b7c6533d36eef79533dfb8326c532c)) - MRDGH2821
- merge mobark/feat/postmatch-summary into integration branch - ([f731164](https://github.com/pix-l-crafters/pocket-draw/commit/f731164107db73615f85de9ee236d84fc24db076)) - MRDGH2821
- sort package.json - ([c9069ae](https://github.com/pix-l-crafters/pocket-draw/commit/c9069ae78554e357e904fb8f81d8fe3de63462f9)) - Mobark Bacran
- merge mihir/feat/match-results-backend into moby/chore/merge-2026-09-10 - ([9e26056](https://github.com/pix-l-crafters/pocket-draw/commit/9e26056337591f387578cb37126b0c6c9b4fb028)) - Mobark Bacran
- merge sihengma/map (#28) into moby/chore/merge-2026-09-10 - ([252deed](https://github.com/pix-l-crafters/pocket-draw/commit/252deed6efdfb3e4e2d02b08c8bc1aa82c7fe421)) - Mobark Bacran
- merge mobark/feat/postmatch-summary (#26) into moby/chore/merge-2026-09-10 - ([23e5c39](https://github.com/pix-l-crafters/pocket-draw/commit/23e5c393ab3c5220e2333510ed0c07ea3bfc0894)) - Mobark Bacran
- merge tianze/feat/duel-fire-detection (#30) into moby/chore/merge-2026-09-10 - ([6c744d6](https://github.com/pix-l-crafters/pocket-draw/commit/6c744d68e2c9d78fb60d56d40983d553ab3bbb11)) - Mobark Bacran
- fix skills path of expo - ([aa118f9](https://github.com/pix-l-crafters/pocket-draw/commit/aa118f9f851237f25be4ae173fd761f8578ddf66)) - MRDGH2821
- mark stale moby/chore/merge-2026-09-10 as merged, keep no content - ([e82c9a8](https://github.com/pix-l-crafters/pocket-draw/commit/e82c9a887c809283d25580e00fcfde8f58b78d07)) - MRDGH2821
- move paad review reports into docs/paad - ([ed56beb](https://github.com/pix-l-crafters/pocket-draw/commit/ed56bebf70afdce4ea2af3f6d3ca334e4105aea1)) - MRDGH2821
- add expo plugin - ([4ef0364](https://github.com/pix-l-crafters/pocket-draw/commit/4ef03646052d48d896cd71961f52afa752c2b303)) - MRDGH2821
- merge pull request #33 from pix-l-crafters/mihir/docs/product-design - ([b1a3406](https://github.com/pix-l-crafters/pocket-draw/commit/b1a340655eca150dfa5ee051b875765294739a4b)) - Mihir Rabade
- merge pull request #55 from pix-l-crafters/mihir/chore/docs-and-template - ([aca09e4](https://github.com/pix-l-crafters/pocket-draw/commit/aca09e46ab08c62c835cec34a67bc41c88457a7a)) - Mihir Rabade
- merge remote-tracking branch 'origin/sihengma/fix/android-map-key' into mobark/feat/merge-test - ([0519de2](https://github.com/pix-l-crafters/pocket-draw/commit/0519de25d3380eea0e4bd1f0d7aece181967b838)) - Mobark Bacran
- merge remote-tracking branch 'origin/mihir/chore/update-dev-env' into mobark/feat/merge-test - ([65aa8e0](https://github.com/pix-l-crafters/pocket-draw/commit/65aa8e016636cea1850a0b70f6afd1e1831d41cf)) - Mobark Bacran
- merge remote-tracking branch 'origin/sihengma/feat/user-profile' into mobark/feat/merge-test - ([ea7c119](https://github.com/pix-l-crafters/pocket-draw/commit/ea7c11947bd0f2a4a6d06568deadeb3093daaa3a)) - Mobark Bacran
- merge pull request #56 from pix-l-crafters/mihir/chore/update-dev-env - ([ae78377](https://github.com/pix-l-crafters/pocket-draw/commit/ae783773fb0863bc0366dea7d56f4a7f56f9cf33)) - Mihir Rabade
- merge branch 'dev' into mobark/feat/merge-test - ([6558ee3](https://github.com/pix-l-crafters/pocket-draw/commit/6558ee305d7195ad0c050220228f1ebe016b2850)) - Mobark Bacran
- merge pull request #57 from pix-l-crafters/mobark/feat/merge-test - ([9b0f111](https://github.com/pix-l-crafters/pocket-draw/commit/9b0f1119e262243d0f2a38b28d59efbcfe2d6fdb)) - Mobark Bacran
- Merge remote-tracking branch 'origin/mihir/feat/zone-sensor-integration' into mobark/chore/branch-integration - ([afe859b](https://github.com/pix-l-crafters/pocket-draw/commit/afe859b03b685bbf3e98512b332c6addb8f707d6)) - Mobark Bacran
- Merge remote-tracking branch 'origin/MRDGH2821/feat/clock-offset-calibration-for-reaction-timing' into mobark/chore/branch-integration - ([b1bd577](https://github.com/pix-l-crafters/pocket-draw/commit/b1bd57712568c2963297b5eb899923aaffca38a8)) - Mobark Bacran
- Merge remote-tracking branch 'origin/sihengma/fix/android-map-key' into mobark/chore/branch-integration - ([df441db](https://github.com/pix-l-crafters/pocket-draw/commit/df441dbe4c2c18c666f8cd73d57bfac08d38316e)) - Mobark Bacran
- Merge remote-tracking branch 'origin/tianze/feat/match-structure' into mobark/chore/branch-integration - ([a91ca30](https://github.com/pix-l-crafters/pocket-draw/commit/a91ca3067933f9855782d8d6bf6622f2b2834f5a)) - Mobark Bacran
- cleaned up conflict - ([0521dc4](https://github.com/pix-l-crafters/pocket-draw/commit/0521dc45abefc8e5f7a8e39f4d385998905568a8)) - Mobark Bacran
- merge tingyueh/feat/webrtc-connectivity (#45-47) into branch-integration - ([58fb738](https://github.com/pix-l-crafters/pocket-draw/commit/58fb73863793d246fb94057ed01a8444ca9eeafa)) - Mobark Bacran
- merge branch 'mobark/chore/branch-integration' into mihir/fix/android-build - ([1296312](https://github.com/pix-l-crafters/pocket-draw/commit/12963120546712e503323248b68804d25bfc987d)) - MRDGH2821
- merge pull request #74 from pix-l-crafters/tingyueh/fix/phone-connection - ([7ea5ebd](https://github.com/pix-l-crafters/pocket-draw/commit/7ea5ebdf8b1dec63b35baebee79dc3dd0c47ae49)) - Mihir Rabade
- merge pull request #77 from pix-l-crafters/mihir/fix/deps - ([9f76a21](https://github.com/pix-l-crafters/pocket-draw/commit/9f76a21568e117c9b1145a7ad11d80f5a54384e6)) - Mihir Rabade
- merge pull request #78 from pix-l-crafters/mihir/chore/update-dev-env - ([a5a05f7](https://github.com/pix-l-crafters/pocket-draw/commit/a5a05f75fd882d9d540e3991583fcef3de7c3da9)) - Mihir Rabade
- merge branch 'dev' into mihir/build/update-deps - ([8db2886](https://github.com/pix-l-crafters/pocket-draw/commit/8db2886b32a2f1d2b36dfdc741ffea3f1efb7c82)) - MRDGH2821
- ignore ios local build app files - ([f36c78d](https://github.com/pix-l-crafters/pocket-draw/commit/f36c78d7e9497e14ab3051b28c632b82813da9e1)) - Mobark Bacran
- ignore lock files from formatting - ([e5db327](https://github.com/pix-l-crafters/pocket-draw/commit/e5db327857a151fd2a1812e36582eb90a63bff78)) - MRDGH2821
- ignore android build artifacts - ([3f270dd](https://github.com/pix-l-crafters/pocket-draw/commit/3f270dd84b4e7d7a2a9021acf3e4ce6f6fcfe337)) - MRDGH2821

### Refactoring

- **(app)** rewire tabs around the profile screen - ([8172f5a](https://github.com/pix-l-crafters/pocket-draw/commit/8172f5aa2160ee283da262f0a2dbfa1d9628481f)) - Ethan
- **(duel)** extract scoreFromRounds for the match summary screen - ([211ed26](https://github.com/pix-l-crafters/pocket-draw/commit/211ed26c6468ac1692d20ed2873cdb048412651a)) - Mobark Bacran
- **(map)** adopt React Native Paper UI components - ([fd3161e](https://github.com/pix-l-crafters/pocket-draw/commit/fd3161eaa390a130de835beda4def7dd978af1a4)) - Ethan
- **(qr)** stop pre-deciding roundCount in the scan handoff - ([5c2a946](https://github.com/pix-l-crafters/pocket-draw/commit/5c2a9462ac19ce6fd6c13e3e7d6040ce31798708)) - tingyueh

### Revert

- **(duel)** restore original countdown audio, trim broke playback - ([78d643c](https://github.com/pix-l-crafters/pocket-draw/commit/78d643c1f702be6cc4e3047926a622828ce273c2)) - Mobark Bacran

### Style

- format files - ([820de99](https://github.com/pix-l-crafters/pocket-draw/commit/820de99a6d71c470f24041fd25da35402166d42d)) - MRDGH2821
- format files - ([58efa4f](https://github.com/pix-l-crafters/pocket-draw/commit/58efa4f769d79b63cc568c8168218c8aaef511da)) - MRDGH2821
- format file - ([12121e6](https://github.com/pix-l-crafters/pocket-draw/commit/12121e6ec9a47effff69c8f1a38d8d0bd25452de)) - MRDGH2821
- format file - ([7038947](https://github.com/pix-l-crafters/pocket-draw/commit/7038947e7d51784cd6f07e1e4e042a327c10577f)) - MRDGH2821
- format files - ([96fb6d5](https://github.com/pix-l-crafters/pocket-draw/commit/96fb6d58f662140eaf75cdff2659504cf5eee657)) - MRDGH2821
- format files - ([630a5d7](https://github.com/pix-l-crafters/pocket-draw/commit/630a5d7c777c678e2cc4ba85a07d553d6c39e0a1)) - MRDGH2821
- format files - ([5207310](https://github.com/pix-l-crafters/pocket-draw/commit/520731051b255d2f9ab75f6d1a665b194783b5c6)) - MRDGH2821
- format files - ([bfbd4bd](https://github.com/pix-l-crafters/pocket-draw/commit/bfbd4bd5833796664108d95099f5982181200514)) - MRDGH2821
- format files - ([181c3c0](https://github.com/pix-l-crafters/pocket-draw/commit/181c3c03c54d30f2f6b74213cce43de1811794d2)) - MRDGH2821
- format files - ([84dff20](https://github.com/pix-l-crafters/pocket-draw/commit/84dff2078a300981dfb2dcf8745371855178417d)) - Mobark Bacran

### Tests

- **(qr)** add round-count selector tests - ([903b387](https://github.com/pix-l-crafters/pocket-draw/commit/903b38741a96e1d6cb94859fd63d3fd631ca2627)) - tingyueh

### Build

- **(expo)** configure audio plugin - ([926302c](https://github.com/pix-l-crafters/pocket-draw/commit/926302c17ff7fd906df7af0fe6132c105e33f936)) - hbeat
- **(expo)** align dependencies to sdk 54 - ([253aa25](https://github.com/pix-l-crafters/pocket-draw/commit/253aa254b0530890bf69bacbf7f44a2b6790de2f)) - Mobark Bacran
- **(mise)** auto install skills - ([fe8cb1e](https://github.com/pix-l-crafters/pocket-draw/commit/fe8cb1e99997159b3aae5895158898415dfd871d)) - MRDGH2821
- **(mise)** update lock file - ([b908ab3](https://github.com/pix-l-crafters/pocket-draw/commit/b908ab3f51f8f2e1aacec32cb6e65bbad17bea44)) - MRDGH2821
- **(mise)** add gradle - ([fa6937d](https://github.com/pix-l-crafters/pocket-draw/commit/fa6937dc159df77745cf45df69baef71c5a93cd9)) - MRDGH2821
- **(mise)** update lock files - ([91b93c9](https://github.com/pix-l-crafters/pocket-draw/commit/91b93c9658937373203bac7849d4a94d0d5730b1)) - MRDGH2821
- **(mise)** remove redundant stuff & update lock files - ([361afec](https://github.com/pix-l-crafters/pocket-draw/commit/361afec871ceddcc2338c18dbc8e7e5d48ce258a)) - Mobark Bacran
- **(mise)** add local build commands - ([fb63ecb](https://github.com/pix-l-crafters/pocket-draw/commit/fb63ecb134f49d328c53bb6422d61ed359716c84)) - Mobark Bacran
- **(mise)** fix build commands - ([0e26b8d](https://github.com/pix-l-crafters/pocket-draw/commit/0e26b8dacf74a5b3e38897c5acc9db95597c9357)) - Mobark Bacran
- add missing tools - ([9571af1](https://github.com/pix-l-crafters/pocket-draw/commit/9571af1dc5295d08aa48547481b8de5643caddd0)) - hbeat
- fix scripts & dependencies - ([17fc9e1](https://github.com/pix-l-crafters/pocket-draw/commit/17fc9e1d6ac00a869035398501398c1eafd29481)) - MRDGH2821
- fix dependencies and add scripts - ([99b7e5c](https://github.com/pix-l-crafters/pocket-draw/commit/99b7e5cfedaa477980f96713054fad7d95461b5c)) - MRDGH2821
- update lock files - ([3741a87](https://github.com/pix-l-crafters/pocket-draw/commit/3741a87287695ea953b27940cdda44495227d63a)) - MRDGH2821
- update package-lock.json - ([46f98b3](https://github.com/pix-l-crafters/pocket-draw/commit/46f98b379b4c8604b5b18e05489eb24961d41436)) - MRDGH2821
- update package-lock.json - ([64bf50b](https://github.com/pix-l-crafters/pocket-draw/commit/64bf50bfb25a0d4a85a0afad068f8d32a4140e85)) - MRDGH2821
- add fnox - ([496f06e](https://github.com/pix-l-crafters/pocket-draw/commit/496f06e884dcff41cbb98ba53afc1e51ec6995a6)) - MRDGH2821
- add secrets in fnox - ([ac3f5e6](https://github.com/pix-l-crafters/pocket-draw/commit/ac3f5e6db1d451e2836397208a4f7911f3c15a71)) - MRDGH2821
- regenerate lock file - ([a1b69e0](https://github.com/pix-l-crafters/pocket-draw/commit/a1b69e0be8a0dbaedb5987c2f994a49df47a2a72)) - Mobark Bacran
- restrict treefmt to linux & macos - ([7433ab9](https://github.com/pix-l-crafters/pocket-draw/commit/7433ab9dd864d419da5354af4b1cdf1f9643875e)) - MRDGH2821
- add all public keys of members - ([9c483b0](https://github.com/pix-l-crafters/pocket-draw/commit/9c483b09aa5c821102fb59fb0bc3f6a4369d478f)) - MRDGH2821
- pin hk version - ([f345edc](https://github.com/pix-l-crafters/pocket-draw/commit/f345edc594c169e10a9a6a7bf1d748ddf534dcb3)) - MRDGH2821
- add expo mcp env var - ([a86e865](https://github.com/pix-l-crafters/pocket-draw/commit/a86e86576fc3fab83dba00dcaddc9d7abae8291d)) - MRDGH2821
- regenerate lock files - ([ce33a08](https://github.com/pix-l-crafters/pocket-draw/commit/ce33a08968a271dbc172163dbfc96630c503d5aa)) - MRDGH2821
- reinstall all dependencies - ([381d69e](https://github.com/pix-l-crafters/pocket-draw/commit/381d69e0691704b426f9f08e71d82038fff705f4)) - MRDGH2821
- downgrade typescript to 6.0.3 - ([9788d9f](https://github.com/pix-l-crafters/pocket-draw/commit/9788d9f6651eb49c6bce2b644ec5fe457979e990)) - Mobark Bacran
- update lock file - ([6e13426](https://github.com/pix-l-crafters/pocket-draw/commit/6e13426ab2a96a629aa9c9b9bbe87200f142afd9)) - MRDGH2821
- fix packages - ([da65e07](https://github.com/pix-l-crafters/pocket-draw/commit/da65e079017734bafdbaa2e32b5087037b018937)) - Mobark Bacran
- update mise.lock - ([14b58e9](https://github.com/pix-l-crafters/pocket-draw/commit/14b58e93702b181d4719be20d143800dc60944e3)) - Mobark Bacran
- update lock file - ([c6ebc05](https://github.com/pix-l-crafters/pocket-draw/commit/c6ebc05f4d8bbaa756241ba245d4d0c66ba5a7b2)) - Mobark Bacran
- add expo vector icons - ([6bcaab4](https://github.com/pix-l-crafters/pocket-draw/commit/6bcaab4d7d961f54eb7edc28fbdc4b3c3ff3469e)) - MRDGH2821
- downgrade packages - ([fb85350](https://github.com/pix-l-crafters/pocket-draw/commit/fb853504a3f06babdc8a81fc90ca03ddc44fd6dd)) - Mobark Bacran
- revert deps to last working version - ([2ad2564](https://github.com/pix-l-crafters/pocket-draw/commit/2ad2564289df9fb658c1dbd286551b99243958b4)) - Mobark Bacran

### Ci

- add react ci - ([7846f72](https://github.com/pix-l-crafters/pocket-draw/commit/7846f72473b2d5ed90e070d756de5be7bafb501a)) - wutianze3

<!-- generated by git-cliff -->
