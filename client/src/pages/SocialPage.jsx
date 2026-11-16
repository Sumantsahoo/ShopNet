import React from 'react';
import { Link, useParams } from 'react-router-dom';

const socialProfiles = {
    instagram: { label: 'Instagram', url: process.env.REACT_APP_INSTAGRAM_URL },
    youtube: { label: 'YouTube', url: process.env.REACT_APP_YOUTUBE_URL },
    linkedin: { label: 'LinkedIn', url: process.env.REACT_APP_LINKEDIN_URL }
};

const SocialPage = () => {
    const { platform } = useParams();
    const profile = socialProfiles[platform];

    if (!profile) {
        return <main className="help-page"><h1>Social page not found</h1><Link to="/profile">Back to account</Link></main>;
    }

    return (
        <main className="help-page">
            <header className="help-heading">
                <span>FOLLOW SHOPNEST</span>
                <h1>{profile.label}</h1>
                {profile.url
                    ? <p><a href={profile.url} target="_blank" rel="noreferrer">Open ShopNest on {profile.label} ↗</a></p>
                    : <p>The ShopNest {profile.label} profile URL has not been configured yet.</p>}
                <Link to="/profile">Back to account</Link>
            </header>
        </main>
    );
};

export default SocialPage;
