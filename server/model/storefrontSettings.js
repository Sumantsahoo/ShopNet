const mongoose = require('mongoose');

const storefrontSettingsSchema = new mongoose.Schema({
    heroImageUrl: { type: String, default: '' },
    heroImageUrls: { type: [String], default: [] },
    seasonalCampaignName: { type: String, trim: true, maxlength: 80, default: '' },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StorefrontSettings', storefrontSettingsSchema);
