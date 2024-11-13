import { type CacheType, type ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

const DIGITALOCEAN_TOKEN = process.env.DIGITALOCEAN_TOKEN;
if (!DIGITALOCEAN_TOKEN) {
    console.error('Error: DIGITALOCEAN_TOKEN is not defined in the environment variables.');
    process.exit(1); // Exit the process with an error code
}

export const data = new SlashCommandBuilder()
    .setName('satisfactory-stop')
    .setDescription('satisfactory stop');

class ChatManager {
    animatedReply: any;
    interaction: ChatInputCommandInteraction<CacheType>;
    timeout: any;

    constructor(interaction) {
        this.animatedReply = null;
        this.interaction = interaction;
        this.timeout;
    }

    reply = async (text) => {
        clearTimeout(this.timeout);

        while (!this.interaction.isRepliable()) {
            await new Promise<void>((resolve, reject) => setTimeout(resolve, 500))
        }

        if (this.interaction.replied) {
            await this.interaction.editReply(text);
        } else {
            await this.interaction.reply(text);
        }
    }

    animateReply = async (queue) => {
        let step = 0;
        let period = 500;

        const update = async () => {
            await this.reply(queue[step % queue.length]);
            step++;

            if (this.timeout === null) {
                return
            }
            this.timeout = setTimeout(update, period);
        }

        update();
    }

    dotdotdot = (text) => {
        const dotsQueue = ['.', '..', '...', '..']
        this.animatedReply = this.animateReply(dotsQueue.map(dots => `${text}${dots}`))
    }

    destroy = () => {
        clearTimeout(this.timeout);
    }
}

const getServers = async () => {
    const url = 'https://api.digitalocean.com/v2/droplets?page=1&per_page=100';

    const data = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DIGITALOCEAN_TOKEN}`
        }
    })
        .then(response => response.json())
        .catch(error => console.error('Error:', error));

    return data
}

const deleteServer = async (serverId) => {

    const url = 'https://api.digitalocean.com/v2/droplets';

    const data = await fetch(`${url}/${serverId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DIGITALOCEAN_TOKEN}`
        },
    }).then(response => response.text())
        .catch(error => console.error('Error:', error));

    return data;
}

const snapshotServer = async (serverId) => {
    try {
        const response = await fetch(`https://api.digitalocean.com/v2/droplets/${serverId}/actions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DIGITALOCEAN_TOKEN}`
            },
            body: JSON.stringify({ type: 'snapshot', name: `Snapshot - ${new Date().toISOString()}` })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Error: ${data.message}`);
        }

        return data;
    } catch (error) {
        console.error('Error creating snapshot:', error.message);
    }
};


const powerOffServer = async (dropletId) => {
    try {
        const response = await fetch(`https://api.digitalocean.com/v2/droplets/${dropletId}/actions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DIGITALOCEAN_TOKEN}`
            },
            body: JSON.stringify({ type: 'power_off' })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Error: ${data.message}`);
        }

        return data
    } catch (error) {
        console.error('Error powering off droplet:', error.message);
    }
};

const waitSnapshotCreated = async (dropletId, actionId) => {
    while (true) {
        const response = await fetch(`https://api.digitalocean.com/v2/droplets/${dropletId}/actions/${actionId}`, {
            headers: {
                'Authorization': `Bearer ${DIGITALOCEAN_TOKEN}`
            }
        });
        const data = await response.json();
        
        
        if (data.action.status === 'completed') {
            return true;
        }

        await new Promise(resolve => setTimeout(resolve, 1000)); // wait 5 seconds
    }
};

export async function execute(interaction: ChatInputCommandInteraction<CacheType>) {
    const chat = new ChatManager(interaction)

    chat.dotdotdot('Stopping');

    const { droplets } = await getServers();

    if (!droplets[0]) {
        chat.reply('Error: No avialiable droplets.');
        return;
    }

    chat.dotdotdot('Server shutdown');
    await powerOffServer(droplets[0].id);

    while (true) {
        const { droplets } = await getServers();
        const droplet = droplets[0];


        if (droplet.status === 'off') {
            break
        }

        console.log('retry');
        await new Promise<void>((resolve) => setTimeout(resolve, 1000))
    }


    chat.dotdotdot('Server snapshot');
    const snapshot = await snapshotServer(droplets[0].id);

    const actionId = snapshot.action.id;

    await waitSnapshotCreated(droplets[0].id, actionId);

    chat.dotdotdot('Server delete');
    await deleteServer(droplets[0].id)

    while (true) {
        const { droplets } = await getServers();

        if (droplets.length === 0) {
            break
        }

        console.log('retry');
        await new Promise<void>((resolve) => setTimeout(resolve, 1000))
    }

    chat.reply('Server deleted');
}