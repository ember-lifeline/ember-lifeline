# How it works

Ember Lifeline supports a functional API that enables entanglement - _the association of async behavior to object instances_. This allows you to write async code in your classes that can be automatically cleaned up for you when the object is destroyed.

The API is divided into two main parts:

- Run loop entanglement
- DOM event handler entanglement

Additionally, lifeline exposes a primitive, `disposables`, that allows you to entangle functionality of your choosing.

## Mixins

Lifeline provides {{docs-link 'Mixins' 'docs.mixins'}} that conveniently implement `destroy`, correctly calling `runDisposables`.

Lifeline also exposes a QUnit test helper to ensure you've correctly implemented `runDisposables` within your objects. Please see the {{docs-link 'testing' 'docs.testing'}} section.
