import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

// Single source of truth for the Marcus brand mark in the site header.
// Edit here to update every page's header simultaneously.
export const siteLogoMarkup = html`<span class="brand__word">MARCUS</span>`;

export const layout = (content: HtmlEscapedString | string, title: string) => html`
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="UTF-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<title>${title}</title>
			<link rel="icon" type="image/x-icon" href="/favicon.ico" />
			<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
			<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180.png" />
			<link rel="preconnect" href="https://fonts.googleapis.com" />
			<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
			<link
				href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Fraunces:opsz,wght,SOFT,WONK@9..144,300..700,0..100,0..1&family=JetBrains+Mono:wght@400;500;600&display=swap"
				rel="stylesheet"
			/>
			<style>
				/* ── Design tokens ──────────────────────────────────────── */
				:root {
					/* paper */
					--paper:      #E8EAD8;
					--paper-deep: #DCDFC9;
					--paper-edge: #C9CCB6;

					/* inks */
					--ink:        #1B2A24;
					--ink-soft:   rgba(27,42,36,.62);
					--ink-faint:  rgba(27,42,36,.36);
					--ink-hair:   rgba(27,42,36,.16);

					/* draftsman 4-ink palette */
					--ink-rubric: #B83229;
					--ink-blue:   #1F4E79;
					--ink-hilite: #D9A823;
					--ink-field:  #2F6B3A;

					/* backward-compat aliases */
					--bg:         var(--paper);
					--surface:    var(--paper-deep);
					--text:       var(--ink);
					--muted:      var(--ink);
					--subtle:     var(--ink-faint);
					--hair:       var(--ink-hair);
					--accent:     var(--ink-field);
					--accent-d:   rgba(47,107,58,.12);
					--sage:       var(--ink-field);
					--glass:      var(--paper);

					--f-display: 'Archivo Black',system-ui,sans-serif;
					--f-body:    'Fraunces',Georgia,serif;
					--f-mono:    'JetBrains Mono','Fira Code',ui-monospace,monospace;

					--tx-xs:   clamp(.6875rem,.3vw + .6rem,.75rem);
					--tx-sm:   clamp(.8125rem,.3vw + .72rem,.875rem);
					--tx-base: clamp(1rem,.3vw + .9rem,1.0625rem);
					--tx-lg:   clamp(1.125rem,.5vw + 1rem,1.3125rem);
					--tx-xl:   clamp(1.5rem,1.5vw + 1rem,1.875rem);
					--tx-2xl:  clamp(1.875rem,3vw + 1rem,2.75rem);
					--tx-3xl:  clamp(2.75rem,5vw + 1rem,5rem);

					--ease: cubic-bezier(.16,1,.3,1);
				}

				/* ── Reset ──────────────────────────────────────────────── */
				*, *::before, *::after { box-sizing: border-box; margin: 0; }

				html {
					color-scheme: light;
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
					background: var(--paper);
					color: var(--ink);
					font-family: var(--f-body);
					font-size: var(--tx-base);
					font-weight: 400;
					line-height: 1.65;
					-webkit-font-smoothing: antialiased;
					min-height: 100dvh;
					display: flex;
					flex-direction: column;
					position: relative;
				}

				/* Procedural radial grain — paper texture */
				body::before {
					content: '';
					position: fixed;
					inset: 0;
					pointer-events: none;
					background:
						radial-gradient(circle at 20% 30%, rgba(27,42,36,.025) 0, transparent 1px),
						radial-gradient(circle at 70% 60%, rgba(27,42,36,.02)  0, transparent 1px),
						radial-gradient(circle at 40% 80%, rgba(27,42,36,.025) 0, transparent 1px);
					background-size: 7px 7px, 11px 11px, 13px 13px;
					mix-blend-mode: multiply;
					opacity: .9;
					z-index: 0;
				}

				.site-header, .site-main, .site-footer { position: relative; z-index: 1; }

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
					border-bottom: 1px solid var(--ink);
					background: var(--paper);
				}

				.site-header__inner {
					display: flex;
					align-items: center;
					justify-content: space-between;
					gap: 1rem;
					padding-block: 1.125rem;
				}

				.brand {
					display: inline-flex;
					align-items: baseline;
					gap: .55rem;
					color: var(--ink);
					text-decoration: none;
				}
				.brand__word {
					font-family: var(--f-display);
					font-size: 1.3rem;
					font-weight: 400;
					letter-spacing: -.015em;
					line-height: 1;
				}
				.brand__word::after {
					content: '.';
					color: var(--ink-rubric);
				}
				.header-meta {
					font-family: var(--f-mono);
					font-size: .72rem;
					color: var(--ink-soft);
					letter-spacing: .04em;
				}

				/* ── Main ───────────────────────────────────────────────── */
				.site-main {
					flex: 1;
					padding-block: clamp(2.5rem,6vw,5rem) 6rem;
				}

				/* ── OSS Banner ─────────────────────────────────────────── */
				.oss-banner {
					background: var(--paper-deep);
					border-bottom: 1px solid var(--ink-hair);
					padding: 8px 16px;
					text-align: center;
					font-size: 14px;
					line-height: 1.4;
					color: var(--ink);
				}
				.oss-banner p { margin: 0; }
				.oss-banner a {
					color: var(--ink);
					text-decoration: underline;
					font-weight: 600;
				}
				.oss-banner a:hover { color: var(--ink-rubric); }

				@media (max-width: 480px) {
					.oss-banner { font-size: 13px; padding: 8px 12px; }
				}

				/* ── Site Footer ─────────────────────────────────────────── */
				.site-footer {
					margin-top: auto;
					border-top: 1px solid var(--ink);
					background: var(--paper);
					padding-block: clamp(2rem,4vw,3rem) 2rem;
				}

				/* TOC sitemap — collapsible disclosure */
				.sitemap { margin-bottom: 1.5rem; }
				.sitemap > summary {
					font-family: var(--f-mono);
					font-size: .72rem;
					letter-spacing: .12em;
					text-transform: uppercase;
					color: var(--ink-soft);
					cursor: pointer;
					list-style: none;
					display: inline-flex;
					align-items: center;
					gap: .5rem;
					padding: .25rem 0;
					user-select: none;
				}
				.sitemap > summary::-webkit-details-marker { display: none; }
				.sitemap > summary::before {
					content: '+';
					font-family: var(--f-mono);
					font-size: .9rem;
					color: var(--ink);
					width: .75rem;
					display: inline-block;
				}
				.sitemap[open] > summary::before { content: '−'; }
				.sitemap > summary:hover { color: var(--ink-rubric); }
				.sitemap > .toc__list { margin-top: .9rem; }

				.toc__list {
					list-style: none;
					padding: 0;
					margin: 0;
					display: grid;
					gap: .4rem;
					max-width: 560px;
				}
				.toc__row {
					display: grid;
					grid-template-columns: 1fr auto;
					align-items: baseline;
					gap: .5rem;
					font-family: var(--f-mono);
					font-size: .82rem;
					color: var(--ink-soft);
				}
				.toc__row a {
					color: var(--ink);
					text-decoration: underline;
					text-decoration-color: var(--ink-soft);
					text-decoration-thickness: 1px;
					text-underline-offset: 3px;
					background: none;
					display: inline;
				}
				.toc__row a:hover {
					color: var(--ink-rubric);
					text-decoration-color: var(--ink-rubric);
				}
				.toc__row .pg {
					font-family: var(--f-mono);
					font-size: .76rem;
					color: var(--ink-soft);
				}
				.footer-meta {
					font-family: var(--f-mono);
					font-size: .72rem;
					color: var(--ink-faint);
					padding-top: 1rem;
					border-top: 1px solid var(--ink-hair);
					display: flex;
					gap: 1rem;
					flex-wrap: wrap;
				}
				.footer-meta a {
					color: var(--ink-faint);
					text-decoration: underline;
				}
				.footer-meta a:hover { color: var(--ink); }

				/* ── Legal pages ─────────────────────────────────────────── */
				.legal-page {
					max-width: 720px;
					padding-block: clamp(3rem,5vw,5rem);
				}
				.legal-page h1 {
					font-family: var(--f-display);
					font-size: var(--tx-2xl);
					font-weight: 700;
					letter-spacing: -.02em;
					line-height: 1.1;
					margin-bottom: .5rem;
				}
				.legal-page .legal-meta {
					font-family: var(--f-mono);
					font-size: var(--tx-xs);
					letter-spacing: .07em;
					color: var(--ink-soft);
					margin-bottom: 2.5rem;
				}
				.legal-page .legal-lead {
					color: var(--ink-soft);
					font-style: italic;
					margin-bottom: 2.5rem;
					font-size: var(--tx-lg);
					line-height: 1.65;
				}
				.legal-page h2 {
					font-family: var(--f-display);
					font-size: var(--tx-lg);
					font-weight: 600;
					letter-spacing: -.01em;
					margin-top: 2.25rem;
					margin-bottom: .75rem;
					padding-top: 2rem;
					border-top: 1px solid var(--hair);
				}
				.legal-page p {
					color: var(--muted);
					line-height: 1.78;
					margin-bottom: 1rem;
				}
				.legal-page ul {
					color: var(--muted);
					line-height: 1.78;
					padding-left: 1.4rem;
					margin-bottom: 1rem;
				}
				.legal-page ul li { margin-bottom: .5rem; }
				.legal-page a {
					color: var(--ink-rubric);
					text-decoration: none;
				}
				.legal-page a:hover { text-decoration: underline; }

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
					font-weight: 400;
					letter-spacing: -.035em;
					line-height: .92;
					text-transform: uppercase;
					color: var(--ink);
					max-width: 14ch;
					text-shadow: 1.5px 1.5px 0 rgba(31,78,121,.16);
					margin-bottom: 1.25rem;
					animation: reveal .7s var(--ease) both;
				}
				.hero h1 em {
					font-style: normal;
					color: var(--ink-rubric);
					display: inline-block;
					transform: rotate(-1.5deg);
				}
				.hero .lede {
					font-family: var(--f-body);
					font-variation-settings: "opsz" 80, "SOFT" 30, "WONK" 0;
					font-size: var(--tx-lg);
					line-height: 1.55;
					color: var(--ink-soft);
					margin-top: 1.5rem;
					margin-bottom: 2rem;
					max-width: 48ch;
					animation: reveal .7s var(--ease) 80ms both;
				}
				.hero .lede strong {
					color: var(--ink);
					font-weight: 600;
					background: linear-gradient(180deg, transparent 60%, rgba(217,168,35,.45) 60%, rgba(217,168,35,.45) 88%, transparent 88%);
					padding: 0 .12em;
				}
				.hero__art {
					width: 100%;
					border-radius: 2px;
					border: 1px solid var(--ink);
					box-shadow: 3px 3px 0 var(--ink-blue);
					animation: reveal .9s var(--ease) 120ms both;
				}
				.cta {
					display: flex;
					flex-wrap: wrap;
					gap: .75rem;
					animation: reveal .7s var(--ease) 160ms both;
				}
				.cta--primary,
				.cta--secondary {
					font-family: var(--f-display);
					font-weight: 400;
					font-size: .95rem;
					letter-spacing: .01em;
					text-decoration: none;
					text-transform: uppercase;
					padding: .9rem 1.4rem;
					border-radius: 2px;
					transition: transform 180ms var(--ease), box-shadow 180ms var(--ease);
					display: inline-flex;
					align-items: center;
					gap: .55rem;
				}
				.cta--primary {
					background: var(--ink-field);
					color: var(--paper);
					box-shadow: 4px 4px 0 var(--ink-rubric);
				}
				.cta--primary:hover {
					transform: translate(-2px,-2px) rotate(-.4deg);
					box-shadow: 6px 6px 0 var(--ink-rubric);
				}
				.cta--primary:active {
					transform: translate(2px,2px);
					box-shadow: 1px 1px 0 var(--ink-rubric);
				}
				.cta--secondary {
					background: transparent;
					color: var(--ink);
					border: 2px solid var(--ink);
					box-shadow: 4px 4px 0 var(--ink);
				}
				.cta--secondary:hover {
					transform: translate(-2px,-2px);
					box-shadow: 6px 6px 0 var(--ink);
					background: var(--paper-deep);
				}

				.section {
					padding-block: clamp(3rem,5vw,5rem);
					border-top: 1px solid var(--hair);
				}
				.section__eyebrow {
					display: inline-block;
					font-family: var(--f-mono);
					font-size: .72rem;
					font-weight: 500;
					letter-spacing: .12em;
					text-transform: uppercase;
					color: var(--ink);
					background: var(--ink-hilite);
					padding: .3rem .65rem .25rem;
					clip-path: polygon(2% 12%, 98% 4%, 100% 88%, 4% 96%);
					transform: rotate(-.8deg);
					margin-bottom: 1rem;
				}
				.section h2 {
					font-family: var(--f-display);
					font-size: var(--tx-2xl);
					font-weight: 400;
					letter-spacing: -.025em;
					line-height: 1;
					text-transform: uppercase;
					color: var(--ink);
					margin-bottom: 1rem;
				}
				.section p {
					font-family: var(--f-body);
					font-variation-settings: "opsz" 14, "SOFT" 30;
					color: var(--ink);
					line-height: 1.7;
					max-width: 64ch;
					margin-bottom: 1rem;
				}
				.section p strong {
					color: var(--ink);
					font-weight: 600;
					background: linear-gradient(180deg, transparent 60%, rgba(217,168,35,.45) 60%, rgba(217,168,35,.45) 88%, transparent 88%);
					padding: 0 .12em;
				}
				.section p code {
					font-family: var(--f-mono);
					font-size: .85em;
					background: var(--paper-deep);
					padding: 1px 6px;
					border-radius: 2px;
					color: var(--ink-blue);
				}
				.section__img {
					width: 100%;
					max-width: 840px;
					border-radius: 2px;
					border: 1px solid var(--ink);
					box-shadow: 3px 3px 0 var(--ink-blue);
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
					background: var(--paper-deep);
					border: 1px solid var(--ink);
					border-radius: 2px;
					padding: 1.5rem;
					box-shadow: 3px 3px 0 var(--ink-blue);
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
					border-bottom: 1px solid var(--ink-hair);
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

				/* ── Figure / tipped-in callout ─────────────────────────── */
				.figure {
					margin: 1.5rem 0;
					border: 1px solid var(--ink);
					background: var(--paper-deep);
					padding: 1.25rem 1.25rem 1rem;
					position: relative;
					box-shadow: 3px 3px 0 var(--ink-blue);
					border-radius: 2px;
				}
				.figure__label {
					font-family: var(--f-mono);
					font-size: .72rem;
					font-weight: 500;
					letter-spacing: .08em;
					text-transform: uppercase;
					color: var(--ink-blue);
					margin-bottom: .5rem;
					display: block;
				}
				.figure__body {
					font-family: var(--f-mono);
					font-size: .8rem;
					color: var(--ink);
					line-height: 1.6;
					white-space: pre;
					overflow-x: auto;
				}

				/* ── Alert / errata block ────────────────────────────────── */
				.alert {
					border-left: 4px solid var(--ink-rubric);
					background: rgba(184,50,41,.06);
					padding: 1rem 1.25rem;
					margin: 1.25rem 0;
					border-radius: 0 2px 2px 0;
				}
				.alert__title {
					font-family: var(--f-display);
					font-size: 1rem;
					text-transform: uppercase;
					letter-spacing: .02em;
					color: var(--ink-rubric);
					margin-bottom: .35rem;
				}
				.alert__body {
					color: var(--ink);
					font-size: .95rem;
				}

				.privacy-block {
					background: var(--paper-deep);
					border: 1px solid var(--ink);
					border-radius: 2px;
					box-shadow: 3px 3px 0 var(--ink-blue);
					padding: 1.75rem 2rem;
					max-width: 640px;
					margin-block: 1.5rem;
				}
				.privacy-block p { margin-bottom: .875rem; }
				.privacy-block p:last-child { margin-bottom: 0; }
				.privacy-block a { color: var(--ink-rubric); text-decoration: none; }
				.privacy-block a:hover { text-decoration: underline; }

				/* ── Connect tabs ───────────────────────────────────── */
				.tabs-nav {
					display: flex;
					gap: .25rem;
					flex-wrap: wrap;
					margin-bottom: 1.75rem;
					border-bottom: 1px solid var(--hair);
					padding-bottom: 0;
				}
				.tab-btn {
					font-family: var(--f-mono);
					font-size: var(--tx-xs);
					letter-spacing: .08em;
					text-transform: uppercase;
					background: none;
					border: none;
					color: var(--muted);
					cursor: pointer;
					padding: .5rem .875rem .625rem;
					position: relative;
					transition: color .15s;
				}
				.tab-btn::after {
					content: '';
					position: absolute;
					left: 0; right: 0; bottom: -1px;
					height: 2px;
					background: var(--accent);
					transform: scaleX(0);
					transition: transform .15s var(--ease);
				}
				.tab-btn[aria-selected="true"] {
					color: var(--accent);
				}
				.tab-btn[aria-selected="true"]::after {
					transform: scaleX(1);
				}
				.tab-btn svg {
					display: inline-block;
					vertical-align: middle;
					margin-right: .375rem;
					margin-bottom: .1em;
					flex-shrink: 0;
				}
				.tab-panel { display: none; }
				.tab-panel[aria-hidden="false"] { display: block; }

				/* ── Per-tab screenshot placeholders ────────────────── */
				.tab-screenshot {
					margin-top: 2rem;
				}
				.tab-screenshot img {
					width: 100%;
					max-width: 840px;
					border-radius: 2px;
					border: 1px solid var(--ink);
					display: block;
					margin-inline: auto;
				}
				.screenshot-placeholder {
					width: 100%;
					max-width: 840px;
					margin-inline: auto;
					margin-top: 2rem;
					aspect-ratio: 16/9;
					background: var(--surface);
					border: 1px dashed var(--subtle);
					border-radius: 2px;
					display: flex;
					align-items: center;
					justify-content: center;
					flex-direction: column;
					gap: .5rem;
					color: var(--subtle);
				}
				.screenshot-placeholder svg {
					opacity: .4;
				}
				.screenshot-placeholder span {
					font-family: var(--f-mono);
					font-size: var(--tx-xs);
					letter-spacing: .08em;
					text-transform: uppercase;
				}

				/* ── Copy URL container ─────────────────────────────── */
				.copy-url {
					display: flex;
					align-items: center;
					gap: .75rem;
					background: var(--paper-deep);
					border: 1px solid var(--ink-hair);
					border-radius: 2px;
					padding: .75rem 1rem;
					cursor: pointer;
					max-width: 480px;
					margin-block: .5rem;
					transition: border-color .15s;
				}
				.copy-url:hover { border-color: var(--accent); }
				.copy-url code {
					font-family: var(--f-mono);
					font-size: .8rem;
					color: var(--accent);
					background: none;
					padding: 0;
					flex: 1;
					text-align: left;
				}
				.copy-url__icon {
					flex-shrink: 0;
					color: var(--subtle);
					font-size: .75rem;
					font-family: var(--f-mono);
					transition: color .15s;
					white-space: nowrap;
				}
				.copy-url.copied .copy-url__icon { color: var(--sage); }
				.copy-url.copied { border-color: var(--sage); }

				/* ── Free for Now badge ─────────────────────────────── */
				.beta-badge {
					display: inline-block;
					font-family: var(--f-mono);
					font-size: var(--tx-xs);
					letter-spacing: .08em;
					text-transform: uppercase;
					color: var(--sage);
					background: rgba(107,158,114,.12);
					border: 1px solid rgba(107,158,114,.25);
					border-radius: 20px;
					padding: .25rem .75rem;
					margin-bottom: 1rem;
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
					color: var(--ink-soft);
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
					color: var(--ink-soft);
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
					color: var(--ink-soft);
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
					border-bottom: 1px solid var(--ink-hair);
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
			<div class="oss-banner" role="region" aria-label="Open source notice">
				<p>
					<strong>Open source.</strong>
					Your notes live in <strong>your</strong> GitHub repo — we never store them on our servers.
					<a href="https://github.com/romacv/marcus-source-code" rel="noopener">Audit the code →</a>
				</p>
			</div>
			<header class="site-header">
				<div class="shell site-header__inner">
					<a href="/" class="brand" aria-label="Marcus — home">${siteLogoMarkup}</a>
					<span class="header-meta">v0.2.0</span>
				</div>
			</header>
			<main class="site-main">
				<div class="shell">${content}</div>
			</main>
			<footer class="site-footer" role="contentinfo">
				<div class="shell">
					<details class="sitemap">
						<summary>Sitemap</summary>
						<nav class="toc" aria-label="Sitemap">
							<ol class="toc__list">
								<li class="toc__row"><a href="/">Home</a><span class="pg">/</span></li>
								<li class="toc__row"><a href="/vault/install">Install on your vault</a><span class="pg">/vault/install</span></li>
								<li class="toc__row"><a href="/vault/error">Vault setup failed</a><span class="pg">/vault/error</span></li>
								<li class="toc__row"><a href="/vault/conflict">Vault name conflict</a><span class="pg">/vault/conflict</span></li>
								<li class="toc__row"><a href="/privacy">Privacy</a><span class="pg">/privacy</span></li>
								<li class="toc__row"><a href="/terms">Terms</a><span class="pg">/terms</span></li>
							</ol>
						</nav>
					</details>
					<div class="footer-meta">
						<span>© 2026</span>
						<span>Marcus Second Brain ·
							<a href="https://github.com/romacv/marcus-source-code/blob/main/LICENSE" rel="noopener">BUSL-1.1</a> ·
							<a href="https://github.com/romacv/marcus-source-code" rel="noopener">GitHub</a> ·
							<a href="mailto:r@resrom.com">r@resrom.com</a>
						</span>
					</div>
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

		<nav class="tabs-nav" role="tablist" aria-label="AI client">
			<button class="tab-btn" role="tab" aria-selected="true" aria-controls="tab-claude" id="tbtn-claude">
				<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 4 20h3.5l1.6-3.8h5.8L16.5 20H20L12 2zm0 5.2 2.1 5.8H9.9l2.1-5.8z"/></svg>
				Claude
			</button>
			<button class="tab-btn" role="tab" aria-selected="false" aria-controls="tab-chatgpt" id="tbtn-chatgpt">
				<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21.5 9.6a5.4 5.4 0 00-.4-4.4 5.6 5.6 0 00-6-2.7 5.4 5.4 0 00-4.1-1.8 5.6 5.6 0 00-5.3 3.9A5.4 5.4 0 002 7.2a5.6 5.6 0 00.7 6.5A5.4 5.4 0 003 18a5.6 5.6 0 006 2.7 5.4 5.4 0 004.1 1.8A5.6 5.6 0 0018.4 19a5.4 5.4 0 003.6-2.6 5.6 5.6 0 00-.5-6.8zM12 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z"/></svg>
				ChatGPT
			</button>
			<button class="tab-btn" role="tab" aria-selected="false" aria-controls="tab-codex" id="tbtn-codex">
				<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 5.5 3 12l5.5 6.5 1.5-1.3L5.2 12l4.8-5.7-1.5-1.3zM15.5 5.5l-1.5 1.3 4.8 5.7-4.8 5.7 1.5 1.3L22 12l-6.5-6.5z"/></svg>
				Codex
			</button>
			<button class="tab-btn" role="tab" aria-selected="false" aria-controls="tab-perplexity" id="tbtn-perplexity">
				<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.5 7.5H22l-6.2 4.5 2.4 7.5L12 17 5.8 21.5l2.4-7.5L2 9.5h7.5L12 2z"/></svg>
				Perplexity
			</button>
			<button class="tab-btn" role="tab" aria-selected="false" aria-controls="tab-other" id="tbtn-other">
				<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3a1 1 0 00-2 0v2.1A7 7 0 005.1 11H3a1 1 0 000 2h2.1A7 7 0 0011 18.9V21a1 1 0 002 0v-2.1A7 7 0 0018.9 13H21a1 1 0 000-2h-2.1A7 7 0 0013 5.1V3zM12 7a5 5 0 110 10A5 5 0 0112 7zm0 2a3 3 0 100 6 3 3 0 000-6z"/></svg>
				Other
			</button>
		</nav>

		<!-- Claude -->
		<div class="tab-panel" id="tab-claude" role="tabpanel" aria-labelledby="tbtn-claude" aria-hidden="false">
			<ol class="connect-steps">
				<li>Go to <a href="https://claude.ai/settings/connectors" target="_blank" rel="noopener noreferrer">claude.ai/settings/connectors</a> and click <strong>Add custom connector</strong>.</li>
				<li>
					Copy the URL below, paste it in the URL field, name it <strong>Marcus Second Brain</strong>, and click Add.
					<button class="copy-url" onclick="copyMcpUrl(this)" aria-label="Copy MCP URL to clipboard">
						<code>https://marcus-second-brain.com/mcp</code>
						<span class="copy-url__icon">Copy</span>
					</button>
				</li>
				<li>Sign in with GitHub. Marcus creates a private <code>marcus-second-brain-vault</code> repo in your account and requests access to that repo only.</li>
				<li>Open a new Claude chat, click <strong>+</strong> → Connectors → enable Marcus. Ask Claude: <em>"Save this to my second brain."</em></li>
			</ol>
			<div class="tab-screenshot">
				<img src="/img/add-connector.png" alt="Add custom connector dialog in Claude with Marcus URL" />
			</div>
		</div>

		<!-- ChatGPT -->
		<div class="tab-panel" id="tab-chatgpt" role="tabpanel" aria-labelledby="tbtn-chatgpt" aria-hidden="true">
			<ol class="connect-steps">
				<li>Go to <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer">chatgpt.com</a> → Settings → Connectors and click <strong>Add custom connector</strong>.</li>
				<li>
					Copy the URL below, paste it in the URL field, name it <strong>Marcus Second Brain</strong>, and click Add.
					<button class="copy-url" onclick="copyMcpUrl(this)" aria-label="Copy MCP URL to clipboard">
						<code>https://marcus-second-brain.com/mcp</code>
						<span class="copy-url__icon">Copy</span>
					</button>
				</li>
				<li>Sign in with GitHub. Marcus creates a private <code>marcus-second-brain-vault</code> repo in your account and requests access to that repo only.</li>
				<li>Start a new ChatGPT conversation and enable the Marcus connector. Ask: <em>"Save this to my second brain."</em></li>
			</ol>
			<div class="screenshot-placeholder" aria-label="ChatGPT connector screenshot coming soon">
				<svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zm-2 0H5V5h14v14zm-8-2h2v-5h-2v5zm0-7h2V8h-2v2z"/></svg>
				<span>Screenshot coming soon</span>
			</div>
		</div>

		<!-- Codex -->
		<div class="tab-panel" id="tab-codex" role="tabpanel" aria-labelledby="tbtn-codex" aria-hidden="true">
			<ol class="connect-steps">
				<li>Open <a href="https://platform.openai.com/codex" target="_blank" rel="noopener noreferrer">platform.openai.com/codex</a> and navigate to your agent's MCP settings.</li>
				<li>
					Copy the URL below and add it as a remote MCP server named <strong>Marcus Second Brain</strong>.
					<button class="copy-url" onclick="copyMcpUrl(this)" aria-label="Copy MCP URL to clipboard">
						<code>https://marcus-second-brain.com/mcp</code>
						<span class="copy-url__icon">Copy</span>
					</button>
				</li>
				<li>Authenticate with GitHub when prompted. Marcus creates a private <code>marcus-second-brain-vault</code> repo and requests access to that repo only.</li>
				<li>Marcus tools are now available in your Codex environment. Try: <em>"Save this to my second brain."</em></li>
			</ol>
			<div class="screenshot-placeholder" aria-label="Codex connector screenshot coming soon">
				<svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zm-2 0H5V5h14v14zm-8-2h2v-5h-2v5zm0-7h2V8h-2v2z"/></svg>
				<span>Screenshot coming soon</span>
			</div>
		</div>

		<!-- Perplexity -->
		<div class="tab-panel" id="tab-perplexity" role="tabpanel" aria-labelledby="tbtn-perplexity" aria-hidden="true">
			<ol class="connect-steps">
				<li>Go to <a href="https://www.perplexity.ai/settings" target="_blank" rel="noopener noreferrer">perplexity.ai/settings</a> → MCP and click <strong>Add MCP server</strong>.</li>
				<li>
					Copy the URL below, paste it in the URL field, name it <strong>Marcus Second Brain</strong>, and click Add.
					<button class="copy-url" onclick="copyMcpUrl(this)" aria-label="Copy MCP URL to clipboard">
						<code>https://marcus-second-brain.com/mcp</code>
						<span class="copy-url__icon">Copy</span>
					</button>
				</li>
				<li>Sign in with GitHub. Marcus creates a private <code>marcus-second-brain-vault</code> repo in your account and requests access to that repo only.</li>
				<li>Start a new Perplexity conversation and ask: <em>"Save this to my second brain."</em></li>
			</ol>
			<div class="screenshot-placeholder" aria-label="Perplexity connector screenshot coming soon">
				<svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zm-2 0H5V5h14v14zm-8-2h2v-5h-2v5zm0-7h2V8h-2v2z"/></svg>
				<span>Screenshot coming soon</span>
			</div>
		</div>

		<!-- Other -->
		<div class="tab-panel" id="tab-other" role="tabpanel" aria-labelledby="tbtn-other" aria-hidden="true">
			<ol class="connect-steps">
				<li>In your MCP-compatible client, find the setting to add a <strong>remote MCP server</strong> or <strong>custom connector</strong>.</li>
				<li>
					Copy the URL below and paste it as the server URL. Name it <strong>Marcus Second Brain</strong>.
					<button class="copy-url" onclick="copyMcpUrl(this)" aria-label="Copy MCP URL to clipboard">
						<code>https://marcus-second-brain.com/mcp</code>
						<span class="copy-url__icon">Copy</span>
					</button>
				</li>
				<li>Sign in with GitHub when prompted. Marcus creates a private <code>marcus-second-brain-vault</code> repo and requests access to that repo only.</li>
				<li>Once connected, ask your AI: <em>"Save this to my second brain."</em></li>
			</ol>
			<div class="screenshot-placeholder" aria-label="MCP client connector screenshot coming soon">
				<svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zm-2 0H5V5h14v14zm-8-2h2v-5h-2v5zm0-7h2V8h-2v2z"/></svg>
				<span>Screenshot coming soon</span>
			</div>
		</div>
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
		<p class="section__eyebrow">Privacy</p>
		<h2>Your data, your repo</h2>
		<div class="privacy-block">
			<!-- Remove this badge after beta -->
			<span class="beta-badge">Free for Now</span>
			<p>Marcus is contentless by design. Your note content never passes through or is stored on Marcus servers. Marcus only stores a mapping from your Marcus user ID to your GitHub App installation ID, and short-lived OAuth tokens (typically ~1 hour, set by GitHub).</p>
			<p>All writes go directly from Marcus to your private GitHub repository via short-lived installation tokens.</p>
			<p>Marcus is <strong>free during beta</strong>. After beta, a free tier (30 MCP calls/day) stays free. Pro unlocks 1,000 calls/day, unlimited notes, and more — at $10/month.</p>
			<p>To revoke access: go to <a href="https://github.com/settings/installations" target="_blank" rel="noopener noreferrer">github.com/settings/installations</a>, find Marcus, and click Uninstall. Your vault repo and all notes stay in your GitHub account.</p>
		</div>
	</section>

	<script>
	(function () {
	  var tabs = document.querySelectorAll('.tab-btn');
	  tabs.forEach(function (btn) {
	    btn.addEventListener('click', function () {
	      tabs.forEach(function (b) {
	        b.setAttribute('aria-selected', 'false');
	        document.getElementById(b.getAttribute('aria-controls')).setAttribute('aria-hidden', 'true');
	      });
	      btn.setAttribute('aria-selected', 'true');
	      document.getElementById(btn.getAttribute('aria-controls')).setAttribute('aria-hidden', 'false');
	    });
	  });
	})();

	function copyMcpUrl(btn) {
	  var url = 'https://marcus-second-brain.com/mcp';
	  var icon = btn.querySelector('.copy-url__icon');
	  if (navigator.clipboard) {
	    navigator.clipboard.writeText(url).then(function () {
	      btn.classList.add('copied');
	      icon.textContent = 'Copied!';
	      setTimeout(function () { btn.classList.remove('copied'); icon.textContent = 'Copy'; }, 1500);
	    });
	  } else {
	    var ta = document.createElement('textarea');
	    ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
	    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
	    document.body.removeChild(ta);
	    btn.classList.add('copied'); icon.textContent = 'Copied!';
	    setTimeout(function () { btn.classList.remove('copied'); icon.textContent = 'Copy'; }, 1500);
	  }
	}
	</script>
`;

