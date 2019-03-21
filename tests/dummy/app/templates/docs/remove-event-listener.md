# `removeEventListener`

**TL;DR - call `removeEventListener(obj, element, eventName, fn, options)` on a
component or route to actively remove a DOM event listener previously added by a
call to `addEventListener`.**

Although any listener added by a call to `addEventListener` will be teared down when the route or component is being
destroyed, there might be cases where you want to actively remove an existing event listener even during the active
lifecycle, for example when temporarily dealing with high volume events like `scroll` or `mousemove`.

Be sure to pass the identical arguments used when calling `addEventListener`!

When importing and using lifeline's functions, **it's imperative that you additionally import and call `runDisposables` during your object's destroy method**. This ensures lifeline will correctly dispose of any remaining async work. Please see {{docs-link "the runDisposables section" "docs.run-disposables"}} for more information.
