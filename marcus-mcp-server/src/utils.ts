import { env } from "cloudflare:workers";
import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import { marked } from "marked";

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
					<span class="site-header__pill">Auto Second Brain</span>
				</div>
			</header>
			<main class="site-main">
				<div class="shell">${content}</div>
			</main>
			<footer class="site-footer">
				<div class="shell site-footer__row">
					<span class="site-footer__item">Marcus</span>
					<span class="site-footer__sep" aria-hidden="true"></span>
					<span class="site-footer__item">Auto Second Brain</span>
					<span class="site-footer__sep" aria-hidden="true"></span>
					<span class="site-footer__item">MIT</span>
					<span class="site-footer__sep" aria-hidden="true"></span>
					<span class="site-footer__item">${new Date().getFullYear()}</span>
				</div>
			</footer>
		</body>
	</html>
`;

export const homeContent = async (req: Request): Promise<HtmlEscapedString> => {
	const origin = new URL(req.url).origin;
	const res = await env.ASSETS.fetch(`${origin}/README.md`);
	const markdown = await res.text();
	const content = await marked(markdown);
	return html`<div class="prose">${raw(content)}</div>`;
};
