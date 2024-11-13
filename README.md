# Satisfactory Server Manager

This project enables starting and stopping a Satisfactory server hosted on DigitalOcean through Discord bot commands, automating the setup and teardown process with DigitalOcean and Cloudflare integration.

## Requirements
1. DigitalOcean API key
2. Discord bot API key
3. Cloudflare API key

## How It Works

### `/satisfactory-start`
1. Finds the most recent DigitalOcean snapshot of the Satisfactory server.
2. Creates a new droplet from the snapshot.
3. Waits for the Satisfactory server to boot up.
4. Updates the Cloudflare DNS with the new droplet's IP address.


### `/satisfactory-stop`
1. Creates a new snapshot from the active droplet.
2. Destroys droplet


## How to Use: (NodeJS >=22)
1. Create a `.env` configuration (see example: `.env copy`).
2. Run `npm i`.
3. Run `npm run start`.
4. The script will shut down upon completion of the upload.
