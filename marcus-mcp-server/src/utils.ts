import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

export const layout = (content: HtmlEscapedString | string, title: string) => html`
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="UTF-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<title>${title}</title>
			<link rel="preconnect" href="https://fonts.googleapis.com" />
			<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
			<link
				href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Lora:ital,wght@0,400;0,500;1,400;1,500&family=JetBrains+Mono:wght@400;500&display=swap"
				rel="stylesheet"
			/>
			<style>
				/* ── Design tokens ──────────────────────────────────────── */
				:root {
					--bg:       #0e0c0b;
					--surface:  #181512;
					--text:     #ede8df;
					--muted:    rgba(237,232,223,.55);
					--subtle:   rgba(237,232,223,.25);
					--accent:   #d4922a;
					--accent-d: rgba(212,146,42,.1);
					--sage:     #6b9e72;
					--hair:     rgba(237,232,223,.07);
					--glass:    rgba(14,12,11,.82);

					--f-display: 'Syne',system-ui,sans-serif;
					--f-body:    'Lora',Georgia,serif;
					--f-mono:    'JetBrains Mono','Fira Code',monospace;

					--tx-xs:   clamp(.6875rem,.3vw + .6rem,.75rem);
					--tx-sm:   clamp(.8125rem,.3vw + .72rem,.875rem);
					--tx-base: clamp(.9375rem,.3vw + .85rem,1.0625rem);
					--tx-lg:   clamp(1.125rem,.5vw + 1rem,1.3125rem);
					--tx-xl:   clamp(1.375rem,1.5vw + 1rem,1.875rem);
					--tx-2xl:  clamp(1.875rem,3vw + 1rem,2.75rem);
					--tx-3xl:  clamp(2.5rem,5vw + 1rem,4.5rem);

					--ease: cubic-bezier(.16,1,.3,1);
				}

				/* ── Reset ──────────────────────────────────────────────── */
				*, *::before, *::after { box-sizing: border-box; margin: 0; }

				html {
					color-scheme: dark;
					scroll-behavior: smooth;
				}

				@media (prefers-reduced-motion: reduce) {
					*, *::before, *::after {
						animation-duration: .01ms !important;
						transition-duration: .01ms !important;
					}
				}

				/* ── Base ───────────────────────────────────────────────── */
				body {
					background: var(--bg);
					color: var(--text);
					font-family: var(--f-body);
					font-size: var(--tx-base);
					font-weight: 400;
					line-height: 1.7;
					-webkit-font-smoothing: antialiased;
					min-height: 100dvh;
					display: flex;
					flex-direction: column;
				}

				/* Film grain overlay */
				body::after {
					content: '';
					position: fixed;
					inset: 0;
					pointer-events: none;
					background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='.04'/%3E%3C/svg%3E");
					background-size: 200px;
					mix-blend-mode: overlay;
					z-index: 9999;
				}

				/* ── Shell ──────────────────────────────────────────────── */
				.shell {
					width: 100%;
					max-width: 1120px;
					margin-inline: auto;
					padding-inline: clamp(1rem,4vw,2rem);
				}

				/* ── Header ─────────────────────────────────────────────── */
				.site-header {
					position: sticky;
					top: 0;
					z-index: 20;
					border-bottom: 1px solid var(--hair);
					background: var(--glass);
					backdrop-filter: blur(16px) saturate(1.4);
					-webkit-backdrop-filter: blur(16px) saturate(1.4);
				}

				.site-header__inner {
					display: flex;
					align-items: center;
					gap: 1rem;
					padding-block: 1.125rem;
				}

				.site-logo {
					font-family: var(--f-display);
					font-style: italic;
					font-size: 1.4375rem;
					font-weight: 600;
					letter-spacing: -.015em;
					color: var(--text);
					text-decoration: none;
					transition: color 150ms ease;
				}

				.site-logo:hover { color: var(--accent); }

				.site-header__pill {
					font-family: var(--f-mono);
					font-size: .625rem;
					letter-spacing: .1em;
					text-transform: uppercase;
					color: var(--muted);
					border: 1px solid rgba(237,232,223,.22);
					border-radius: 2px;
					padding: .2em .6em;
					line-height: 1;
				}

				/* ── Main ───────────────────────────────────────────────── */
				.site-main {
					flex: 1;
					padding-block: clamp(2.5rem,6vw,5rem) 6rem;
				}

				/* ── Footer ─────────────────────────────────────────────── */
				.site-footer {
					border-top: 1px solid var(--hair);
					padding-block: 1.5rem;
				}

				.site-footer__row {
					display: flex;
					align-items: center;
					justify-content: center;
					flex-wrap: wrap;
					gap: .5rem 1rem;
				}

				.site-footer__item {
					font-family: var(--f-mono);
					font-size: var(--tx-xs);
					letter-spacing: .07em;
					color: var(--subtle);
				}

				.site-footer__sep {
					width: 3px;
					height: 3px;
					border-radius: 50%;
					background: var(--hair);
					flex-shrink: 0;
				}

				/* ── Animations ─────────────────────────────────────────── */
				@keyframes reveal {
					from { opacity: 0; transform: translateY(12px); }
					to   { opacity: 1; transform: none; }
				}

				/* ── Landing page ──────────────────────────────────────── */
				.hero {
					display: grid;
					gap: clamp(2rem,4vw,4rem);
					padding-block: clamp(3rem,6vw,6rem);
					align-items: center;
				}
				@media (min-width: 880px) {
					.hero { grid-template-columns: 1fr 1.1fr; }
				}
				.hero h1 {
					font-family: var(--f-display);
					font-size: var(--tx-3xl);
					font-weight: 800;
					letter-spacing: -.03em;
					line-height: .98;
					margin-bottom: 1.25rem;
					animation: reveal .7s var(--ease) both;
				}
				.hero .lede {
					font-family: var(--f-body);
					font-size: var(--tx-lg);
					font-style: italic;
					color: var(--muted);
					line-height: 1.65;
					margin-bottom: 2rem;
					animation: reveal .7s var(--ease) 80ms both;
				}
				.hero__art {
					width: 100%;
					border-radius: 8px;
					border: 1px solid var(--hair);
					animation: reveal .9s var(--ease) 120ms both;
				}
				.cta {
					display: flex;
					flex-wrap: wrap;
					gap: .75rem;
					animation: reveal .7s var(--ease) 160ms both;
				}
				.cta--primary {
					background: var(--accent);
					color: #0e0c0b;
					padding: .85rem 1.4rem;
					border-radius: 6px;
					font-family: var(--f-display);
					font-weight: 600;
					font-size: var(--tx-sm);
					letter-spacing: .01em;
					text-decoration: none;
					transition: opacity 150ms ease;
				}
				.cta--primary:hover { opacity: .88; }
				.cta--secondary {
					color: var(--text);
					padding: .85rem 1.1rem;
					border: 1px solid var(--hair);
					border-radius: 6px;
					font-family: var(--f-display);
					font-weight: 500;
					font-size: var(--tx-sm);
					text-decoration: none;
					transition: border-color 150ms ease;
				}
				.cta--secondary:hover { border-color: rgba(237,232,223,.22); }

				.section {
					padding-block: clamp(3rem,5vw,5rem);
					border-top: 1px solid var(--hair);
				}
				.section__eyebrow {
					font-family: var(--f-mono);
					font-size: var(--tx-xs);
					letter-spacing: .1em;
					text-transform: uppercase;
					color: var(--accent);
					margin-bottom: .875rem;
				}
				.section h2 {
					font-family: var(--f-display);
					font-size: var(--tx-2xl);
					font-weight: 700;
					letter-spacing: -.02em;
					line-height: 1.1;
					margin-bottom: 1.5rem;
				}
				.section p {
					color: var(--muted);
					line-height: 1.78;
					max-width: 640px;
					margin-bottom: 1.125rem;
				}
				.section__img {
					width: 100%;
					max-width: 840px;
					border-radius: 8px;
					border: 1px solid var(--hair);
					margin-block: 2rem;
					display: block;
				}
				.section__img--center { margin-inline: auto; }

				.steps-row {
					display: grid;
					gap: 1.5rem;
					margin-block: 2rem;
				}
				@media (min-width: 680px) {
					.steps-row { grid-template-columns: repeat(3, 1fr); }
				}
				.step {
					background: var(--surface);
					border: 1px solid var(--hair);
					border-radius: 6px;
					padding: 1.5rem;
				}
				.step__num {
					font-family: var(--f-mono);
					font-size: var(--tx-xs);
					letter-spacing: .1em;
					color: var(--subtle);
					display: block;
					margin-bottom: .75rem;
				}
				.step h3 {
					font-family: var(--f-display);
					font-size: var(--tx-lg);
					font-weight: 700;
					letter-spacing: -.01em;
					margin-bottom: .5rem;
				}
				.step p {
					max-width: none;
					font-size: var(--tx-sm);
					margin-bottom: 0;
				}

				.connect-steps {
					padding-left: 0;
					list-style: none;
					counter-reset: steps;
					display: grid;
					gap: 1.25rem;
					margin-block: 2rem;
					max-width: 640px;
				}
				.connect-steps li {
					counter-increment: steps;
					position: relative;
					padding-left: 2.625rem;
					color: var(--muted);
					line-height: 1.7;
				}
				.connect-steps li::before {
					content: counter(steps);
					font-family: var(--f-mono);
					font-size: var(--tx-xs);
					color: var(--accent);
					background: var(--accent-d);
					border-radius: 50%;
					width: 1.75rem;
					height: 1.75rem;
					position: absolute;
					left: 0;
					top: .2rem;
					display: flex;
					align-items: center;
					justify-content: center;
				}
				.connect-steps a { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
				.connect-steps code {
					font-family: var(--f-mono);
					font-size: .8rem;
					color: var(--accent);
					background: var(--accent-d);
					padding: .15em .45em;
					border-radius: 3px;
				}

				.tools-table {
					width: 100%;
					border-collapse: collapse;
					margin-block: 1.75rem;
					font-size: var(--tx-sm);
				}
				.tools-table th {
					font-family: var(--f-mono);
					font-size: var(--tx-xs);
					letter-spacing: .09em;
					text-transform: uppercase;
					font-weight: 500;
					color: var(--subtle);
					padding: .625rem .875rem;
					border-bottom: 1px solid rgba(237,232,223,.12);
					text-align: left;
				}
				.tools-table td {
					padding: .625rem .875rem;
					border-bottom: 1px solid var(--hair);
					color: var(--muted);
					vertical-align: top;
				}
				.tools-table td:first-child {
					font-family: var(--f-mono);
					font-size: .8rem;
					color: var(--accent);
					white-space: nowrap;
				}

				.privacy-block {
					background: var(--surface);
					border: 1px solid var(--hair);
					border-radius: 8px;
					padding: 1.75rem 2rem;
					max-width: 640px;
					margin-block: 1.5rem;
				}
				.privacy-block p { margin-bottom: .875rem; }
				.privacy-block p:last-child { margin-bottom: 0; }
				.privacy-block a { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }

				/* ── Prose (markdown) ───────────────────────────────────── */
				.prose {
					max-width: 640px;
					margin-inline: auto;
				}

				.prose h1 {
					font-family: var(--f-display);
					font-size: clamp(2rem,3vw + .75rem,3rem);
					font-weight: 800;
					line-height: 1.0;
					letter-spacing: -.03em;
					color: var(--text);
					margin-bottom: 1.25rem;
					animation: reveal .7s var(--ease) both;
				}

				.prose > p:first-of-type {
					font-family: var(--f-body);
					font-size: var(--tx-lg);
					font-style: italic;
					color: rgba(237,232,223,.72);
					line-height: 1.65;
					margin-bottom: 1.5rem;
					animation: reveal .7s var(--ease) 80ms both;
				}

				.prose h2 {
					font-family: var(--f-display);
					font-size: var(--tx-2xl);
					font-weight: 700;
					line-height: 1.15;
					letter-spacing: -.02em;
					color: var(--text);
					margin-top: 4rem;
					margin-bottom: .875rem;
					padding-left: .875rem;
					border-left: 2px solid var(--accent);
				}

				.prose h3 {
					font-family: var(--f-display);
					font-size: var(--tx-xl);
					font-weight: 600;
					line-height: 1.3;
					letter-spacing: -.01em;
					color: var(--text);
					margin-top: 2.25rem;
					margin-bottom: .5rem;
				}

				.prose p {
					color: var(--muted);
					line-height: 1.78;
					margin-bottom: 1.125rem;
				}

				.prose a {
					color: var(--accent);
					text-decoration: underline;
					text-decoration-thickness: 1px;
					text-decoration-color: rgba(212,146,42,.3);
					text-underline-offset: 3px;
					transition: text-decoration-color 150ms ease;
				}

				.prose a:hover { text-decoration-color: var(--accent); }

				.prose hr {
					border: 0;
					height: 1px;
					background: var(--hair);
					margin-block: 3.5rem;
				}

				.prose blockquote {
					border-left: 2px solid var(--accent);
					padding: .75rem 0 .75rem 1.375rem;
					margin-block: 2rem;
					background: rgba(212,146,42,.04);
					border-radius: 0 3px 3px 0;
				}

				.prose blockquote p {
					font-family: var(--f-body);
					font-style: italic;
					font-size: var(--tx-lg);
					line-height: 1.6;
					color: rgba(237,232,223,.8);
					margin-bottom: 0;
				}

				.prose ul, .prose ol {
					padding-left: 1.375rem;
					margin-bottom: 1.125rem;
				}

				.prose li {
					color: var(--muted);
					line-height: 1.7;
					margin-bottom: .35rem;
				}

				.prose ul li { list-style-type: disc; }
				.prose ol li { list-style-type: decimal; }

				.prose pre {
					background: var(--surface);
					border: 1px solid var(--hair);
					border-radius: 4px;
					padding: 1.125rem 1.375rem;
					margin-block: 1.5rem;
					overflow-x: auto;
					font-family: var(--f-mono);
					font-size: .7875rem;
					line-height: 1.65;
					color: rgba(237,232,223,.7);
				}

				.prose code {
					font-family: var(--f-mono);
					font-size: .8rem;
					color: var(--accent);
					background: var(--accent-d);
					padding: .15em .45em;
					border-radius: 3px;
				}

				.prose pre code {
					background: none;
					padding: 0;
					color: inherit;
					font-size: inherit;
				}

				.prose table {
					width: 100%;
					border-collapse: collapse;
					margin-block: 1.75rem;
				}

				.prose th {
					font-family: var(--f-mono);
					font-size: var(--tx-xs);
					letter-spacing: .09em;
					text-transform: uppercase;
					font-weight: 500;
					color: var(--subtle);
					padding: .625rem .875rem;
					border-bottom: 1px solid rgba(237,232,223,.12);
					text-align: left;
				}

				.prose td {
					padding: .625rem .875rem;
					border-bottom: 1px solid var(--hair);
					color: var(--muted);
					font-size: var(--tx-sm);
					vertical-align: top;
				}

				.prose img {
					max-width: 100%;
					border-radius: 4px;
					border: 1px solid var(--hair);
					display: block;
					margin-block: 1.5rem;
				}
			</style>
		</head>
		<body>
			<header class="site-header">
				<div class="shell site-header__inner">
					<a href="/" class="site-logo">Marcus.</a>
					<span class="site-header__pill">Second Brain</span>
				</div>
			</header>
			<main class="site-main">
				<div class="shell">${content}</div>
			</main>
			<footer class="site-footer">
				<div class="shell site-footer__row">
					<span class="site-footer__item">Marcus</span>
					<span class="site-footer__sep" aria-hidden="true"></span>
					<span class="site-footer__item">Second Brain</span>
					<span class="site-footer__sep" aria-hidden="true"></span>
					<span class="site-footer__item">MIT</span>
					<span class="site-footer__sep" aria-hidden="true"></span>
					<span class="site-footer__item">${new Date().getFullYear()}</span>
				</div>
			</footer>
		</body>
	</html>
`;

