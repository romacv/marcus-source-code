// Seals a token in the browser with libsodium crypto_box_seal and sends only the
// ciphertext to Marcus, which relays it to GitHub Actions secrets. The plaintext never
// leaves this page.
(function () {
	"use strict";
	var page = document.getElementById("secrets-page");
	var form = document.getElementById("secret-form");
	if (!page) return;
	var csrf = page.getAttribute("data-csrf") || "";
	var status = document.getElementById("secret-status");

	function say(text) {
		if (status) status.textContent = text;
	}

	function readError(res) {
		return res.json().then(
			function (j) {
				return j && j.message ? j.message : "Request failed (" + res.status + ").";
			},
			function () {
				return "Request failed (" + res.status + ").";
			},
		);
	}

	if (form) {
		form.hidden = false;
		form.style.display = "grid";
	}
	Array.prototype.forEach.call(page.querySelectorAll("[data-delete]"), function (b) {
		b.hidden = false;
	});

	if (form) {
		form.addEventListener("submit", function (ev) {
			ev.preventDefault();
			var nameEl = document.getElementById("secret-name");
			var valueEl = document.getElementById("secret-value");
			var name = nameEl.value;
			var bytes = null;
			var sodium = null;
			say("Sealing...");
			form.querySelector("button[type=submit]").disabled = true;
			var ready = window.sodiumReady;
			if (!ready) {
				say("Encryption library failed to load. Reload the page.");
				form.querySelector("button[type=submit]").disabled = false;
				return;
			}
			ready
				.then(function (s) {
					sodium = s;
					return fetch("/settings/secrets/public-key", { credentials: "same-origin" });
				})
				.then(function (res) {
					if (!res.ok) return readError(res).then(function (m) { throw new Error(m); });
					return res.json();
				})
				.then(function (pk) {
					bytes = sodium.from_string(valueEl.value);
					var sealed = sodium.crypto_box_seal(
						bytes,
						sodium.from_base64(pk.key, sodium.base64_variants.ORIGINAL),
					);
					return fetch("/settings/secrets", {
						method: "POST",
						credentials: "same-origin",
						headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
						body: JSON.stringify({
							name: name,
							key_id: pk.key_id,
							encrypted_value: sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL),
						}),
					});
				})
				.then(function (res) {
					if (res.status !== 201 && res.status !== 204) {
						return readError(res).then(function (m) { throw new Error(m); });
					}
					say("Saved.");
					window.setTimeout(function () { window.location.reload(); }, 600);
				})
				.catch(function (e) {
					say(e && e.message ? e.message : "Could not save the secret.");
				})
				.then(function () {
					// Clear the field and the in-memory copy whatever the outcome.
					if (bytes && sodium) sodium.memzero(bytes);
					bytes = null;
					valueEl.value = "";
					form.querySelector("button[type=submit]").disabled = false;
				});
		});
	}

	page.addEventListener("click", function (ev) {
		var btn = ev.target.closest ? ev.target.closest("[data-delete]") : null;
		if (!btn) return;
		var name = btn.getAttribute("data-delete");
		if (!window.confirm("Delete " + name + " from your repository secrets?")) return;
		btn.disabled = true;
		fetch("/settings/secrets/" + encodeURIComponent(name), {
			method: "DELETE",
			credentials: "same-origin",
			headers: { "X-CSRF-Token": csrf },
		}).then(function (res) {
			if (res.status === 204) {
				window.location.reload();
				return;
			}
			btn.disabled = false;
			return readError(res).then(function (m) { say(m); window.alert(m); });
		});
	});
})();
