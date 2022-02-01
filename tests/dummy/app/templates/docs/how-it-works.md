# How it works

Ember Lifeline supports a functional API that enables entanglement - _the association of async behavior to object instances_. This allows you to write async code in your classes that can be automatically cleaned up for you when the object is destroyed.

The API supports `run loop entanglement`, which ensures that your async code is cleaned up automatically.
