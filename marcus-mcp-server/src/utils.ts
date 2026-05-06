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
			<script src="https://cdn.tailwindcss.com"></script>
			<style>
				.markdown h1 { font-size: 2rem; font-weight: 700; margin-bottom: 1rem; color: #1a202c; }
				.markdown h2 { font-size: 1.5rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #2d3748; }
				.markdown h3 { font-size: 1.25rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.5rem; }
				.markdown p { font-size: 1.1rem; color: #4a5568; margin-bottom: 1rem; line-height: 1.6; }
				.markdown a { color: #3182ce; text-decoration: none; }
				.markdown a:hover { text-decoration: underline; }
				.markdown ul, .markdown ol { margin: 1rem 0 1rem 1.5rem; font-size: 1.1rem; color: #4a5568; }
				.markdown li { margin-bottom: 0.4rem; }
				.markdown ul li { list-style-type: disc; }
				.markdown ol li { list-style-type: decimal; }
				.markdown pre { background: #f7fafc; padding: 1rem; border-radius: 0.375rem; margin: 1rem 0; overflow-x: auto; }
				.markdown code { font-family: monospace; font-size: 0.875rem; background: #f7fafc; padding: 0.125rem 0.25rem; border-radius: 0.25rem; }
				.markdown pre code { background: transparent; padding: 0; }
				.markdown table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
				.markdown th, .markdown td { border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; text-align: left; }
				.markdown th { background: #f7fafc; font-weight: 600; }
				.markdown blockquote { border-left: 4px solid #e2e8f0; padding-left: 1rem; margin: 1rem 0; color: #718096; font-style: italic; }
			</style>
		</head>
		<body class="bg-gray-50 text-gray-800 font-sans leading-relaxed flex flex-col min-h-screen">
			<header class="bg-white shadow-sm mb-8">
				<div class="container mx-auto px-4 py-4">
					<a href="/" class="text-xl font-bold text-blue-600 hover:text-blue-700">Marcus</a>
				</div>
			</header>
			<main class="container mx-auto px-4 pb-12 flex-grow">${content}</main>
			<footer class="bg-gray-100 py-6 mt-12">
				<div class="container mx-auto px-4 text-center text-gray-500 text-sm">
					&copy; ${new Date().getFullYear()} Marcus. Open source under MIT.
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
	return html`<div class="max-w-3xl mx-auto markdown">${raw(content)}</div>`;
};
