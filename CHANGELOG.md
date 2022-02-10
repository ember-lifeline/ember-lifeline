## v7.0.0-beta.3 (2022-02-10)


## v7.0.0-beta.2 (2022-02-07)

## v6.0.2 (2021-05-04)

#### :memo: Documentation
* [#988](https://github.com/ember-lifeline/ember-lifeline/pull/988) Adds deprecation warning for DOM APIs ([@scalvert](https://github.com/scalvert))

#### :house: Internal
* [#980](https://github.com/ember-lifeline/ember-lifeline/pull/980) Upgrade caniuse-db and dedupe yarn.lock ([@nlfurniss](https://github.com/nlfurniss))

#### Committers: 2
- Nathaniel Furniss ([@nlfurniss](https://github.com/nlfurniss))
- Steve Calvert ([@scalvert](https://github.com/scalvert))


## v6.0.1 (2020-09-17)

#### :bug: Bug Fix
* [#931](https://github.com/ember-lifeline/ember-lifeline/pull/931) Upgrades ember-destroyable-polyfill to fix issue with double _super invocation ([@scalvert](https://github.com/scalvert))

#### Committers: 1
- Steve Calvert ([@scalvert](https://github.com/scalvert))


## v6.0.0 (2020-08-03)

#### :boom: Breaking Change
* [#859](https://github.com/ember-lifeline/ember-lifeline/pull/859) Removing deprecation warnings targeted for 4.0.0 ([@scalvert](https://github.com/scalvert))
* [#852](https://github.com/ember-lifeline/ember-lifeline/pull/852) Convert internal destroyable implementation to use @ember/destroyable ([@scalvert](https://github.com/scalvert))
* [#855](https://github.com/ember-lifeline/ember-lifeline/pull/855) Removes support for Ember 3.4 in ember-try config. ([@scalvert](https://github.com/scalvert))

#### Committers: 1
- Steve Calvert ([@scalvert](https://github.com/scalvert))


## v5.1.0 (2020-05-05)

#### :rocket: Enhancement
* [#652](https://github.com/ember-lifeline/ember-lifeline/pull/652) chore(deps): bump ember-cli-typescript from 2.0.2 to 3.1.3 ([@dependabot-preview[bot]](https://github.com/apps/dependabot-preview))

#### :house: Internal
* [#774](https://github.com/ember-lifeline/ember-lifeline/pull/774) Update minimum versions of our devDependencies ([@rwjblue](https://github.com/rwjblue))
* [#773](https://github.com/ember-lifeline/ember-lifeline/pull/773) Update @types/* devDependencies. ([@rwjblue](https://github.com/rwjblue))
* [#772](https://github.com/ember-lifeline/ember-lifeline/pull/772) Update release-it setup. ([@rwjblue](https://github.com/rwjblue))
* [#770](https://github.com/ember-lifeline/ember-lifeline/pull/770) Fix linting configuration. ([@rwjblue](https://github.com/rwjblue))
* [#623](https://github.com/ember-lifeline/ember-lifeline/pull/623) Converting to github actions ([@scalvert](https://github.com/scalvert))

#### Committers: 3
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))
- Steve Calvert ([@scalvert](https://github.com/scalvert))
- [@dependabot-preview[bot]](https://github.com/apps/dependabot-preview)


## v5.0.0 (2020-01-09)

#### :boom: Breaking Change
* [#621](https://github.com/ember-lifeline/ember-lifeline/pull/621) Dropping support for Node 8 ([@scalvert](https://github.com/scalvert))

#### :house: Internal
* [#622](https://github.com/ember-lifeline/ember-lifeline/pull/622) chore(release): Update release-it changelog configuration ([@scalvert](https://github.com/scalvert))
* [#620](https://github.com/ember-lifeline/ember-lifeline/pull/620) Adding release-it configuration ([@scalvert](https://github.com/scalvert))
* [#470](https://github.com/ember-lifeline/ember-lifeline/pull/470) task(types): Turning noImplicitAny on to flush out remaining type inconsistencies ([@scalvert](https://github.com/scalvert))

#### Committers: 2
- Steve Calvert ([@scalvert](https://github.com/scalvert))
- [@dependabot-preview[bot]](https://github.com/apps/dependabot-preview)


4.1.5 / 2019-6-19
==================

  * Refining styling of documentation
  * Added tests to ensure undefined callbacks are thrown when add/remove DOM events

4.1.4 / 2019-4-25
==================

  * Further exposing types to consumers

4.1.3 / 2019-3-22
==================

  * Fix bug in documentation - page title correction

4.1.2 / 2019-3-21
==================

  * Converts our documentation to use ember-cli-addon-docs (#387)
  * Fixing setupLifelineValidation import in readme (#382)

4.1.1 / 2019-03-12
==================

  * Fixing assertion count error for setupLifelineValidation (#377)

4.1.0 / 2019-03-08
==================

  * Updating docs for pollTaskFor (#375)
  * Updates pollTaskFor to correctly await settled (#374)
  
v4.0.0 / 2019-03-04
==================

  * Lifeline's minimum node version is 8  
  * Fixing TS errors related to handlebars types
  * Updating blueprint to latest
  * Updating param name and docs for poll
  * Implements early return when \*Task functions called on destroyed objects
  
  * Fixes for issues #35 and #120
  * Fixes for issues #130 and #168

v3.1.0 / 2018-12-21
====================
  * Modified `throttleTask` to accept arguments to be passed to throttled method
  * Made `spacing` arguments required for `throttleTask` and `debounceTask` respectively

v3.0.4 / 2018-06-01
==================

  * Updated dependencies to latest versions, including Ember 3.1.2 and Ember CLI 3.1.4
  * PR - Clean up canceled pending debounce by 2hu12

v3.0.0 / 2018-03-12
==================

  * Instance arrays for tracking task and event dependencies for objects deprecated in favor of using
    WeakMaps to track the association and eventual tear down of resources
  * APIs expanded to include functional counterparts
  * Mixin surface area reduced in favor of delegating to functional equivalent

v2.0.0 / 2017-11-16
==================

  * New feature - `scheduleTask` - allows for scheduling tasks via lifeline
  * New feature - `registerDisposable` - registers a function to be called on destruction of the object
  * Allow calling `addEventListener` from objects other than components (when passing specific `HTMLElement`).
  * Ensure `this.throttleTask` created timers are cleared upon destroy.
  * Upgrade to use Ember's new JS modules API. 🎉
  * Removed ability to add multiple listeners to child elements in single call
  * Removed dependency on jQuery for ContextBoundEventListenersMixin

v1.3.0 / 2017-06-30
==================

  * Introduce cancel\* methods

v1.2.1 / 2017-06-30
==================

  * Moving arrays to be lazy-allocated

v1.1.0 / 2017-06-15
===================

  * Fixing deprecation issue with lookupFactory
  * [Bugfix] - Adding assertions to ensure _super has been called in the init chain
  * destruct from ember instead of depending on ember-cli-shims

v1.0.4 / 2017-02-07
===================

  * Added removeEventListener method to DomMixin
  * Refactor DOM mixin tests to use standard setup.

v1.0.3 / 2016-10-31
===================

  * Released v1.0.3

v1.0.2 / 2016-10-31
===================

  * Released v1.0.2

v1.0.1 / 2016-10-31
===================

  * Released v1.0.1

v1.0.0 / 2016-10-31
===================

  * Add DOM helper methods.
  * Add implementation for run based helper methods.
