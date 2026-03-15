require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const JSZip = require('jszip');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const PREFIX = '!';
const CONFIG_FILE = './config.json';

// ========== Pictures folder settings ==========
const PICTURES_FOLDER = path.join(__dirname, 'pictures');
const ICON_PATH = path.join(PICTURES_FOLDER, 'pack_icon.png');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});

// Temporary storage for processed files (to link with buttons)
const processedFiles = new Map(); // messageId -> { buffer, filename, userId }

// ========== Helper functions ==========

// Read and save config
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Error reading config file:', error);
    }
    return { fixChannelId: null };
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('Error saving config file:', error);
    }
}

// Function to read icon from file
function getIconBuffer() {
    try {
        if (!fs.existsSync(PICTURES_FOLDER)) {
            fs.mkdirSync(PICTURES_FOLDER, { recursive: true });
        }
        
        if (fs.existsSync(ICON_PATH)) {
            return fs.readFileSync(ICON_PATH);
        } else {
            // Simple default icon
            const defaultIcon = Buffer.from([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
                0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x40,
                0x08, 0x06, 0x00, 0x00, 0x00, 0xAA, 0x69, 0x71, 0xDE, 0x00, 0x00, 0x00,
                0x0F, 0x49, 0x44, 0x41, 0x54, 0x78, 0xDA, 0xED, 0xC1, 0x01, 0x0D, 0x00,
                0x00, 0x00, 0xC2, 0xA0, 0xF7, 0x4F, 0x6D, 0x0E, 0x37, 0xA0, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x80, 0x8D, 0x02, 0x5C, 0x00, 0x01, 0x00, 0x01,
                0x95, 0x5C, 0x36, 0x63, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
                0xAE, 0x42, 0x60, 0x82
            ]);
            fs.writeFileSync(ICON_PATH, defaultIcon);
            return defaultIcon;
        }
    } catch (error) {
        console.error('❌ Error reading icon:', error);
        return null;
    }
}

// Function to process file
async function processFile(buffer) {
    try {
        const zip = new JSZip();
        const zipData = await zip.loadAsync(buffer);
        let modified = false;

        console.log('Starting file processing...');

        // Modify armor_stand.entity.json
        for (const filename of Object.keys(zipData.files)) {
            if (filename.includes('armor_stand.entity.json')) {
                const file = zipData.files[filename];
                let text = await file.async('string');
                const original = text;
                
                text = text.replace(/"default":"armor_stand"/g, '"default":"leash_knot"');
                text = text.replace(/"identifier":"minecraft:armor_stand"/g, '"identifier":"minecraft:leash_knot"');
                
                if (text !== original) {
                    zipData.file(filename, text);
                    modified = true;
                    console.log(`✅ Modified: ${filename}`);
                }
            }
        }

        // Modify manifest.json
        for (const filename of Object.keys(zipData.files)) {
            if (filename.includes('manifest.json')) {
                const file = zipData.files[filename];
                let manifest = await file.async('string');
                const original = manifest;
                
                manifest = manifest.replace(
                    /("name"\s*:\s*")(.*?)(")/g,
                    (match, p1, p2, p3) => {
                        if (!p2.includes('✓ FIXED')) {
                            return p1 + p2 + ' ✓ FIXED' + p3;
                        }
                        return match;
                    }
                );
                
                if (manifest !== original) {
                    zipData.file(filename, manifest);
                    modified = true;
                    console.log(`✅ Modified: ${filename}`);
                }
                break;
            }
        }

        // Add icon
        try {
            const iconBuffer = getIconBuffer();
            
            if (iconBuffer) {
                const iconFiles = Object.keys(zipData.files).filter(filename => 
                    filename.toLowerCase().includes('pack_icon.png') || 
                    filename.toLowerCase().includes('icon.png') || 
                    filename.toLowerCase().includes('pack_icon.jpg') ||
                    filename.toLowerCase().includes('icon.jpg')
                );
                
                iconFiles.forEach(filename => {
                    zipData.remove(filename);
                });
                
                zipData.file('pack_icon.png', iconBuffer);
                modified = true;
            }
            
        } catch (iconError) {
            console.error('Error adding icon:', iconError);
        }

        if (!modified) {
            return { buffer: null, modified: false };
        }

        const newZipBuffer = await zipData.generateAsync({ 
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
        });
        
        return { buffer: newZipBuffer, modified: true };
    } catch (error) {
        console.error('Error processing file:', error);
        throw error;
    }
}

