import { type CacheType, type ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

const DIGITALOCEAN_TOKEN = process.env.DIGITALOCEAN_TOKEN;
if (!DIGITALOCEAN_TOKEN) {
    console.error('Error: DIGITALOCEAN_TOKEN is not defined in the environment variables.');
    process.exit(1); // Exit the process with an error code
}

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!CLOUDFLARE_API_TOKEN) {
    console.error('Error: CLOUDFLARE_API_TOKEN is not defined in the environment variables.');
    process.exit(1); // Exit the process with an error code
}

const CLOUDFLARE_DOMAIN_NAME = process.env.CLOUDFLARE_DOMAIN_NAME;
if (!CLOUDFLARE_DOMAIN_NAME) {
    console.error('Error: CLOUDFLARE_DOMAIN_NAME is not defined in the environment variables.');
    process.exit(1); // Exit the process with an error code
}

export const data = new SlashCommandBuilder()
    .setName('satisfactory-start')
    .setDescription('satisfactory start');

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





const getSnapshots = async () => {
    const url = 'https://api.digitalocean.com/v2/snapshots?resource_type=droplet&page=1&per_page=100';

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



const createVpsFromSnapshot = async (snapshot) => {
    const url = 'https://api.digitalocean.com/v2/droplets';

    const payload = {
        name: "ubuntu-s-4vcpu-8gb-amd-fra1-01",
        size: "s-4vcpu-8gb-amd",
        region: "fra1",
        image: snapshot.id,
        monitoring: true,
        ssh_keys: [
            '7d:09:f7:4e:f2:ea:2d:0d:10:36:a5:e1:2e:6e:e1:a4',
            '3a:9e:85:88:a7:ef:63:3a:45:38:b8:5c:94:e6:43:95'
        ]
    };

    const data = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DIGITALOCEAN_TOKEN}`
        },
        body: JSON.stringify(payload)
    }).then(response => response.json())
        .catch(error => console.error('Error:', error));

    return data
}

// Function to get all zones
const getZones = async () => {
    try {
        const response = await fetch('https://api.cloudflare.com/client/v4/zones', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        if (data.success) {
            return data.result;
        } else {
            console.error('Failed to retrieve zones:', data.errors);
            return [];
        }
    } catch (error) {
        console.error('Error fetching zones:', error);
    }
};

// Function to get DNS records for a specific zone
const getDnsRecords = async (zoneId) => {
    try {
        const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        if (data.success) {
            return data.result;
        } else {
            console.error('Failed to retrieve DNS records:', data.errors);
            return [];
        }
    } catch (error) {
        console.error('Error fetching DNS records:', error);
    }
};

const updateDnsRecord = async (newIp) => {
    const zones = await getZones();
    const zoneId = zones[0].id;

    const dnsRecords = await getDnsRecords(zoneId);

    const dnsRecord = dnsRecords.find(record => record.name === CLOUDFLARE_DOMAIN_NAME);

    try {
        const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${dnsRecord.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'A', // or 'CNAME'
                name: CLOUDFLARE_DOMAIN_NAME, // Your domain name
                content: newIp,
                ttl: 1, // Automatic TTL
                proxied: false // Set to true if needed
            }),
        });

        return await response.json();


    } catch (error) {
        console.error('Error updating DNS record:', error);
    }
};


const passwordLogin = async () => {
    const response = await fetch(`https://${CLOUDFLARE_DOMAIN_NAME}:7777/api/v1`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            function: 'PasswordLogin',
            data: {
                password: ' ',
                minimumPrivilegeLevel: 'Administrator',
            },
        }),
    });
    return response.json();
};

const queryServerState = async () => {
    const { data } = await passwordLogin()


    const response = await fetch(`https://${CLOUDFLARE_DOMAIN_NAME}:7777/api/v1`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.authenticationToken}`,
        },
        body: JSON.stringify({
            function: 'QueryServerState',
            data: {
            },
        })
    });

    return response.json();
};


export async function execute(interaction: ChatInputCommandInteraction<CacheType>) {
    const chat = new ChatManager(interaction)

    chat.dotdotdot('Starting');

    const { snapshots } = await getSnapshots();

    snapshots.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const lastCreatedSnapshot = snapshots[0];

    if (!lastCreatedSnapshot) {
        chat.reply('Error: No avialiable snapshots.');
        return;
    }

    if ((await getServers()).droplets.length) {
        chat.reply('Error: Server already started.');
        return;
    }

    await createVpsFromSnapshot(lastCreatedSnapshot);

    /* Network */

    chat.dotdotdot('Starting network');

    let ip_address;

    while (true) {
        const { droplets } = await getServers();
        const droplet = droplets[0];

        try {
            ip_address = droplet.networks.v4.find(network => network.type === 'public').ip_address;
            break
        } catch (error) {
            console.log('retry');

            await new Promise<void>((resolve, reject) => setTimeout(resolve, 1000))
        }
    }

    chat.reply(`ip: ${ip_address}`);

    const updatedDnsRecord = await updateDnsRecord(ip_address)

    if (updatedDnsRecord.success) {
        chat.reply(`DNS record updated successfully`);
    } else {
        chat.reply(`Error: Failed to update DNS record`);
        console.error('Failed to update DNS record:', updatedDnsRecord.errors);
    }

    chat.dotdotdot('Starting game')


    let numConnectedPlayers;
    while (true) {

        try {
            const gameState = await queryServerState();
            numConnectedPlayers = gameState.data.serverGameState.numConnectedPlayers;
            break
        } catch (error) {
            console.log('retry');
            await new Promise<void>((resolve, reject) => setTimeout(resolve, 1000))
        }
    }


    chat.reply(`Server started at ${CLOUDFLARE_DOMAIN_NAME}.`);
}