export const privacyContent = async (): Promise<HtmlEscapedString> => html`
	<div class="legal-page">
		<p class="section__eyebrow">Legal</p>
		<h1>Privacy Policy</h1>
		<p class="legal-meta">Effective 2026-05-11</p>
		<p class="legal-lead">Marcus is a contentless second brain. Your notes live in your own private GitHub repository; the Marcus server stores only the minimum identifiers needed to authenticate you to GitHub and enforce rate limits.</p>

		<h2>Who we are</h2>
		<p>Marcus Second Brain operates this service. Contact: <a href="mailto:r@resrom.com">r@resrom.com</a>.</p>

		<h2>Data we collect</h2>
		<p>Marcus stores only what is strictly required to route your requests to GitHub and enforce fair-use limits:</p>
		<ul>
			<li><strong>GitHub identifiers</strong> — your numeric GitHub user ID (<code>userId</code>), GitHub username (<code>githubLogin</code>), GitHub App installation ID (<code>installationId</code>), and the name of your private vault repository (<code>repoName</code>). These form the user → installation mapping that persists until you uninstall.</li>
			<li><strong>GitHub App access token</strong> — stored AES-256-GCM encrypted in Cloudflare KV under the key <code>install_token:{installationId}</code>. TTL: inherited from GitHub's <code>expires_at</code> (typically ~1 hour); refreshed automatically on demand.</li>
			<li><strong>OAuth state nonce</strong> — a short-lived random token stored under <code>state:{nonce}</code> during the GitHub OAuth install flow for CSRF protection. Expires within minutes (TTL: 1800 seconds).</li>
			<li><strong>Rate-limit counter</strong> — an integer stored under <code>rl:{userId}:{YYYY-MM-DD}</code>. TTL: 48 hours (survives the UTC midnight rollover).</li>
			<li>No other persistent server-side data is stored.</li>
		</ul>

		<h2>Data we do NOT collect</h2>
		<ul>
			<li>Note content — your notes live exclusively in your private GitHub repository. Marcus writes there only under the access you grant.</li>
			<li>AI conversation transcripts.</li>
			<li>Email body content.</li>
			<li>Usage analytics, cross-site tracking, or fingerprinting.</li>
			<li>Tracking cookies. A short-lived OAuth session cookie may be set during the install flow solely to complete GitHub authentication; it is not used for tracking and expires with the session.</li>
		</ul>

		<h2>Encryption</h2>
		<p>GitHub access tokens are encrypted at rest using <strong>AES-256-GCM</strong> before being written to Cloudflare KV. The encryption key lives in a Cloudflare Worker environment secret (<code>KV_ENCRYPTION_KEY</code>) and is never logged or transmitted outside the Worker runtime.</p>

		<h2>Retention</h2>
		<ul>
			<li><strong>OAuth state nonce</strong>: minutes (TTL 1800 seconds).</li>
			<li><strong>GitHub access token</strong>: typically ~1 hour (inherits GitHub's <code>expires_at</code>); refreshed automatically on demand.</li>
			<li><strong>User → installation mapping</strong>: persisted until you uninstall the Marcus GitHub App.</li>
			<li><strong>Rate-limit counter</strong>: 48 hours (typically rolls daily at UTC midnight).</li>
		</ul>

		<h2>Third parties</h2>
		<ul>
			<li><strong>GitHub (data processor)</strong> — hosts your notes in your private repository and provides OAuth and App authentication. <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">GitHub Privacy Statement ↗</a></li>
			<li><strong>Cloudflare (infrastructure)</strong> — Marcus runs on Cloudflare Workers and KV. Cloudflare may process request metadata (IP addresses, timestamps) as part of operating the platform. <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Cloudflare Privacy Policy ↗</a></li>
			<li><strong>MCP clients (Claude Desktop, ChatGPT, etc.)</strong> — your interactions with the MCP client itself are governed by that client's privacy policy, not Marcus's.</li>
		</ul>

		<h2>Your rights</h2>
		<ul>
			<li><strong>Revoke access</strong>: visit <a href="https://github.com/settings/installations" target="_blank" rel="noopener noreferrer">GitHub Settings → Installed GitHub Apps</a>, find Marcus, and click Uninstall.</li>
			<li><strong>Export your data</strong>: your notes are already in your GitHub repository — clone it. No additional Marcus-side export is needed.</li>
			<li><strong>Delete your data</strong>: uninstalling the GitHub App removes Marcus's access. Email <a href="mailto:r@resrom.com">r@resrom.com</a> to purge the user → installation mapping from KV before its natural expiry.</li>
			<li><strong>GDPR / CCPA rights</strong>: you have rights of access, rectification, erasure, restriction, portability, and objection. Email <a href="mailto:r@resrom.com">r@resrom.com</a> to exercise any of these.</li>
		</ul>

		<h2>No tracking</h2>
		<p>Marcus runs no analytics scripts, no third-party trackers, and no fingerprinting code. The only outbound calls Marcus makes are to GitHub APIs on your behalf.</p>

		<h2>Children</h2>
		<p>Marcus is not directed at children under 13. We do not knowingly collect data from children.</p>

		<h2>Changes to this policy</h2>
		<p>If this policy materially changes, the effective date below will update and we will announce the change on the Marcus homepage. Continued use after that date constitutes acceptance.</p>

		<h2>Contact</h2>
		<p>Marcus Second Brain · <a href="mailto:r@resrom.com">r@resrom.com</a> · Effective 2026-05-11</p>
	</div>
`;

