//
// Utility classes.
//

var Options = function(options, defaults) {
  return $.extend(defaults, options);
};

var Query = function(data) {
  var components = [];

  $.each(data, function(key, value) {
    if (value !== null) {
      components.push(key + "=" + encodeURIComponent(value));
    }
  });

  return components.join("&");
};

// Compares two dotted version strings numerically and returns -1, 0 or 1.
//
// Plain string comparison breaks as soon as a component reaches two digits:
// "10.2.3" > "7.6.3" is false, which silently sent us down the legacy code
// paths on Bitbucket 10.
var VersionCompare = function(left, right) {
  var parse = function(version) {
    return $.map(String(version == null ? "" : version).split(/[^\d]+/), function(
      part
    ) {
      return part === "" ? null : Number(part);
    });
  };

  var a = parse(left);
  var b = parse(right);

  for (var i = 0; i < Math.max(a.length, b.length); i++) {
    var x = a[i] || 0;
    var y = b[i] || 0;

    if (x !== y) {
      return x < y ? -1 : 1;
    }
  }

  return 0;
};

// Bitbucket >= 10 mounts pages with React 18 createRoot(), which stores the
// root under a '__reactContainer$<random>' key on the container instead of
// the '_reactRootContainer' property used by the legacy ReactDOM.render().
var React_18 = function(element) {
  var element = $(element)[0];

  var root = function() {
    if (!element) {
      return null;
    }

    var key = Object.keys(element).find(function(key) {
      return key.startsWith("__reactContainer$");
    });

    return key ? element[key] : null;
  };

  this.state = function() {
    var fiber = root();
    if (!fiber) {
      return null;
    }

    // The container points at the host root fiber it was mounted with, whose
    // stateNode is the root object. That root's 'current' always tracks the
    // committed tree, so prefer it over the possibly stale fiber.
    var host = (fiber.stateNode && fiber.stateNode.current) || fiber;

    // createRoot() callers may wrap the stateful component in one or more
    // function components, which carry no stateNode, so walk down until we
    // reach an instance that actually holds state.
    for (var node = host.child; node != null; node = node.child) {
      if (node.stateNode && node.stateNode.state) {
        return node.stateNode.state;
      }
    }

    return null;
  };

  return this;
};

var React_16 = function(element) {
  var element = $(element)[0];
  if (!element || !element._reactRootContainer) {
    this.state = function() {
      return null;
    };

    return this;
  }

  this.state = function() {
    var child = element._reactRootContainer._internalRoot.current.child;

    // BB 5.12.0 has it's state one level deeper.
    return (child.stateNode || child.child.stateNode).state;
  };

  return this;
};

var React_15 = function(element) {
  var element = $(element)[0];
  var key =
    element &&
    Object.keys(element).find(function(key) {
      return key.startsWith("__reactInternalInstance$");
    });

  if (!key) {
    this.state = function() {
      return null;
    };

    return this;
  } else {
    var pointer = element[key];
    while (pointer._currentElement._owner != null) {
      pointer = pointer._currentElement._owner;
    }

    this.state = function() {
      // BB 5.0.2 non-dev version.
      return (
        pointer._instance ||
        pointer._hostContainerInfo._topLevelWrapper._renderedComponent._instance
      ).state;
    };

    return this;
  }
};

// Polls `probe` until it returns something truthy and hands that to `callback`.
//
// Bitbucket >= 10 mounts some React roots from a promise rather than from an
// inline script, so the component we read state from may not exist yet at the
// moment we would like to decorate the page.
var WaitFor = function(probe, callback, options) {
  var options = Options(options, {
    interval: 50,
    timeout: 15000
  });

  var waited = 0;

  var attempt = function() {
    var value = null;

    try {
      value = probe();
    } catch (e) {
      value = null;
    }

    if (value) {
      return callback(value);
    }

    waited += options.interval;
    if (waited >= options.timeout) {
      return;
    }

    setTimeout(attempt, options.interval);
  };

  attempt();
};

var Observer = function(selector, fn) {
  var MutationObserver =
    window.MutationObserver || window.WebKitMutationObserver;

  this._observer = new MutationObserver(function(mutations, observer) {
    var timeout = null;

    $.each(mutations, function(index, mutation) {
      var $target = $(mutation.target);

      if ($target.filter(selector).length > 0) {
        if (timeout != null) {
          clearTimeout(timeout);
        }

        timeout = setTimeout(fn($target), 10);
      }
    });
  });

  this.observe = function(target) {
    this._observer.observe($(target)[0], { subtree: true, childList: true });
  };

  return this;
};

var ViewNotApplicable = function() {
  this.mount = function() {
    return null;
  };

  return this;
};

var Colors = {
  FromHex: function(hex) {
    if (!hex.match(/^#[\da-f]{6}$/i)) {
      return null;
    }

    var color = parseInt(hex.slice(1), 16);

    return {
      r: 0xff & (color >> 16),
      g: 0xff & (color >> 8),
      b: 0xff & color
    };
  },

  ToHex: function(rgb) {
    return (
      "#" +
      ((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1)
    );
  },

  Luminance: function(rgb) {
    // https://stackoverflow.com/a/24213274
    return Math.sqrt(
      0.299 * rgb.r * rgb.r + 0.587 * rgb.g * rgb.g + 0.114 * rgb.b * rgb.b
    );
  },

  IsBright: function(rgb) {
    return Colors.Luminance(rgb) > 186;
  }
};
