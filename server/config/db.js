const dns=require('dns');
const mongoose=require('mongoose');
const bcrypt=require('bcrypt');
const User=require('../model/user');

const dnsServers=(process.env.MONGO_DNS_SERVERS||'1.1.1.1,8.8.8.8')
    .split(',')
    .map((server)=>server.trim())
    .filter(Boolean);

dns.setServers(dnsServers);

const connectDB=async ()=>{
    try{
        const connect=await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected Successfully");
        const adminEmail=process.env.ADMIN_EMAIL?.trim().toLowerCase();
        const adminPassword=process.env.ADMIN_PASSWORD;
        if (adminEmail && adminPassword) {
            const password=await bcrypt.hash(adminPassword,10);
            await User.findOneAndUpdate(
                { email: adminEmail },
                {
                    $set: {
                        name: process.env.ADMIN_NAME || 'ShopNest Admin',
                        email: adminEmail,
                        password,
                        role: 'admin'
                    }
                },
                { upsert:true, runValidators:true, setDefaultsOnInsert:true }
            );
            console.log(`Configured admin account ready: ${adminEmail}`);
        } else if (adminEmail || adminPassword) {
            console.warn("Admin login is not configured. Set both ADMIN_EMAIL and ADMIN_PASSWORD in server/.env.");
        }
        const hasUsersCollection = await mongoose.connection.db
            .listCollections({ name: 'users' }, { nameOnly: true })
            .hasNext();
        if (hasUsersCollection) {
            const usersCollection = mongoose.connection.collection('users');
            const userIndexes = await usersCollection.indexes();
            const legacyPhoneIndex = userIndexes.find((index) =>
                index.unique &&
                Object.keys(index.key).length === 1 &&
                index.key.phone === 1
            );
            if (legacyPhoneIndex) {
                await usersCollection.dropIndex(legacyPhoneIndex.name);
                console.log("Removed the obsolete unique phone index");
            }
        }
    }
    catch(error){
        console.log("MongoDB connection Failed",error.message);
        process.exit(1);
    }

};
module.exports=connectDB;