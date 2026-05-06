import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import type { MarkusEnv } from "./index";
import {
	homeContent,
	layout,
	parseApproveFormBody,
	renderAuthorizationApprovedContent,
	renderAuthorizationRejectedContent,
	renderLoggedInAuthorizeScreen,
	renderLoggedOutAuthorizeScreen,
} from "./utils";

export type Bindings = MarkusEnv & {
	OAUTH_PROVIDER: OAuthHelpers;
};

const app = new Hono<{
	Bindings: Bindings;
}>();

// Render a basic homepage placeholder to make sure the app is up
app.get("/", async (c) => {
	const content = await homeContent(c.req.raw);
	return c.html(layout(content, "MCP Remote Auth Demo - Home"));
});

// P2: /authorize will redirect to GitHub OAuth instead of showing a form.
// For now (P1 skeleton) it shows the demo form so the OAuth flow is testable end-to-end.
app.get("/authorize", async (c) => {
	// TODO(P2): redirect to GitHub OAuth
	// const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
	// const state = encodeURIComponent(JSON.stringify(oauthReqInfo));
	// const githubUrl = `https://github.com/login/oauth/authorize?client_id=${c.env.GITHUB_CLIENT_ID}&scope=repo&state=${state}`;
	// return c.redirect(githubUrl);

	const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
	const oauthScopes = [
		{ name: "vault:read", description: "Read notes from your Markus vault" },
		{ name: "vault:write", description: "Create and update notes in your Markus vault" },
	];
	const content = await renderLoggedOutAuthorizeScreen(oauthScopes, oauthReqInfo);
	return c.html(layout(content, "Markus - Authorization"));
});

// The /authorize page has a form that will POST to /approve
// This endpoint is responsible for validating any login information and
// then completing the authorization request with the OAUTH_PROVIDER
app.post("/approve", async (c) => {
	const {
		action,
		oauthReqInfo,
		email,
		password: _password,
	} = await parseApproveFormBody(await c.req.parseBody());

	if (!oauthReqInfo) {
		return c.html("INVALID LOGIN", 401);
	}

	// If the user needs to both login and approve, we should validate the login first
	if (action === "login_approve") {
		// We'll allow any values for email and password for this demo
		// but you could validate them here
		// Ex:
		// if (email !== "user@example.com" || password !== "password") {
		// eslint-disable-next-line no-constant-condition -- This is a demo
		if (false) {
			return c.html(
				layout(
					await renderAuthorizationRejectedContent("/"),
					"MCP Remote Auth Demo - Authorization Status",
				),
			);
		}
	}

	// The user must be successfully logged in and have approved the scopes, so we
	// can complete the authorization request
	const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
		request: oauthReqInfo,
		userId: email,
		metadata: {
			label: "Test User",
		},
		scope: oauthReqInfo.scope,
		props: {
			userEmail: email,
		},
	});

	return c.html(
		layout(
			await renderAuthorizationApprovedContent(redirectTo),
			"MCP Remote Auth Demo - Authorization Status",
		),
	);
});

// P2: GitHub OAuth callback — exchanges code for installation token, stores in KV,
// then calls OAUTH_PROVIDER.completeAuthorization() with MarkusProps.
// TODO(P2): implement this route.
app.get("/auth/github/callback", async (c) => {
	return c.text("GitHub OAuth callback — P2 not yet implemented", 501);
});

// Version endpoint — exposes deployed git SHA for reproducibility claims.
app.get("/version", (c) => {
	return c.json({ version: "0.1.0", sha: "local-dev" });
});

export default app;
