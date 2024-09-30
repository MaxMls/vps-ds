import { type CacheType, type ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('secret-command')
    .setDescription('Replies with Secret!');
export async function execute(interaction: ChatInputCommandInteraction<CacheType>) {
    await interaction.reply('Ликорис Милашка!!!!');
}