export const termsContent = async (): Promise<HtmlEscapedString> => html`
	<div class="legal-page">
		<p class="section__eyebrow">Legal</p>
		<h1>Terms of Service</h1>
		<p class="legal-meta">Effective 2026-05-11</p>
		<p class="legal-lead">These terms govern your use of Marcus Second Brain.</p>

		<h2>Acceptance</h2>
		<p>By installing the Marcus GitHub App and using the service, you agree to these terms. If you do not agree, do not use Marcus.</p>

		<h2>Service description</h2>
		<p>Marcus is a contentless second brain that connects MCP clients (Claude Desktop, ChatGPT, Perplexity, and others) to a private GitHub repository you own. The repository is the storage layer for your notes; Marcus is the routing and protocol layer. Marcus does not store, read, or process the content of your notes beyond what is necessary to write them to GitHub on your behalf.</p>

		<h2>Your account</h2>
		<p>Your account is your GitHub identity. One Marcus install is permitted per GitHub user. You are responsible for keeping your GitHub credentials secure. Activity under your GitHub account is your responsibility.</p>

		<h2>Acceptable use</h2>
		<p>You may not use Marcus to:</p>
		<ul>
			<li>Store or distribute illegal content, including content that violates applicable sanctions laws.</li>
			<li>Attack, probe, or attempt to disrupt GitHub or Cloudflare infrastructure via Marcus.</li>
			<li>Harass, spam, or abuse other users through any Marcus-touched channel.</li>
			<li>Reverse-engineer Marcus to circumvent rate limits, billing, or access controls.</li>
			<li>Operate automated bots or scrapers that exceed reasonable use of the service.</li>
			<li>Build a competing product or service using Marcus in violation of these terms.</li>
		</ul>

		<h2>Pricing &amp; billing</h2>
		<p>During beta, Marcus is free. Free use is rate-limited to <strong>30 calls per UTC day</strong>. A future Pro tier with higher limits will be announced before any charges occur. We will not auto-charge you without explicit consent. Pricing changes will be communicated on the homepage and, where possible, via the email associated with your account.</p>

		<h2>Intellectual property</h2>
		<p>Your notes belong to you. Marcus writes to your private GitHub repository under the access you granted; you can revoke that access at any time via GitHub Settings.</p>
		<p>The Marcus software is proprietary. The source repository is public for transparency only. No license is granted to redistribute, sublicense, fork for commercial use, or build a derivative service. All rights not expressly stated are reserved.</p>
		<p>The names "Marcus" and "Marcus Second Brain" and associated logos are property of the operator.</p>

		<h2>Warranty disclaimer</h2>
		<p>Marcus is provided "as is" and "as available", without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement. During beta there is no service-level agreement; we operate on a best-effort basis.</p>

		<h2>Limitation of liability</h2>
		<p>To the maximum extent permitted by applicable law, the operator's total liability arising out of or related to these terms or your use of Marcus is limited to the amounts you have paid the operator in the 12 months preceding the claim, or fifty US dollars (US$50), whichever is greater. The operator is not liable for indirect, incidental, consequential, special, or punitive damages.</p>

		<h2>Indemnification</h2>
		<p>You agree to indemnify and hold the operator harmless from claims arising out of your violation of these terms or your misuse of the service. During beta, please bring issues to <a href="mailto:r@resrom.com">r@resrom.com</a> before taking formal action — we want to fix problems.</p>

		<h2>Termination</h2>
		<p>You can terminate at any time by uninstalling the Marcus GitHub App from <a href="https://github.com/settings/installations" target="_blank" rel="noopener noreferrer">GitHub Settings → Installed GitHub Apps</a>. We may suspend or terminate access for violations of these terms; where reasonable, we will provide advance notice.</p>

		<h2>Changes to these terms</h2>
		<p>We may update these terms. Material changes will bump the effective date and be announced on the homepage. Continued use after the effective date constitutes acceptance.</p>

		<h2>Governing law</h2>
		<p>These terms are governed by the laws of the jurisdiction in which the operator is established, without regard to conflict-of-law principles. Any dispute arising out of these terms will be resolved exclusively in the courts of that jurisdiction.</p>

		<h2>Contact</h2>
		<p>Marcus Second Brain · <a href="mailto:r@resrom.com">r@resrom.com</a> · Effective 2026-05-11</p>
	</div>
`;