export const homeContent = async (_req: Request): Promise<HtmlEscapedString> => html`
	<section class="hero">
		<div class="hero__copy">
			<h1>Marcus - Your Automatic Second Brain</h1>
			<p class="lede">Conversations with Claude, ChatGPT, and Perplexity become structured markdown memory in your own GitHub repo.</p>
			<div class="cta">
				<a class="cta--primary" href="#connect">Connect Marcus →</a>
				<a class="cta--secondary" href="#how">How it works</a>
			</div>
		</div>
		<img class="hero__art" src="/img/hero-flow.png" alt="Claude, ChatGPT, and Perplexity conversations flowing through Marcus into a GitHub repo" />
	</section>

	<section id="how" class="section">
		<p class="section__eyebrow">How it works</p>
		<h2>Three steps to automate your second brain</h2>
		<div class="steps-row">
			<div class="step">
				<span class="step__num">01</span>
				<h3>Capture</h3>
				<p>Every conversation you have with Claude, ChatGPT, or Perplexity is a source. Marcus listens for meaningful exchanges.</p>
			</div>
			<div class="step">
				<span class="step__num">02</span>
				<h3>Extract</h3>
				<p>Marcus identifies topics, decisions, and context — structuring raw conversation into linked markdown notes.</p>
			</div>
			<div class="step">
				<span class="step__num">03</span>
				<h3>Write to GitHub</h3>
				<p>Notes land directly in your private GitHub repo via short-lived installation tokens. Marcus never stores your content.</p>
			</div>
		</div>
		<img class="section__img section__img--center" src="/img/network-graph.png" alt="Visual network of linked notes, projects, people, and decisions" />
	</section>

	<section class="section">
		<p class="section__eyebrow">Memory</p>
		<h2>Grows with every conversation</h2>
		<p>Each note Marcus writes is linked to related notes — people, projects, decisions, research. Over time your vault becomes a searchable second brain that any AI can read and reason over.</p>
		<p>Because notes live as plain markdown in your GitHub repo, you own them forever. Export, search, or build on them with any tool.</p>
	</section>

	<section id="connect" class="section">
		<p class="section__eyebrow">Get started</p>
		<h2>Connect in 4 steps</h2>
		<ol class="connect-steps">
			<li>Go to <a href="https://claude.ai/settings/connectors">claude.ai/settings/connectors</a> and click <strong>Add custom connector</strong>.</li>
			<li>Paste <code>https://marcus-mcp-server.r-df5.workers.dev/mcp</code> in the URL field, name it <strong>Marcus Second Brain</strong>, and click Add.</li>
			<li>Sign in with GitHub. Marcus creates a private <code>marcus-vault</code> repo in your account and requests access to that repo only.</li>
			<li>Open a new Claude chat, click <strong>+</strong> → Connectors → enable Marcus. Ask Claude: <em>"Save this to my second brain."</em></li>
		</ol>
		<img class="section__img section__img--center" src="/img/add-connector.png" alt="Add custom connector dialog in Claude with Marcus URL" />
	</section>

	<section class="section">
		<p class="section__eyebrow">Tools</p>
		<h2>What Marcus can do</h2>
		<table class="tools-table">
			<thead>
				<tr><th>Tool</th><th>What it does</th></tr>
			</thead>
			<tbody>
				<tr><td>create_note</td><td>Save a new note to your vault</td></tr>
				<tr><td>update_note</td><td>Edit an existing note (replace, append, or prepend)</td></tr>
				<tr><td>get_note</td><td>Read a specific note</td></tr>
				<tr><td>search_notes</td><td>Search across all your notes</td></tr>
				<tr><td>list_structure</td><td>See your vault folder structure</td></tr>
				<tr><td>append_to_daily_note</td><td>Add an entry to today's daily note</td></tr>
				<tr><td>link_notes</td><td>Connect two notes with a wikilink</td></tr>
				<tr><td>get_recent_notes</td><td>Get your most recently updated notes</td></tr>
				<tr><td>delete_note</td><td>Archive or permanently delete a note</td></tr>
			</tbody>
		</table>
	</section>

	<section class="section">
		<p class="section__eyebrow">Privacy &amp; Open Source</p>
		<h2>Your data, your repo</h2>
		<div class="privacy-block">
			<p>Marcus is contentless by design. Your note content never passes through or is stored on Marcus servers. Marcus only stores a mapping from your Marcus user ID to your GitHub App installation ID, and short-lived OAuth tokens (TTL 24h).</p>
			<p>All writes go directly from Marcus to your private GitHub repository via short-lived installation tokens. The server is <a href="https://github.com/romacv/marcus-source-code">MIT-licensed and open source</a>.</p>
			<p>To revoke access: go to <a href="https://github.com/settings/installations">github.com/settings/installations</a>, find Marcus, and click Uninstall. Your vault repo and all notes stay in your GitHub account.</p>
		</div>
	</section>
`;
