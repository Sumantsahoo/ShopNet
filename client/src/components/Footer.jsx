import React from "react";
import { Link } from "react-router-dom";
import "../styles/footer.css";

const Footer = () => (
    <footer className="site-footer">
        <div className="site-footer-inner">
            <div>
                <Link className="site-footer-brand" to="/">ShopNest</Link>
                <p>Everyday finds, all in one place.</p>
            </div>
            <nav aria-label="Help and policies">
                <Link to="/faq">FAQs</Link>
                <Link to="/policies">Terms, policies & licenses</Link>
            </nav>
            <div className="site-footer-social">
                <span>Follow us</span>
                <Link to="/social/instagram">Instagram</Link>
                <Link to="/social/youtube">YouTube</Link>
                <Link to="/social/linkedin">LinkedIn</Link>
            </div>
            <small>© {new Date().getFullYear()} ShopNest. All rights reserved.</small>
        </div>
    </footer>
);

export default Footer;
