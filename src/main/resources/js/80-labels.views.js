//
// Plugin-specific view components.
//
// These components are 'main' classes which constructs all other
// dependencies and modify BB UI state if applicable.
//
// These components are aware about right place to inject other UI
// elements.
//
// They should conform to interface:
// a) constructor should accept exactly two parameters: 'context' and
//    'api'.
// b) 'mount()' method should either mount current state or return null if
//    current state is not applicable for current page.
//

var ViewPullRequestListWithFilter = function(context, api) {
  this._$ = $("#pull-requests-content");
  if (this._$.length == 0) {
    return new ViewNotApplicable();
  }

  this._avatarSize = new AvatarSize("medium");

  this._render = function(labels) {
    this._react = new React(this._$);

    // Bitbucket <= 5.0
    if (this._react.state() == null) {
      this._react = new React(this._$.find(".pull-requests-table"));
    }

    this._filter = new PullRequestFilter(
      this._react,
      new SelectLabelFilter(labels)
    );

    var that = this;
    this._list = new PullRequestList(this._react, {
      build: function() {
        return api.urls.search(
          context.getProjectID(),
          context.getRepositoryID(),
          $.extend(
            that._filter.get(),
            { avatar_size: that._avatarSize.px() },
            this.params // params are set by internal BB code
          )
        );
      }
    });

    this._filter.change(
      function(event) {
        if (event.added) {
          this._filter.set({ label: event.added.name });
          this._list.mount();
        }

        if (event.removed) {
          this._list.unmount();
        }
      }.bind(this)
    );

    this._table = {
      filter: new PullRequestTableFilter(this._filter),
      content: new PullRequestTable(
        new LabelsCellProvider(
          context.getProjectID(),
          context.getRepositoryID(),
          api
        )
      )
    };

    this._table.filter.mount(this._$.find(".filter-bar"));
    this._table.content.mount(this._$);
  };

  this.mount = function() {
    $.when(
      api.getByRepository(context.getProjectID(), context.getRepositoryID())
    )
      .done(
        function(response) {
          this._render(response.labels);
        }.bind(this)
      )
      .fail(
        function(e) {
          if (e.status == 401) {
            InvalidLicenseNagbar.show();
          } else {
            throw e;
          }
        }.bind(this)
      );

    return this;
  };

  return this;
};

var ViewPullRequestDetails = function(context, api) {
  const summaryPanelSelector = ".pull-request-overview .summary-panel";
  this._$ = $(summaryPanelSelector);
  var pr = context.getPullRequestID();
  if (!pr) {
    return new ViewNotApplicable();
  }

  this._labels = {
    all: [],
    pr: []
  };

  this._render = function() {
    if (this._panel && this._panel.is(":visible")) {
      return;
    }

    this._panel = new LabelsPanel({
      allowNew: true,

      query: function(_) {
        return this._labels.all;
      }.bind(this),

      add: function(candidate) {
        var found = false;
        $.each(this._labels.all, function(_, label) {
          if (label.name == candidate.name) {
            found = true;
          }
        });

        if (!found) {
          candidate.color = WellKnownColors.Random();
        }

        return api
          .addLabel(
            context.getProjectID(),
            context.getRepositoryID(),
            context.getPullRequestID(),
            candidate
          )
          .done(
            function(response) {
              if (!found) {
                candidate.id = response.id;
                this._labels.all.push(candidate);
              }
            }.bind(this)
          );
      }.bind(this),

      remove: function(label) {
        return api.removeLabel(
          context.getProjectID(),
          context.getRepositoryID(),
          context.getPullRequestID(),
          label
        );
      }.bind(this),

      update: function(label) {
        return api.updateLabel(
          context.getProjectID(),
          context.getRepositoryID(),
          label
        );
      }.bind(this)
    });

    $.each(
      this._labels.pr,
      function(_, label) {
        this._panel.label(label);
      }.bind(this)
    );

    this._$.append(this._panel);
  };

  this._mounting = false;
  this._mount = function() {
    if (this._mounting) {
      return;
    }

    this._mounting = true;

    $.when(
      api.getByRepository(context.getProjectID(), context.getRepositoryID()),
      api.getByPullRequest(
        context.getProjectID(),
        context.getRepositoryID(),
        context.getPullRequestID()
      )
    )
      .done(
        function(getByRepositoryXHR, getByPullRequestXHR) {
          this._labels.all = getByRepositoryXHR[0].labels;
          this._labels.pr = getByPullRequestXHR[0].labels;

          this._render();
          this._mounting = false;
        }.bind(this)
      )
      .fail(
        function(e) {
          if (e.status == 401) {
            InvalidLicenseNagbar.show();
          } else {
            throw e;
          }
        }.bind(this)
      );

    return this;
  };

  this.mount = function() {
    var root = $(".aui-page-panel-inner");

    var observer = new Observer(
      "#pull-requests-container, .summary-panel",
      function(target) {
        this._$ = $(summaryPanelSelector);
        this._mount();
      }.bind(this)
    );

    observer.observe(root);
  };

  return this;
};

var ViewDashboard = function(context, api) {
  this._$ = $("table.dashboard-pull-requests-table");
  if (this._$.length == 0) {
    return new ViewNotApplicable();
  }

  this._provider = new LabelsCellProviderDynamic(this._$, api);

  this.mount = function() {
    this._$.each(
      function(_, container) {
        var link = $(container).find("td div.title a");
        var project = link.data("project-id");
        var repository = link.data("repository-id");

        new PullRequestTable(
          new LabelsCellProvider(project, repository, api)
        ).mount($(container));
      }.bind(this)
    );
  };

  return this;
};
