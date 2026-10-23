const cloudinary = require('./config/cloudinary');

async function testCloudinaryConnection() {
    console.log('Testing Cloudinary configuration...');
    const config = cloudinary.config();

    console.log(`Cloud Name : ${config.cloud_name || '(missing)'}`);
    console.log(`API Key    : ${config.api_key ? config.api_key : '(missing)'}`);
    console.log(`API Secret : ${config.api_secret ? `${config.api_secret.slice(0, 4)}... (length: ${config.api_secret.length})` : '(missing)'}`);

    if (!config.cloud_name || !config.api_key || !config.api_secret) {
        console.error('\n[Error] Cloudinary configuration is incomplete in server/.env');
        console.error('Please ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (or CLOUDINARY_URL) are set.');
        process.exit(1);
    }

    try {
        const response = await cloudinary.api.ping();
        console.log('\n[Success] Cloudinary connected successfully!');
        console.log('Ping response:', response);
    } catch (error) {
        console.error('\n[Failed] Could not connect to Cloudinary:');
        if (error.error && error.error.message) {
            console.error(`Status: ${error.error.http_code} - ${error.error.message}`);
        } else {
            console.error(error.message || error);
        }
        if (error.error && error.error.message === 'api_secret mismatch') {
            console.error('\nHint: The API Secret in server/.env does not match your Cloudinary account.');
            console.error('Please check your Cloudinary Dashboard under Settings > Access Keys or Dashboard Product Environment Credentials and copy the full API Secret.');
        }
    }
}

testCloudinaryConnection();
