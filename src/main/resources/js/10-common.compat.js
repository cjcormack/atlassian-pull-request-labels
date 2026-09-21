var Compat = function () {
    this.helpers = {
        // Feature detect rather than compare versions: the helper is exactly
        // what AvatarSize_Native calls, so its presence is the real question.
        avatars: typeof bitbucket !== "undefined"
            && bitbucket.internal
            && bitbucket.internal.widget
            && bitbucket.internal.widget.avatar
            && bitbucket.internal.widget.avatar.avatar
            && $.isFunction(bitbucket.internal.widget.avatar.avatar.avatarSizeInPx)
    }

    this.icons = {
        // AJS.version carries the AUI version. Treat an unknown version as
        // current, since every supported Bitbucket ships AUI well past 7.5.3.
        tag: AJS.version == null || VersionCompare(AJS.version, "7.5.3") >= 0
    }

    return this;
}