export const docsContent = async (): Promise<HtmlEscapedString> => html`
	<div class="legal-page">
		<p class="section__eyebrow">Documentation</p>
		<h1>Marcus — Developer &amp; User Reference</h1>
		<p class="legal-lead">Everything you need to set up, use, and troubleshoot Marcus Second Brain.</p>

		<h2>Setup</h2>
		<ol>
			<li>
				<strong>Add the connector.</strong>
				In Claude.ai open <em>Settings → Connectors → Add connector</em> and enter
				<code>https://marcus-second-brain.com/mcp</code>.
				In ChatGPT open <em>Explore GPTs → Connect app</em> and search for Marcus.
			</li>
			<li>
				<strong>Sign in with GitHub.</strong>
				Marcus redirects through GitHub OAuth, then asks you to install the Marcus GitHub App on a
				single repository named <code>marcus-second-brain-vault</code>.
				Marcus requests <em>Contents: Read &amp; Write</em> on that repository only — no access to any
				other repository or organisation.
			</li>
			<li>
				<strong>Start using Marcus.</strong>
				Ask your AI client: <em>"Save this to my second brain"</em>, <em>"Search my vault for [topic]"</em>,
				or <em>"What do I remember about [topic]?"</em> — Marcus tools are invoked automatically.
			</li>
		</ol>

		<h2>Tool reference</h2>
		<p>Marcus exposes 14 tools over MCP. All tools operate exclusively on the authenticated user's private GitHub vault repository.</p>
		<div class="prose">
			<table>
				<thead><tr><th>Tool</th><th>What it does</th><th>Writes?</th></tr></thead>
				<tbody>
					<tr><td><code>create_note</code></td><td>Save a new markdown note with YAML frontmatter to the vault.</td><td>Yes</td></tr>
					<tr><td><code>update_note</code></td><td>Replace, append to, or prepend content in an existing vault note.</td><td>Yes</td></tr>
					<tr><td><code>delete_note</code></td><td>Archive (safe) or permanently delete a vault note.</td><td>Yes</td></tr>
					<tr><td><code>search_notes</code></td><td>Full-text and tag search across all vault notes.</td><td>No</td></tr>
					<tr><td><code>get_note</code></td><td>Read a specific vault note by path.</td><td>No</td></tr>
					<tr><td><code>get_vault_context</code></td><td>Return a lightweight summary of recent topics and tag counts.</td><td>No</td></tr>
					<tr><td><code>list_structure</code></td><td>List vault folders and files.</td><td>No</td></tr>
					<tr><td><code>get_recent_notes</code></td><td>Return recently updated note paths and timestamps.</td><td>No</td></tr>
					<tr><td><code>append_to_daily_note</code></td><td>Append a timestamped entry to today's daily note, creating it if absent.</td><td>Yes</td></tr>
					<tr><td><code>remember</code></td><td>Store a durable memory entry linked from today's daily note.</td><td>Yes</td></tr>
					<tr><td><code>recall</code></td><td>Search active memories by text or block ID.</td><td>No</td></tr>
					<tr><td><code>forget</code></td><td>Archive a memory entry so it no longer appears in recall.</td><td>Yes</td></tr>
					<tr><td><code>sync_to_claude_memory</code></td><td>Return a compact snapshot of active memories for syncing into Claude memory.</td><td>No</td></tr>
					<tr><td><code>link_notes</code></td><td>Add a wikilink between two notes, creating a stub target if it does not exist.</td><td>Yes</td></tr>
				</tbody>
			</table>
		</div>

		<h2>Troubleshooting</h2>

		<h3>I see no Marcus tools in my AI client</h3>
		<p>
			The connector may not be active. In Claude.ai go to <em>Settings → Connectors</em> and confirm Marcus is
			listed and toggled on. In ChatGPT open the conversation settings and confirm the Marcus app is enabled.
			If the connector is listed but shows an error, disconnect and reconnect — this re-runs the OAuth flow
			and refreshes the installation token.
		</p>

		<h3>I am stuck in an OAuth loop</h3>
		<p>
			This usually means the GitHub App installation step was skipped. After GitHub OAuth completes, Marcus
			redirects to a GitHub App installation page — you must click <em>Install &amp; Authorize</em> and
			select <em>Only select repositories → marcus-second-brain-vault</em>. If you landed back at the
			connector screen without completing that step, disconnect, reconnect, and follow all four clicks on the
			GitHub installation page.
		</p>

		<h3>Rate limit hit — tools return a rate-limit error</h3>
		<p>
			Marcus enforces a limit of 30 tool calls per user per UTC day on the free tier. The limit resets at
			midnight UTC. If you regularly hit the limit, consider batching writes — for example, one
			<code>create_note</code> call that includes all content for a session rather than many smaller calls.
		</p>

		<h3>How to revoke access or uninstall the GitHub App</h3>
		<ol>
			<li>
				Go to <a href="https://github.com/settings/installations" rel="noopener">github.com/settings/installations</a>,
				find <strong>marcus-mcp-server</strong>, click <em>Configure</em>, then <em>Uninstall</em>.
				This immediately revokes Marcus's write access to your vault repository.
			</li>
			<li>
				To also revoke the OAuth token, go to
				<a href="https://github.com/settings/applications" rel="noopener">github.com/settings/applications</a>
				→ <em>Authorized OAuth Apps</em>, find Marcus, and click <em>Revoke</em>.
			</li>
			<li>
				Your <code>marcus-second-brain-vault</code> repository and all its contents remain in your GitHub
				account. Marcus never deletes user data on uninstall.
			</li>
		</ol>

		<h2>Support</h2>
		<p>Email <a href="mailto:r@resrom.com">r@resrom.com</a> with your GitHub username and a description of the issue.</p>
	</div>
`;
