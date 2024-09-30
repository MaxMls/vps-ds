import { type CacheType, type ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('satisfactory-start')
    .setDescription('...');

const animateReply = async (interaction: ChatInputCommandInteraction<CacheType>, queue) => {
    let step = 0;
    let period = 500;
    let timeout;

    const reply = async () => {
        if (interaction.replied) {
            await interaction.editReply(queue[step % queue.length]);
        } else {
            await interaction.reply(queue[step % queue.length]);
        }
        step++;

        if (timeout === null) {
            return
        }
        timeout = setTimeout(reply, period);
    }

    reply();

    return {
        stopAnimation: () => {
            clearTimeout(timeout);
            timeout = null;
        }
    }
}

export async function execute(interaction: ChatInputCommandInteraction<CacheType>) {

    const animatedReply = await animateReply(interaction, ['Starting.', 'Starting..', 'Starting...', 'Starting..']);

    const url = 'https://api.digitalocean.com/v2/snapshots?resource_type=droplet&page=1&per_page=1000';
}