const lookupPincode = async (req, res) => {
    const { pincode } = req.params;
    if (!/^\d{6}$/.test(pincode || '')) {
        return res.status(400).json({ message: 'Enter a valid six-digit PIN code.' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
            signal: controller.signal
        });
        if (!response.ok) {
            return res.status(502).json({ message: 'The PIN lookup service is unavailable. Try again shortly.' });
        }

        const result = await response.json();
        const postOffice = result?.[0]?.Status === 'Success' ? result[0].PostOffice?.[0] : null;
        if (!postOffice) {
            return res.status(404).json({ message: 'PIN code not found. Check the six digits and try again.' });
        }

        return res.json({
            state: postOffice.State,
            district: postOffice.District,
            country: 'India'
        });
    } catch (error) {
        console.error('PIN code lookup failed:', error.message);
        return res.status(502).json({ message: 'Could not reach the PIN lookup service. Try again shortly.' });
    } finally {
        clearTimeout(timeout);
    }
};

module.exports = { lookupPincode };