// ========== Message commands handling ==========

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    const config = loadConfig();
    
    // !fixholo command
    if (message.content.startsWith(`${PREFIX}fixholo`)) {
        
        // Check if fix channel is set
        if (!config.fixChannelId) {
            return message.reply({ 
                content: '❌ **No fix channel has been set. An admin must use `/setfixchannel` first.**' 
            });
        }
        
        // Check if current channel is the fix channel
        if (message.channelId !== config.fixChannelId) {
            const fixChannel = await client.channels.fetch(config.fixChannelId).catch(() => null);
            const channelMention = fixChannel ? `<#${config.fixChannelId}>` : 'the specified channel';
            return message.reply({ 
                content: `❌ **This command only works in ${channelMention}.**` 
            });
        }
        
        if (message.attachments.size === 0) {
            return message.reply({ 
                content: '❌ **Please attach a .mcpack or .zip file with the command.**' 
            });
        }

        const attachment = message.attachments.first();
        
        if (!attachment.name.match(/\.(mcpack|zip)$/i)) {
            return message.reply({ 
                content: '❌ **Please upload a file with .mcpack or .zip extension.**' 
            });
        }
        
        if (attachment.size > 50 * 1024 * 1024) {
            return message.reply({ 
                content: '❌ **File is too large. Maximum size is 50MB.**' 
            });
        }

        await message.channel.sendTyping();

        try {
            console.log(`📥 Processing file from ${message.author.tag}`);
            
            const response = await fetch(attachment.url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const { buffer: newBuffer, modified } = await processFile(buffer);

            if (!modified) {
                return message.reply({ 
                    content: '⚠️ **No modifications were made (file does not contain armor_stand.entity.json?)**' 
                });
            }

            const fixedFileName = attachment.name.replace(/\.(mcpack|zip)$/i, '_fixed.mcpack');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`download_${message.id}`)
                        .setLabel('📥 Download Fixed File')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('⬇️')
                );

            processedFiles.set(message.id, {
                buffer: newBuffer,
                filename: fixedFileName,
                userId: message.author.id
            });

            setTimeout(() => {
                if (processedFiles.has(message.id)) {
                    processedFiles.delete(message.id);
                }
            }, 5 * 60 * 1000);

            await message.reply({
                content: `✅ **File fixed successfully!**\n👤 **By:** **${message.author.username}**\n\n⬇️ **You can now download it (Available for 5 minutes only)**`,
                components: [row]
            });

        } catch (error) {
            console.error('Error processing file:', error);
            await message.reply({ 
                content: '❌ **An error occurred during processing:** ' + error.message 
            });
        }
    }
});

// ========== Button interactions handling ==========

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('download_')) {
        const [action, messageId] = interaction.customId.split('_');
        
        const fileData = processedFiles.get(messageId);
        
        if (!fileData) {
            return interaction.reply({ 
                content: '❌ **Download link expired or file not found. Please use the command again.**', 
                ephemeral: true 
            });
        }

        if (interaction.user.id !== fileData.userId) {
            return interaction.reply({ 
                content: '❌ **This button is only for the person who requested the fix.**', 
                ephemeral: true 
            });
        }

        const fixedFile = new AttachmentBuilder(fileData.buffer, { name: fileData.filename });

        await interaction.reply({
            content: `📥 **Here is your fixed file:**`,
            files: [fixedFile],
            ephemeral: true
        });
    }
});

// ========== Slash commands registration ==========

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    if (!fs.existsSync(PICTURES_FOLDER)) {
        fs.mkdirSync(PICTURES_FOLDER, { recursive: true });
    }

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    
    const commands = [
        new SlashCommandBuilder()
            .setName('setfixchannel')
            .setDescription('Set this channel as the fixholo command channel')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder()
            .setName('help')
            .setDescription('Show help'),
        new SlashCommandBuilder()
            .setName('stats')
            .setDescription('Show all channels in the server (Server ID: 1464688245815378062)')
    ];

    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ Slash commands registered successfully');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

