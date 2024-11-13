const DISCORD_TOKEN = process.env.DISCORD_TOKEN
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID

if (!DISCORD_TOKEN) {
	console.error('Error: DISCORD_TOKEN is not defined in the environment variables.');
	process.exit(1); // Exit the process with an error code
}

if (!DISCORD_CLIENT_ID) {
	console.error('Error: DISCORD_CLIENT_ID is not defined in the environment variables.');
	process.exit(1); // Exit the process with an error code
}

import { Collection, Events, REST, Routes, Client, GatewayIntentBits, type Interaction } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url'
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Extend the Client class to include a commands property
class CustomClient extends Client {
	commands: Collection<string, any>;

	constructor(options: any) {
		super(options);
		this.commands = new Collection();
	}
}

// and deploy your commands!
const client = new CustomClient({ intents: [GatewayIntentBits.Guilds] });

const timeout = setTimeout(()=>{
	console.error('Error: App start timeout.');
	process.exit(-1); // Exit the process with an error code
}, 9000);

client.on('ready', () => {
	console.log(`Logged in as ${client?.user?.tag}!`);
	clearTimeout(timeout);
});

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = await import(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(DISCORD_TOKEN);


try {
	console.log(`Started refreshing ${client.commands.size} application (/) commands.`);

	// The put method is used to fully refresh all commands in the guild with the current set
	const data: any = await rest.put(
		Routes.applicationCommands(DISCORD_CLIENT_ID),
		{ body: client.commands.map(command => command.data) },
	);

	console.log(`Successfully reloaded ${data.length} application (/) commands.`);
} catch (error) {
	// And of course, make sure you catch and log any errors!
	console.error(error);
}



client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

client.login(DISCORD_TOKEN);

