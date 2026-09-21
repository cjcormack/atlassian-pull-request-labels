# Atlassian Bitbucket Pull Request Labels by Reconquest

[Documentation](https://labels.reconquest.io/)

![screenshot](https://labels.reconquest.io/images/applied-labels-filter.png)

A Bitbucket Server app that enables you to add labels to your pull requests.

If you're looking for the ready-to-use app, it is available on the [Atlassian Marketplace](https://marketplace.atlassian.com/apps/1219710/pull-request-labels-by-reconquest?hosting=server&tab=overview).

## Support

Please [open an issue](https://github.com/reconquest/bitbucket-labels/issues/new) for support.

You can always join our Slack community and drop us a line there: [slack.reconquest.io](https://slack.reconquest.io/)

## Building a Distribution

This fork is built and installed by hand, not through the Marketplace. Build it,
sign it, then upload it.

```
atlas-mvn clean package
make sign
```

The first command writes `target/labels-<version>.jar`. Always include `clean`:
the build unpacks dependencies into `target/classes`, and stale classes left
there can shadow the real ones and produce confusing test failures.

The second command prints a base64 signature and also writes it next to the jar
as a `.pem`. To put it straight on the clipboard:

```
make sign 2>/dev/null | pbcopy
```

In Bitbucket, go to **Administration → Manage apps → Upload app**, choose the
jar as the plugin file, and paste the signature into the **Signature** field.
The plugin key does not change between versions, so this upgrades in place and
leaves existing label data alone.

### Why Signing Is Required

Bitbucket 10 ships Universal Plugin Manager 8, which verifies app signatures by
default. Bitbucket 9 did not check at all. Without a signature the upload fails
with `Signature check failed!`.

Atlassian does not issue certificates for in-house apps, so we self-sign. The
certificate has to be trusted by the instance: install `signing/app-signing.crt`
into `upmconfig/truststore/` under the Bitbucket home directory, or the shared
home on Data Center. The truststore must **not** be owned by, or writable by,
the user running Bitbucket, or a safety check rejects the whole thing.

### The Signing Key

The private key is **not** in this repository. It lives in 1Password:

```
op item get 36sd5n22bd7iejqpydvcwqg73e
```

Restore it to `signing/app-signing.key` before signing. Anyone holding it can
build an app this Bitbucket will trust, so treat it accordingly. `*.key` is
gitignored across the whole tree to keep it from being committed by accident.

The matching certificate is public. Commit it as `signing/app-signing.crt` so
that deploying to the truststore does not need access to the key. It expires 700
days after creation, and when it lapses installs start failing with the same
signature error. `make sign` warns 60 days out and refuses to sign once it has
expired.

To create a new key and certificate from scratch, run `make sign-init`. It will
not overwrite an existing key, because a new one invalidates every signature
made with the old one and every instance trusting the old certificate.

## Running Locally

After setup, Bitbucket instance will be available at https://bitbucket.local/.

Requirements:

* Docker
* [Task](https://taskfile.dev)
* [stacket](https://github.com/kovetskiy/stacket/)
* [Atlassian Plugin SDK](https://aur.archlinux.org/packages/atlassian-plugin-sdk-latest/)
    * add `/opt/atlassian/plugin-sdk/bin/` to the `$PATH`

### Run Dev Bitbucket Instance

```
task version=<target-bitbucket-version> docker:run
task nginx:run
```

### Add `bitbucket.local` to `/etc/hosts`

```
127.0.0.1 bitbucket.local
```

### Compile and Install Plugin

```
task version=<target-bitbucket-version> js=batch.loader.js atlas:install
```

## License

This project is licensed under the GNU General Public License version 2.
