import { type CacheType, type ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!');
export async function execute(interaction: ChatInputCommandInteraction<CacheType>) {
    await interaction.reply('Pong!');

    
}