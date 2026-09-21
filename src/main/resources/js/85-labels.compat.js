//
// Compatibility layer switches.
//

// Bitbucket has shipped three different ways of reaching the state of the
// component that owns a page. Probe them in newest-first order instead of
// guessing from a version number, and always hand back something with a
// state() method so callers can just test for null.
var React = function (element) {
    var accessors = [React_18, React_16, React_15];
    var found = null;

    $.each(accessors, function (_, Accessor) {
        var accessor;

        try {
            accessor = new Accessor(element);
        } catch (e) {
            return;
        }

        if (!accessor || !$.isFunction(accessor.state)) {
            return;
        }

        try {
            if (accessor.state() != null) {
                found = accessor;
                return false;
            }
        } catch (e) {
            // Wrong React vintage for this element: keep probing.
        }
    });

    this.state = function () {
        if (!found) {
            return null;
        }

        try {
            return found.state();
        } catch (e) {
            return null;
        }
    };

    return this;
}

var AvatarSize = AvatarSize_Native;
var IconTag = IconTag_Native;

$(document).ready(function () {
    var compat = new Compat();

    if (!compat.helpers.avatars) {
        AvatarSize = AvatarSize_64;
    }

    if (!compat.icons.tag) {
        IconTag = IconTag_DevTools;
    }
});