// ========== Slash commands handling ==========

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        // Help command
        if (interaction.commandName === 'help') {
            const helpMessage = `
**🎮 Bot Commands:**

**Admin Commands:**
\`/setfixchannel\` - **Set this channel as the fixholo command channel**

**General Commands:**
\`/stats\` - **Show all channels in the server**

**Text Command:**
\`!fixholo\` - **Fix armor_stand file (attach file with command)**
            `;
            
            return interaction.reply({ content: helpMessage, ephemeral: true });
        }

        // setfixchannel command
        else if (interaction.commandName === 'setfixchannel') {
            const config = loadConfig();
            config.fixChannelId = interaction.channelId;
            saveConfig(config);
            
            await interaction.reply({ 
                content: `✅ **This channel has been set as the fixholo command channel!**\n\n**Now users can use \`!fixholo\` here.**`, 
                ephemeral: true 
            });
        }

        // stats command
        else if (interaction.commandName === 'stats') {
            // Check if it's the target server
            const TARGET_GUILD_ID = '1464688245815378062';
            
            if (interaction.guildId !== TARGET_GUILD_ID) {
                return interaction.reply({ 
                    content: '❌ **This command can only be used in the specified server (ID: 1464688245815378062)**', 
                    ephemeral: true 
                });
            }

            await interaction.deferReply();

            const guild = interaction.guild;
            
            // Fetch all channels
            await guild.channels.fetch();
            
            // Categorize channels by type
            const textChannels = [];
            const voiceChannels = [];
            const categoryChannels = [];
            const otherChannels = [];

            guild.channels.cache.forEach(channel => {
                const channelInfo = `# ${channel.name} (ID: ${channel.id})`;
                
                switch(channel.type) {
                    case 0: // text channel
                        textChannels.push(channelInfo);
                        break;
                    case 2: // voice channel
                        voiceChannels.push(channelInfo);
                        break;
                    case 4: // category
                        categoryChannels.push(`📁 ${channel.name} (ID: ${channel.id})`);
                        break;
                    default:
                        otherChannels.push(`${channel.name} (ID: ${channel.id}) - Type: ${channel.type}`);
                }
            });

            // Create formatted response
            const statsMessage = `
**📊 Server Statistics**
**Server:** ${guild.name} (ID: ${guild.id})
**Total Channels:** ${guild.channels.cache.size}

**📁 Categories:**
${categoryChannels.length > 0 ? categoryChannels.join('\n') : 'No categories'}

**💬 Text Channels:**
${textChannels.length > 0 ? textChannels.join('\n') : 'No text channels'}

**🔊 Voice Channels:**
${voiceChannels.length > 0 ? voiceChannels.join('\n') : 'No voice channels'}

**📌 Other Channels:**
${otherChannels.length > 0 ? otherChannels.join('\n') : 'No other channels'}

**📅 Server Created:** ${guild.createdAt.toLocaleDateString()}
**👥 Members:** ${guild.memberCount}
            `;

            // Split into multiple messages if too long
            if (statsMessage.length > 2000) {
                const chunks = [];
                let currentChunk = '';
                
                statsMessage.split('\n').forEach(line => {
                    if ((currentChunk + line + '\n').length > 1900) {
                        chunks.push(currentChunk);
                        currentChunk = line + '\n';
                    } else {
                        currentChunk += line + '\n';
                    }
                });
                
                if (currentChunk) {
                    chunks.push(currentChunk);
                }
                
                await interaction.editReply(chunks[0]);
                
                for (let i = 1; i < chunks.length; i++) {
                    await interaction.followUp({ content: chunks[i], ephemeral: true });
                }
            } else {
                await interaction.editReply(statsMessage);
            }
        }

    } catch (error) {
        console.error('General error:', error);
        const errorMessage = '❌ **An unexpected error occurred. Please try again.**';
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.editReply(errorMessage);
        }
    }
});

// ========== Error handling ==========

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
});

// Start the bot
client.login(TOKEN).catch(error => {
    console.error('❌ Login failed:', error);
});