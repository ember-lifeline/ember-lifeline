# Why use ember-lifeline

Ember applications have long life-cycles. A user may navigate to several pages
and use many different features before they leave the application. This
makes JavaScript and Ember development unlike Rails development, where the
lifecycle of a request is short and the environment disposed of after
each request. It makes Ember development much more like iOS or video game
development than traditional server-side web development.

It is good to note that this isn't something inherent to just Ember. Any
single-page app framework or solution (Angular, React, Vue, Backbone...)
must deal with this lifecycle of objects, and specifically with how async
tasks can be entangled with a lifecycle.

There is a fantastic Ember addon, [ember-concurrency](http://ember-concurrency.com/)
that solves these problems in a very exciting and simple way. It is largely
inspired by [RxJS](http://reactivex.io/) and the Observable pattern, both of
which concern themselves with creating life-cycle-free
async that, in practice, tend to be hard for developers to learn.

This addon introduces several functional utility methods to help manage async, object
lifecycles, and the Ember runloop. These tools should provide a simple developer
experience that allows engineers to focus on the business domain, and think less
about the weird parts of working in a long-lived app.
