const SteamUser = require("steam-user");
const SteamTotp = require("steam-totp");

const accounts = require("./sage-accounts.json");
const config = require("./config.json");

async function main() {
	if (!accounts.length) {
		console.log(
			"No accounts found in sage-accounts.json. Make sure to overwrite the file with your exported SAGE accounts.",
		);
		return;
	}
	for (const account of accounts) {
		await startAccount(account);
	}
}

main();

function startAccount(account) {
	return new Promise((resolve) => {
		const client = new SteamUser();

		client.logOn({
			accountName: account.user.username,
			password: account.user.password,
		});

		client.on("steamGuard", (domain, callback) => {
			console.log(`SteamGuard required for account ${account.user.username}`);
			if (!domain && account.steamguard) {
				// mobile auth
				const code = SteamTotp.getAuthCode(account.steamguard.shared_secret);
				console.log(
					`Auto-entering code ${code} (mobile authenticator) for account ${account.user.username}`,
				);
				callback(code);
			} else {
				// email/manual auth
				console.log(
					`Enter code for account ${account.user.username} at ${domain}`,
				);
				const readline = require("readline").createInterface({
					input: process.stdin,
					output: process.stdout,
				});

				readline.question("Code: ", (code) => {
					readline.close();
					callback(code);
				});
			}
		});

		client.on("loggedOn", async () => {
			console.log(`Logged in as ${account.user.username}`);
			await client.setPersona(SteamUser.EPersonaState.Online);
			await client.gamesPlayed(config.games);
			resolve();
		});

		client.on("error", (err) => {
			console.log(`Error on account ${account.user.username}: ${err.message}`);
		});

		client.on("disconnected", () => {
			console.log(`Disconnected from account ${account.user.username}`);
		});
	});
}
