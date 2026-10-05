# Pocket Draw PR 与成员贡献汇总

更新时间：2026-09-14 17:50 AEST

## 1. 调查范围与判断标准

本报告整理 `pix-l-crafters/pocket-draw` 的 PR #1–#30，以及截至更新时间已经推送、但尚未出现在这些 PR 引用中的工作分支。

主要证据来源：

- GitHub 的真实 PR head refs：`refs/pull/1/head` 至 `refs/pull/30/head`。
- GitHub 当前提供的 PR merge refs：#26、#27、#28、#30。
- `origin/dev`、各成员远程分支、merge commit、commit 作者及文件差异。
- 仓库中的 `docs/task-splits/`、集成分支中的 `docs/task-splits-v2/` 和 `.agents/logs/`。
- PR 链接：<https://github.com/pix-l-crafters/pocket-draw/pulls>。

说明：本机 GitHub CLI 的登录令牌已经失效，因此无法可靠读取私有仓库的实时 reviewer、approval、closed reason 和 PR 描述。本报告只把 Git refs 能确认的事实写成确定状态；无法确认的状态会明确标注。合并者不等于代码作者，贡献归属以 PR head 中的原创提交和文件为主。

## 2. 当前项目状态

| 层级             | 当前状态                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `origin/dev`     | 截止 PR [#25](https://github.com/pix-l-crafters/pocket-draw/pull/25)，包含设计系统、Firebase/Auth、基础地图/BLE、共享 contracts 和 QR 挑战流程 3.1–3.3 |
| PR #26–#30       | 功能代码已经分别完成，但没有直接进入当前 `origin/dev`                                                                                                  |
| 集成分支         | `origin/moby/chore/merge-2026-09-10-v2` 汇集 #26–#30，并包含冲突修复、tie scoring 修复、RSSI 修复和最新任务状态文档                                    |
| Tingyue 当前分支 | `origin/tingyue/feat/challenge-connect-flow` 在 `dev` 上新增 3.4/3.5 基础；截至抓取的 PR #1–#30，没有对应 PR ref                                       |

因此，“代码已经写完”和“代码已经进入 `dev`”目前不是同一件事。团队演示或测试前必须先确定使用哪个集成分支。

## 3. 按成员整理

### Tingyue He（`tingyueh`）

已进入 `dev`：

- PR [#4](https://github.com/pix-l-crafters/pocket-draw/pull/4)：Expo/React Native 环境与 SDK 54 兼容调整。关键文件：`app.json`、`package.json`、`package-lock.json`。
- PR [#25](https://github.com/pix-l-crafters/pocket-draw/pull/25)：完成挑战 QR 主流程 3.1–3.3，包括 QR 展示、相机扫描、payload 校验和对手确认弹窗。关键文件：
  - `src/features/challenge/QrDisplayScreen.tsx`
  - `src/features/challenge/QrScannerScreen.tsx`
  - `src/features/challenge/ChallengeScreen.tsx`
  - `src/features/challenge/components/OpponentPopup.tsx`
  - `src/features/qr/types/qr.types.ts`
  - `src/features/qr/utils/qr.tokens.ts`
  - `src/features/qr/utils/qr.validation.ts`

已推送但尚未发现对应 PR：

- 分支 `origin/tingyue/feat/challenge-connect-flow`：
  - 调整 QR handoff，不再在扫码阶段提前决定局数。
  - 新增 3/5/7 局选择器及测试。
  - 新增挑战请求 repository、Firestore 写入测试和请求类型。
  - 为下一步在 `App.tsx` 中连接扫码、局数选择和发送请求建立 state。
  - 修复测试文件的 Jest TypeScript 类型配置。
- 关键文件：
  - `src/features/challenge/RoundCountSelector.tsx`
  - `src/features/challenge/RoundCountSelector.test.tsx`
  - `src/features/challenge/services/challengeRequestRepository.ts`
  - `src/features/challenge/services/challengeRequestRepository.test.ts`
  - `src/features/challenge/types/challengeRequest.types.ts`
  - `src/contracts/challengeHandoff.ts`
  - `App.tsx`
  - `tsconfig.json`
  - `docs/task-splits/tingyue.md`
  - `docs/task-splits/siheng.md`

当前待完成：把 `RoundCountSelector` 真正渲染到挑战流程、调用 repository、处理发送状态，以及实现 3.6 Incoming Challenge Accept/Decline。

### Siheng Ma / Ethan（Git 作者名 `Ethan`）

已进入 `dev`：

- PR [#2](https://github.com/pix-l-crafters/pocket-draw/pull/2)：设置 Firebase 服务。关键文件：`src/lib/firebase.ts`、`src/types/firebase-auth.d.ts`、依赖文件。
- PR [#6](https://github.com/pix-l-crafters/pocket-draw/pull/6)：地图、前台定位、权限处理和在线 presence 发布。关键目录：
  - `src/features/map/MapScreen.tsx`
  - `src/features/map/hooks/`
  - `src/features/map/services/presenceRepository.ts`
  - `src/features/map/components/`
  - `firestore.rules`

PR [#28](https://github.com/pix-l-crafters/pocket-draw/pull/28) 已编码、未直接进入当前 `dev`：

- 地图显示 Firestore 中的其他玩家。
- 持续定位、heartbeat/retry、隐身开关和玩家数据弹窗。
- 挑战连接页面、`useDuelSession` 和 Duel session transport 边界。
- 连接失败与重试 UI。
- 关键目录：`src/features/map/`、`src/features/challenge/session/`、`src/features/challenge/ConnectingScreen.tsx`、`src/features/challenge/hooks/useDuelSession.ts`。
- 真实 BLE transport 仍是边界/stub，当前流程主要依赖 mock transport。

### Mobark Walid O Bacran（`Mobark Bacran` / `Mobark Walid`）

已进入 `dev`：

- PR [#1](https://github.com/pix-l-crafters/pocket-draw/pull/1)：缓存 Trivy 数据库，降低 CI rate-limit 问题。
- PR [#9](https://github.com/pix-l-crafters/pocket-draw/pull/9)：修复 `App.tsx` 中已提交的 merge conflict markers；该工作随后通过 rebased/integration PR 进入主开发线。
- PR [#15](https://github.com/pix-l-crafters/pocket-draw/pull/15)：修复 Cocogitto release hooks 和 Conventional Commit scopes。
- PR [#16](https://github.com/pix-l-crafters/pocket-draw/pull/16)：新增 Map + Duel 实现设计文档。
- PR [#17](https://github.com/pix-l-crafters/pocket-draw/pull/17)：生成并加入 `CHANGELOG.md`。
- PR [#19](https://github.com/pix-l-crafters/pocket-draw/pull/19)：整合先前的 EAS、设计文档、设计系统和 App shell 修复工作。
- PR [#21](https://github.com/pix-l-crafters/pocket-draw/pull/21)：修复开发环境命令，并创建六名成员的任务分工文档。
- PR [#23](https://github.com/pix-l-crafters/pocket-draw/pull/23)：建立跨成员 shared-contracts 与 mock 模式。关键目录：`src/contracts/` 和 `docs/task-splits/`。

PR [#26](https://github.com/pix-l-crafters/pocket-draw/pull/26) 已编码、未直接进入当前 `dev`：

- Duel round-loop 与 match-decided 逻辑。
- 每局结果页面。
- 最终比赛汇总、rematch 和返回地图。
- 关键文件：`src/features/duel/roundLoop.ts`、`src/features/duel/RoundResultScreen.tsx`、`src/features/postmatch/MatchSummaryScreen.tsx`。

此外，Mobark 创建了 `moby/chore/merge-2026-09-10-v2`：整合 #26–#30，修复 tie scoring、共享 iOS bundle identifier、RSSI 返回值和重复 AI 日志，并创建 `docs/task-splits-v2/`。该分支尚未出现在 PR #1–#30 中。

### Mihir Rabade（`MRDGH2821` / `Mihir Rabade`）

已进入 `dev`：

- PR [#5](https://github.com/pix-l-crafters/pocket-draw/pull/5)：Android BLE build、Java/React Native 依赖和仓库工具链修复。
- PR [#20](https://github.com/pix-l-crafters/pocket-draw/pull/20)：fnox/secrets 配置、APM pin 和 CI/工具配置更新。
- PR [#22](https://github.com/pix-l-crafters/pocket-draw/pull/22)：限制 treefmt 的平台配置并修复开发环境。
- PR [#24](https://github.com/pix-l-crafters/pocket-draw/pull/24)：将团队成员 public keys 加入 `fnox.toml`。
- 作为合并者，Mihir 合并了 #15、#16、#17、#19、#22 和 #24；这些 merge 动作不改变原功能作者归属。

PR [#27](https://github.com/pix-l-crafters/pocket-draw/pull/27) 已编码、未直接进入当前 `dev`：

- match result Firestore 写入。
- 离线队列和重试边界。
- player stats repository 与后端 service 入口。
- 关键目录：`src/features/backend/`，并修改 `firestore.rules`、`src/contracts/playerStats.ts`。

Mihir 的 `mihir/chore/merge-branches-2026-09-10` 也整合过 #26–#30；后来的 v2 集成分支以这条分支为基础修复问题。

### Tanachat Mongkolporn（Git 作者名 `hbeat`）

早期工作：

- PR [#3](https://github.com/pix-l-crafters/pocket-draw/pull/3)：Bluetooth demo、开发构建依赖和 README/package 兼容修复。这部分后来与 Android BLE/tooling 工作一起进入 `dev`。

PR [#29](https://github.com/pix-l-crafters/pocket-draw/pull/29) 的 head 已抓取，但未进入当前 `dev`，且 GitHub 没有提供当前 merge ref，因此实时 open/closed/conflict 状态需要重新登录 GitHub 后确认：

- Pre-round ritual：分开距离、手机朝下、随机延迟、haptic、3-2-1 countdown。
- RSSI reader boundary。
- ELO 计算与 player stats 更新。
- Duel pre-round App 集成。
- 关键文件：`src/features/duel/PreRound.tsx`、`DuelScreen.tsx`、`bleRssi.ts`、`countdownAudio.ts`、`src/features/backend/elo.ts`。

该代码已经包含在 v2 集成分支中，但 BLE spike 的最终 pass/fail 仍应明确记录。

### Tianze Wu（`wutianze3`）

已进入 `dev`：

- PR [#7](https://github.com/pix-l-crafters/pocket-draw/pull/7)：Firebase authentication service、登录/注册页面和 App 登录状态集成。关键文件：`src/lib/auth.ts`、`src/screens/LoginScreen.tsx`、`src/screens/RegisterScreen.tsx`、`App.tsx`。
- 早期 `main` 上的 React Native CI commit 也由 Tianze 编写，并被后续分支带入。

PR [#30](https://github.com/pix-l-crafters/pocket-draw/pull/30) 已编码、未直接进入当前 `dev`：

- countdown 后同步 FIRE signal。
- 加速度计 raise gesture 规格、检测与校准。
- false-start 检测和判定。
- reaction time、tie window 和 round judge。
- 掉线重试/中止处理。
- 关键目录：`src/features/duel/`；关键文档：`docs/superpowers/specs/2026-09-06-map-duel-implementation-design.md`、`docs/task-splits/tianze.md`。

尚需完成 iOS signing/TestFlight 和 iOS 真机全流程测试。

## 4. PR 状态总表

| PR                                                                                  | 主要负责人/主题                                  | 截至本次 Git refs 调查的状态                                      |
| ----------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------- |
| [#1](https://github.com/pix-l-crafters/pocket-draw/pull/1)                          | Mobark — Trivy CI cache                          | head 已进入 `dev`                                                 |
| [#2](https://github.com/pix-l-crafters/pocket-draw/pull/2)                          | Siheng/Ethan — Firebase setup                    | head 已进入 `dev`                                                 |
| [#3](https://github.com/pix-l-crafters/pocket-draw/pull/3)                          | Tanachat — Bluetooth/dev-build fixes             | 工作已由后续整合进入 `dev`                                        |
| [#4](https://github.com/pix-l-crafters/pocket-draw/pull/4)                          | Tingyue — Expo environment                       | head 已进入 `dev`                                                 |
| [#5](https://github.com/pix-l-crafters/pocket-draw/pull/5)                          | Mihir — Android BLE/tooling                      | head 已进入 `dev`                                                 |
| [#6](https://github.com/pix-l-crafters/pocket-draw/pull/6)                          | Siheng/Ethan — Map/location/presence             | 已由 Mobark 合并                                                  |
| [#7](https://github.com/pix-l-crafters/pocket-draw/pull/7)                          | Tianze — Firebase auth                           | 已由 Ethan 合并；后续修复过 App 冲突                              |
| [#8–#14](https://github.com/pix-l-crafters/pocket-draw/pulls?q=is%3Apr+is%3Aclosed) | Mobark 的 conflict/EAS/design/changelog 原始系列 | 原 heads 未直接进入当前 `dev`；相关工作经 #15–#19 rebase/整合进入 |
| [#15](https://github.com/pix-l-crafters/pocket-draw/pull/15)                        | Mobark — Cocogitto/scopes                        | 已由 Mihir 合并                                                   |
| [#16](https://github.com/pix-l-crafters/pocket-draw/pull/16)                        | Mobark — Map + Duel design                       | 已由 Mihir 合并                                                   |
| [#17](https://github.com/pix-l-crafters/pocket-draw/pull/17)                        | Mobark — changelog                               | 已由 Mihir 合并                                                   |
| [#18](https://github.com/pix-l-crafters/pocket-draw/pull/18)                        | Mobark — 中间整合分支                            | 未直接进入 `dev`；成果由 #19 接收                                 |
| [#19](https://github.com/pix-l-crafters/pocket-draw/pull/19)                        | Mobark — 合并设计系统/EAS 等工作                 | 已由 Mihir 合并                                                   |
| [#20](https://github.com/pix-l-crafters/pocket-draw/pull/20)                        | Mihir — secrets/fnox/tooling                     | head 已进入 `dev`                                                 |
| [#21](https://github.com/pix-l-crafters/pocket-draw/pull/21)                        | Mobark — dev fixes/task splits                   | 已由 Mobark 合并                                                  |
| [#22](https://github.com/pix-l-crafters/pocket-draw/pull/22)                        | Mihir — treefmt/dev environment                  | 已由 Mihir 合并                                                   |
| [#23](https://github.com/pix-l-crafters/pocket-draw/pull/23)                        | Mobark — shared contracts/mocks                  | 已由 Mobark 合并                                                  |
| [#24](https://github.com/pix-l-crafters/pocket-draw/pull/24)                        | Mihir — member public keys                       | 已由 Mihir 合并                                                   |
| [#25](https://github.com/pix-l-crafters/pocket-draw/pull/25)                        | Tingyue — QR challenge 3.1–3.3                   | 已由 Mobark 合并，是当前 `dev` 顶部                               |
| [#26](https://github.com/pix-l-crafters/pocket-draw/pull/26)                        | Mobark — round loop/postmatch                    | 有当前 merge ref；未进入 `dev`                                    |
| [#27](https://github.com/pix-l-crafters/pocket-draw/pull/27)                        | Mihir — backend/offline queue                    | 有当前 merge ref；未进入 `dev`                                    |
| [#28](https://github.com/pix-l-crafters/pocket-draw/pull/28)                        | Siheng/Ethan — map + challenge session           | 有当前 merge ref；未进入 `dev`                                    |
| [#29](https://github.com/pix-l-crafters/pocket-draw/pull/29)                        | Tanachat — pre-round/ELO                         | head 存在但无 merge ref；未进入 `dev`，实时状态需确认             |
| [#30](https://github.com/pix-l-crafters/pocket-draw/pull/30)                        | Tianze — fire/raise/round judge                  | 有当前 merge ref；未进入 `dev`                                    |

## 5. 已有文档及其作用

| 文档                                                                       | 内容与负责人信息                                                                    |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `docs/human-plans/boxing-game-idea.md`                                     | 产品/玩法原始构想，不是实际完成状态清单                                             |
| `docs/task-splits/README.md`                                               | v1 分工总览、协作规范、shared-contracts 模式和合并顺序                              |
| `docs/task-splits/{name}.md`                                               | 六名成员各自的原任务、建议分支、依赖与关键文件；部分 checkbox 已落后于实际 Git 状态 |
| `docs/task-splits-v2/README.md`                                            | 位于 v2 集成分支；记录 #26–#30 集成、冲突修复、CI 问题和当前剩余工作                |
| `docs/task-splits-v2/{name}.md`                                            | 位于 v2 集成分支；按成员更新“已完成/剩余”，比 v1 更接近当前功能状态                 |
| `docs/superpowers/specs/2026-09-06-map-duel-implementation-design.md`      | Map/Duel 的整体实现设计与接口关系                                                   |
| `docs/superpowers/specs/2026-09-07-design-system-implementation-design.md` | 设计系统、组件和视觉规范的实现设计                                                  |
| `docs/superpowers/plans/2026-09-07-design-system.md`                       | 设计系统实施步骤与完成记录                                                          |
| `src/contracts/README.md`                                                  | 跨成员 producer/consumer、contract 和 mock 替换方式                                 |
| `.agents/logs/YYYY-MM-DD.md`                                               | 每日 AI 辅助工作记录，可用于追踪 prompt、作者、模型和改动原因                       |

## 6. 建议的下一步

1. 为 `moby/chore/merge-2026-09-10-v2` 创建一个进入 `dev` 的集成 PR，或由团队明确选择另一条整合路线；不要重复合并 #26–#30。
2. 重新登录 GitHub CLI 后确认 #26–#30，尤其 #29 的实时 open/closed、review 和 CI 状态。
3. 为 `tingyue/feat/challenge-connect-flow` 创建 PR，并在描述中说明它建立在当前 `dev` 上，尚未包含 v2 集成分支的 challenge session 层。
4. 将 `docs/task-splits-v2/` 合入团队共同使用的分支，并明确它是否替代 v1 `docs/task-splits/`。
5. 在两台真机上验证完整链路：Map → QR → Challenge → BLE → Duel → Result；当前多数功能的“已完成”仍主要表示代码已写和静态检查通过，不代表真机端到端已通过。
