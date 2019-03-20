# `removeEventListener`

**tl;dr call `removeEventListener(obj, element, eventName, fn, options)` on a
component or route to actively remove a DOM event listener previously added by a
call to `addEventListener`.**

Although any listener added by a call to `addEventListener` will be teared down when the route or component is being
destroyed, there might be cases where you want to actively remove an existing event listener even during the active
lifecycle, for example when temporarily dealing with high volume events like `scroll` or `mousemove`.

Be sure to pass the identical arguments used when calling `addEventListener`!
