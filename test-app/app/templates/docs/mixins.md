# Mixins

Ember lifeline also provides mixins, which extend the object's methods to include lifeline's functions.

To use any of the above mentioned functions in your component, route or service, simply import and apply one or all of these mixins to your class:

- `ContextBoundTasksMixin` for using any of the \*Task methods
- `ContextBoundEventListenersMixin` for using addEventListener
- `DisposableMixin` for using registerDisposable and runDisposable
