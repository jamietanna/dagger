package sdk

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/dagger/dagger/internal/mage/util"

	"dagger.io/dagger"
	"github.com/magefile/mage/mg"
)

var _ SDK = PHP{}

type PHP mg.Namespace

// Lint lints the PHP SDK
func (PHP) Lint(_ context.Context) error {
	// TODO
	return nil
}

// Test tests the PHP SDK
func (PHP) Test(_ context.Context) error {
	// TODO
	return nil
}

// Generate re-generates the SDK API
func (t PHP) Generate(ctx context.Context) error {
	// TODO
	return nil
}

// Publish publishes the PHP SDK
func (t PHP) Publish(ctx context.Context, tag string) error {
	c, err := dagger.Connect(ctx, dagger.WithLogOutput(os.Stderr))
	if err != nil {
		return err
	}
	defer c.Close()

	c = c.Pipeline("sdk").Pipeline("php").Pipeline("publish")

	var targetTag = strings.TrimPrefix(tag, "sdk/php/")

	var targetRepo = os.Getenv("TARGET_REPO")
	if targetRepo == "" {
		targetRepo = "https://github.com/dagger/dagger-php-sdk.git"
	}

	var pat = os.Getenv("GITHUB_PAT")
	if pat == "" {
		return errors.New("GITHUB_PAT environment variable must be set")
	}
	encodedPAT := base64.URLEncoding.EncodeToString([]byte("pat:" + pat))

	var gitUserName = os.Getenv("GIT_USER_NAME")
	if gitUserName == "" {
		gitUserName = "dagger-ci"
	}

	var gitUserEmail = os.Getenv("GIT_USER_EMAIL")
	if gitUserEmail == "" {
		gitUserEmail = "hello@dagger.io"
	}

	_, err = util.GoBase(c).
		WithExec([]string{"apk", "add", "-U", "--no-cache", "git"}).
		WithExec([]string{"git", "config", "--global", "user.name", gitUserName}).
		WithExec([]string{"git", "config", "--global", "user.email", gitUserEmail}).
		WithSecretVariable("GITHUB_PAT", c.SetSecret("GITHUB_PAT", encodedPAT)).
		WithExec([]string{
			"sh", "-c",
			`git config --global http.https://github.com/.extraheader "AUTHORIZATION: Basic $GITHUB_PAT"`,
		}).
		WithExec([]string{"git", "clone", "https://github.com/dagger/dagger.git", "/src/dagger"}).
		WithWorkdir("/src/dagger").
		WithEnvVariable("FILTER_BRANCH_SQUELCH_WARNING", "1").
		WithExec([]string{
			"git", "filter-branch", "-f", "--prune-empty",
			"--subdirectory-filter", "sdk/php",
			"--", tag,
		}).
		WithExec([]string{
			"git",
			"push",
			"-f",
			targetRepo,
			fmt.Sprintf("%s:%s", tag, targetTag),
		}).Sync(ctx)

	return err
}

// Bump the PHP SDK's Engine dependency
func (PHP) Bump(_ context.Context, version string) error {
	// trim leading v from version
	version = strings.TrimPrefix(version, "v")
	content := fmt.Sprintf(`<?php /* Code generated by dagger. DO NOT EDIT. */ return '%s';
`, version)

	return os.WriteFile("sdk/php/src/Connection/version.php", []byte(content), 0o600)
}
