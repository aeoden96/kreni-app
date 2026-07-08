# Changelog

## [3.5.2](https://github.com/aeoden96/kreni-app/compare/v3.5.1...v3.5.2) (2026-07-08)


### Bug Fixes

* **map:** prevent canvas renderer from blocking marker clicks after spiderfy ([d035e09](https://github.com/aeoden96/kreni-app/commit/d035e09bf13435979870d8d0939bb170d514dfde))
* **map:** prevent canvas renderer from blocking marker clicks after spiderfy ([#92](https://github.com/aeoden96/kreni-app/issues/92)) ([0a06785](https://github.com/aeoden96/kreni-app/commit/0a06785a151d373f634332a613fd4fb5af1b32c6))

## [3.5.1](https://github.com/aeoden96/kreni-app/compare/v3.5.0...v3.5.1) (2026-07-07)


### Bug Fixes

* new vehicle icons and small improvements ([20be0cc](https://github.com/aeoden96/kreni-app/commit/20be0cc6ce5bd9b49501c3746dab7772a4cda870))
* **realtime:** carry over vehicle bearing on cache hits and add harvest script ([baa4ff6](https://github.com/aeoden96/kreni-app/commit/baa4ff6b36ef57661d2cd8c4b082aa7d65e45fa7))
* **transit:** decouple vehicle view and map zoom behavior ([1d8bacb](https://github.com/aeoden96/kreni-app/commit/1d8bacb502ceb14ad518f0887882c4237bed4c26))
* **transit:** remove unused export VehicleFocusState ([142c9e0](https://github.com/aeoden96/kreni-app/commit/142c9e059c89a89b2b1cc00c9e023fc58fc8ee39))


### Performance Improvements

* **transit:** use canvas renderer and aggressively memoize map layers ([0b771d6](https://github.com/aeoden96/kreni-app/commit/0b771d62c919d0d71e4f868a1d0c74db0a4e0fd8))

## [3.5.0](https://github.com/aeoden96/kreni-app/compare/v3.4.0...v3.5.0) (2026-07-03)


### Features

* surface prometne obavijesti directly, remove map tools menu ([05e79c8](https://github.com/aeoden96/kreni-app/commit/05e79c80d8cf427d81a12355bcce3b5e63233184))


### Bug Fixes

* fixed gps and timetable consolidation in the stop view ([6147ccb](https://github.com/aeoden96/kreni-app/commit/6147ccbfdedf1b8febc6bf8096ec2dba1aceb1b1))

## [3.4.0](https://github.com/aeoden96/kreni-app/compare/v3.3.0...v3.4.0) (2026-06-21)


### Features

* train view improvements ([1601a0c](https://github.com/aeoden96/kreni-app/commit/1601a0c5de53167467209798c7fc8e62121a2b6a))

## [3.3.0](https://github.com/aeoden96/kreni-app/compare/v3.2.0...v3.3.0) (2026-06-04)


### Features

* enhance route click handling with additional latitude and longitude parameters ([77c7d18](https://github.com/aeoden96/kreni-app/commit/77c7d186584a58c14e3208f048342aa707f9e08e))

## [3.2.0](https://github.com/aeoden96/kreni-app/compare/v3.1.0...v3.2.0) (2026-06-04)


### Features

* add compact route info display ([c2c3c36](https://github.com/aeoden96/kreni-app/commit/c2c3c36fb51dd59520df48411e76548d83c92d06))
* enhance route and journey handling in components and hooks ([1ce7572](https://github.com/aeoden96/kreni-app/commit/1ce75727056dd081e82f848dca32f2392cc5bf87))
* enhance vehicle following and route click handling with trip ID support ([4b33966](https://github.com/aeoden96/kreni-app/commit/4b339663d8cf2f7043c6ef3bd1401c0967462890))
* enhance welcome messages ([56a31d3](https://github.com/aeoden96/kreni-app/commit/56a31d324c643bba22824c9d2f27c867a5c484a8))
* play journey feature improvements ([f20dec8](https://github.com/aeoden96/kreni-app/commit/f20dec8f6f375deb2ede8275956ef6015340bd4d))

## [3.1.0](https://github.com/aeoden96/kreni-app/compare/v3.0.0...v3.1.0) (2026-05-29)


### Features

* **modals:** improved UI and functionality ([dfa3358](https://github.com/aeoden96/kreni-app/commit/dfa335815d889761b1d6774e295148ccf0f6dcc6))
* **search:** enhance search modal with new direction handling and accessibility improvements ([f9300e8](https://github.com/aeoden96/kreni-app/commit/f9300e82f3e63d3fb19fa9ebdc62d201b07d6436))

## [3.0.0](https://github.com/aeoden96/kreni-app/compare/v2.3.3...v3.0.0) (2026-04-03)


### ⚠ BREAKING CHANGES

* map layers by mode, clustering, and saved places

### Features

* implement localized release notes with automated generation and display support ([ac3e13b](https://github.com/aeoden96/kreni-app/commit/ac3e13b77700fd0371d85c6da1c902bf648a4260))
* map layers by mode, clustering, and saved places ([43355c0](https://github.com/aeoden96/kreni-app/commit/43355c030e8375cc6f115f849250d9c551715714))


### Bug Fixes

* restrict debug panel visibility to sandbox mode in GTFSMode page [FORCE] ([8a5375c](https://github.com/aeoden96/kreni-app/commit/8a5375c4386b158f8bbc765e9b0da58332cd70e7))

## [2.3.4](https://github.com/aeoden96/kreni-app/compare/v2.3.3...v2.3.4) (2026-03-30)

### Bug Fixes

- fix debug panel visibility [FORCE] ([29aa6c1](https://github.com/aeoden96/kreni-app/commit/29aa6c1))

## [2.3.3](https://github.com/aeoden96/kreni-app/compare/v2.3.2...v2.3.3) (2026-03-30)

### Bug Fixes

- implement vehicle position snapping for inactive tabs ([7ece738](https://github.com/aeoden96/kreni-app/commit/7ece7385aaeeb51d559f8f060e93182a3a84cc84))
- improve service worker update frequency ([ad98630](https://github.com/aeoden96/kreni-app/commit/ad9863062fd50e63db1a5440ac5dc0e1a5433777))

## [2.3.2](https://github.com/aeoden96/kreni-app/compare/v2.3.1...v2.3.2) (2026-03-29)

### Bug Fixes

- [FORCE] update SEO metadata and improve visibility handling in realtime data hook ([96e0ab4](https://github.com/aeoden96/kreni-app/commit/96e0ab436966431df00bdc90bd6410c01307eaf3))

## [2.3.1](https://github.com/aeoden96/kreni-app/compare/v2.3.0...v2.3.1) (2026-03-29)

### Bug Fixes

- nearby vehicles now show correctly ([e9cd760](https://github.com/aeoden96/kreni-app/commit/e9cd760f1e57155ab6c8eecab7b1079f591e83c5))

## [2.3.0](https://github.com/aeoden96/kreni-app/compare/v2.2.0...v2.3.0) (2026-03-28)

### Features

- enhance cycling mode features ([#24](https://github.com/aeoden96/kreni-app/issues/24)) ([0f43c0f](https://github.com/aeoden96/kreni-app/commit/0f43c0fa79dbb7798413b8e1d0d6cfa6fbce3b8d))
- enhance GTFS data fetching with version selection support ([66dbefa](https://github.com/aeoden96/kreni-app/commit/66dbefa19e96eee90e6ce18358fcf30165bd30b3))
- new onboarding modal ([#25](https://github.com/aeoden96/kreni-app/issues/25)) ([09087a6](https://github.com/aeoden96/kreni-app/commit/09087a64a332c53232b0b3d6397e98916c2064f8))
- spider menu redesign ([#23](https://github.com/aeoden96/kreni-app/issues/23)) ([0179c68](https://github.com/aeoden96/kreni-app/commit/0179c68180559346d1bc91cbcae0d15ca5b4d62c))

### Bug Fixes

- enhance bike station data handling ([3f29012](https://github.com/aeoden96/kreni-app/commit/3f2901280082745ade828bd95813eed605040b55))
- enhance road closures display and management with refresh functionality ([#27](https://github.com/aeoden96/kreni-app/issues/27)) ([fdae9e7](https://github.com/aeoden96/kreni-app/commit/fdae9e7fe8382a56b54a8ccd62cf8b22a09a55da))

## [2.2.1](https://github.com/aeoden96/kreni-app/compare/v2.2.0...v2.2.1) (2026-03-26)

### Bug Fixes

- restore realtime vehicle matching after GTFS trip ID segment drift by adding normalized fallback joins
- pin static GTFS feed version in local/CI pipeline via `.gtfs-static-version` to allow manual, controlled upgrades

## [2.2.0](https://github.com/aeoden96/kreni-app/compare/v2.1.0...v2.2.0) (2026-03-25)

### Features

- enhance route view with vehicle selection and improved stop previews ([#21](https://github.com/aeoden96/kreni-app/issues/21)) ([b9546a0](https://github.com/aeoden96/kreni-app/commit/b9546a0f8d1bfeb31a53988b8b8cc89ee8db6076))

### Bug Fixes

- improve map interaction and stop visibility logic ([#19](https://github.com/aeoden96/kreni-app/issues/19)) ([340ce41](https://github.com/aeoden96/kreni-app/commit/340ce4190b788f62bc5fe8cd8a629494f5643c67))

## [2.1.0](https://github.com/aeoden96/kreni-app/compare/v2.0.0...v2.1.0) (2026-03-24)

### Features

- taxi hailing action ([#16](https://github.com/aeoden96/kreni-app/issues/16)) ([d48d3ce](https://github.com/aeoden96/kreni-app/commit/d48d3ce257d424f98f2c7b9167580b2a4d46a9e9))

### Bug Fixes

- misc style fixes ([#18](https://github.com/aeoden96/kreni-app/issues/18)) ([fd1a4e1](https://github.com/aeoden96/kreni-app/commit/fd1a4e11c312fe7ed61d3f5f34a4b92a47873459))

## [2.0.0](https://github.com/aeoden96/kreni-app/compare/v1.5.7...v2.0.0) (2026-03-22)

### Features

- **Open Source:** Initial public release of the project ([000000](https://github.com/aeoden96/kreni-app/commit/000000))
- **Release Automation:** Integrated Release Please for automated versioning and GitHub Releases ([111111](https://github.com/aeoden96/kreni-app/commit/111111))
- **Changelog UI:** Built a native changelog viewer within the application updates modal ([222222](https://github.com/aeoden96/kreni-app/commit/222222))

### [1.5.7](https://github.com/aeoden96/kreni-app/compare/1.5.6...1.5.7) (2026-03-22)

### Features

- added dark mode ([abcdef](https://github.com/aeoden96/kreni-app/commit/abcdef))
- new map layers ([123456](https://github.com/aeoden96/kreni-app/commit/123456))

### Bug Fixes

- crash on startup ([987654](https://github.com/aeoden96/kreni-app/commit/987654))
