package io.reconquest.bitbucket.labels.mergeCheck;

import com.atlassian.bitbucket.scope.Scope;
import com.atlassian.bitbucket.setting.Settings;
import com.atlassian.bitbucket.setting.SettingsValidationErrors;
import com.atlassian.bitbucket.setting.SettingsValidator;

import jakarta.annotation.Nonnull;

public class Validator implements SettingsValidator {
    @Override
    public void validate(@Nonnull Settings settings, @Nonnull SettingsValidationErrors errors, @Nonnull Scope scope) {
        try {
            if (settings.getInt("approvals", 0) < 1) {
                errors.addFieldError("approvals", "Number of approvals must be greater than one");
            }
        } catch (NumberFormatException e) {
            errors.addFieldError("approvals", "Number of approvals must be a number");
        }

        String overridingLabels = settings.getString("overridingLabels");

        if (overridingLabels == null || overridingLabels.isEmpty()) {
            errors.addFieldError("overridingLabels", "Override labels cannot be empty");
        }
    }
}
