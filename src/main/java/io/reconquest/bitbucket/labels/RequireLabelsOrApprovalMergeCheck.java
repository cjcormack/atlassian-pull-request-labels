package io.reconquest.bitbucket.labels;

import com.atlassian.activeobjects.external.ActiveObjects;
import com.atlassian.bitbucket.hook.repository.PreRepositoryHookContext;
import com.atlassian.bitbucket.hook.repository.PullRequestMergeHookRequest;
import com.atlassian.bitbucket.hook.repository.RepositoryHookResult;
import com.atlassian.bitbucket.hook.repository.RepositoryMergeCheck;
import com.atlassian.bitbucket.project.Project;
import com.atlassian.bitbucket.pull.PullRequest;
import com.atlassian.bitbucket.pull.PullRequestParticipant;
import com.atlassian.bitbucket.repository.Repository;
import com.atlassian.plugin.spring.scanner.annotation.imports.ComponentImport;
import io.reconquest.bitbucket.labels.dao.LabelDao;

import jakarta.annotation.Nonnull;
import jakarta.inject.Inject;

import static java.util.Objects.requireNonNull;

public class RequireLabelsOrApprovalMergeCheck implements RepositoryMergeCheck {
    private final LabelDao dao;

    @Inject
    public RequireLabelsOrApprovalMergeCheck(
            @ComponentImport ActiveObjects ao
    ) {
        this.dao = new LabelDao(requireNonNull(ao));
    }

    @Nonnull
    @Override
    public RepositoryHookResult preUpdate(@Nonnull PreRepositoryHookContext context, @Nonnull PullRequestMergeHookRequest request) {
        int requiredApprovals = context.getSettings().getInt("approvals", 0);

        PullRequest pullRequest = request.getPullRequest();

        String rawOverridingLabels = context.getSettings().getString("overridingLabels");
        String extraMessage = "";
        if (rawOverridingLabels != null) {
            String[] overridingLabels = rawOverridingLabels.split("\\s*,\\s*");

            extraMessage = " Can be overridden with one of the following labels: " + String.join(", ", overridingLabels);

            if (doesPullRequestHaveLabel(overridingLabels, request)) {
                requiredApprovals = 0;
            }
        }

        int acceptedCount = 0;
        for (PullRequestParticipant reviewer : pullRequest.getReviewers()) {
            acceptedCount = acceptedCount + (reviewer.isApproved() ? 1 : 0);
        }
        if (acceptedCount < requiredApprovals) {
            String message = "You still need " + requiredApprovals + " approval" + (requiredApprovals == 1 ? "" : "s") + " before this pull request can be merged." + extraMessage;

            return RepositoryHookResult.rejected("Insufficient approvals", message);
        }
        return RepositoryHookResult.accepted();
    }

    private boolean doesPullRequestHaveLabel(@Nonnull String[] overridingLabels, @Nonnull PullRequestMergeHookRequest request) {
        PullRequest pullRequest = request.getPullRequest();
        Repository repository = request.getRepository();
        Project project = repository.getProject();

        Label[] labels = dao.find(project.getId(), repository.getId(), pullRequest.getId());
        if (labels.length == 0) {
            return false;
        }

        for (String overridingLabel : overridingLabels) {
            for (Label label : labels) {
                if (overridingLabel.equals(label.getName())) {
                    return true;
                }
            }
        }

        return false;
    }
}
